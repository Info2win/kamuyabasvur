/**
 * GitHub Pages (statik) sürümü için ilan verisini üretir.
 * Çalıştırma: npx tsx scripts/fetch-ilanlar.ts
 * Çıktı:      public/veri/ilanlar.json  (uygulama bunu aynı origin'den okur → CORS sorunu yok)
 *
 * GitHub Actions bu betiği hem her derlemede hem de zamanlanmış (cron) işte çalıştırır;
 * böylece statik site taze ilanlarla güncellenir. Sunucu IP'si Türkiye dışında olsa bile
 * Kariyer Kapısı RSS beslemesi çalışır; SBB/tam liste uçları erişilebilirse onlar da eklenir.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDemoJobs } from "../src/lib/demo";
import { fetchKariyerRss } from "../src/lib/kariyerRss";
import { fetchKariyerSearch } from "../src/lib/kariyerSearch";
import { rawToJob } from "../src/lib/normalize";
import { fetchSbbIlanlar } from "../src/lib/sbb";
import type { JobRecord } from "../src/lib/types";

async function main() {
  const startedAt = Date.now();
  const [sbb, search, rss] = await Promise.all([fetchSbbIlanlar(), fetchKariyerSearch(), fetchKariyerRss()]);

  const merged = new Map<string, JobRecord>();
  const addAll = (items: ReturnType<typeof rawToJob>[], source: string) => {
    for (const item of items) {
      const existing = merged.get(item.sourceKey);
      if (!existing) {
        merged.set(item.sourceKey, item);
        continue;
      }
      merged.set(existing.sourceKey, {
        ...existing,
        applicationStart: existing.applicationStart ?? item.applicationStart,
        applicationEnd: existing.applicationEnd ?? item.applicationEnd,
        applyUrl: existing.applyUrl ?? item.applyUrl,
        unit: existing.unit ?? item.unit,
      });
    }
  };

  addAll(search.items.map((i) => rawToJob(i, "search")), "search");
  addAll(sbb.items.map((i) => rawToJob(i, "sbb")), "sbb");
  addAll(rss.items.map((i) => rawToJob(i, "kariyer")), "kariyer");

  let jobs = [...merged.values()];
  let usingDemo = false;
  if (!jobs.length) {
    jobs = buildDemoJobs();
    usingDemo = true;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    usingDemo,
    sources: {
      sbb: { status: sbb.error ? (sbb.blocked ? "blocked" : "error") : "ok", message: sbb.error ?? `${sbb.items.length} ilan`, count: sbb.items.length },
      search: { status: search.error ? (search.blocked ? "blocked" : "error") : "ok", message: search.error ?? `${search.items.length} ilan`, count: search.items.length },
      rss: { status: rss.error ? "error" : "ok", message: rss.error ?? `${rss.items.length} ilan`, count: rss.items.length },
    },
    jobs,
  };

  const outDir = path.join(process.cwd(), "public", "veri");
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "ilanlar.json");
  writeFileSync(outFile, JSON.stringify(payload), "utf8");

  console.log(
    `[fetch-ilanlar] ${jobs.length} ilan yazıldı → public/veri/ilanlar.json` +
      ` (sbb:${payload.sources.sbb.status}, tam-liste:${payload.sources.search.status}, rss:${payload.sources.rss.status})` +
      `${usingDemo ? " · UYARI: hiçbir kaynağa erişilemedi, örnek veri yazıldı" : ""} · ${Date.now() - startedAt}ms`,
  );
}

main().catch((error) => {
  console.error("[fetch-ilanlar] hata:", error instanceof Error ? error.message : error);
  process.exitCode = 0; // CI'ı kırmamak için yumuşak çıkış
});
