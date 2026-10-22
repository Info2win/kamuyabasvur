import { extractCities } from "./cities";
import { buildDemoJobs } from "./demo";
import { fetchIlanDetail } from "./detail";
import { fetchKariyerRss } from "./kariyerRss";
import type { RawIlan } from "./kariyerRss";
import { fetchKariyerSearch } from "./kariyerSearch";
import {
  classifyIlanType,
  classifyInstitutionType,
  parseApplicationMethods,
  parseDates,
  parseIlan,
  parseKadroCount,
} from "./parse";
import { fetchSbbIlanlar } from "./sbb";
import { addSyncLog, listJobs, updateJobRecord, upsertJobs } from "./store";
import type { JobRecord } from "./types";

export type SourceOutcome = {
  key: string;
  label: string;
  status: "ok" | "empty" | "blocked" | "error";
  message: string;
  found: number;
};

export type SyncSummary = {
  outcomes: SourceOutcome[];
  inserted: number;
  updated: number;
  enriched: number;
  total: number;
  durationMs: number;
  at: string;
};

export function rawToJob(raw: RawIlan, source: string): JobRecord {
  const title = raw.title.replace(/\s+/g, " ").trim();
  const institution = raw.institution || title.split(" - ")[0] || "Kurum belirtilmemiş";
  const body = raw.description && raw.description.trim() !== title ? raw.description : "";
  const parsed = parseIlan({ title, text: body, category: raw.category, parsedFrom: body ? "detay" : "baslik" });
  const { methods, applyUrl } = parseApplicationMethods(`${title}\n${body}`);
  parsed.applicationMethods = methods;
  const kadro = parseKadroCount(`${title}\n${body}`, title, parsed.positions);
  const cities = extractCities(`${title}\n${body}`);
  const dates = parseDates(`${title}\n${body}`);

  return {
    sourceKey: raw.guid,
    source,
    title,
    institution,
    unit: raw.unit ?? null,
    ilanNo: null,
    category: raw.category,
    ilanType: classifyIlanType(title, raw.category, body),
    institutionType: classifyInstitutionType(institution, title),
    publishedAt: raw.publishedAt ? raw.publishedAt.toISOString() : null,
    applicationStart: raw.applicationStart?.toISOString() ?? dates.start?.toISOString() ?? null,
    applicationEnd: raw.applicationEnd?.toISOString() ?? dates.end?.toISOString() ?? null,
    kadroCount: kadro,
    cities,
    positions: parsed.positions,
    rawText: body || null,
    parsed,
    detailUrl: raw.detailUrl,
    applyUrl: raw.applyUrl ?? applyUrl ?? raw.detailUrl,
    logoUrl: raw.logoUrl,
    isDemo: false,
    fetchedAt: new Date().toISOString(),
  };
}

async function withConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      results.push(await fn(current));
    }
  });
  await Promise.all(workers);
  return results;
}

/** İlan detayını çekip kaydı zenginleştirir (ilan metni, tarihler, kontenjan illeri). */
export async function enrichJob(job: JobRecord): Promise<{ ok: boolean; message?: string }> {
  const guid = job.detailUrl?.match(/[?&]i=([0-9a-fA-F-]{8,})/)?.[1] ?? job.sourceKey;
  if (!guid) return { ok: false, message: "İlan kimliği bulunamadı" };
  const { detail, error } = await fetchIlanDetail(guid);
  if (!detail) return { ok: false, message: error ?? "Detay alınamadı" };

  const text = detail.anaIlanMetni?.trim();
  if (!text && !detail.basvuruBitis) return { ok: false, message: "Detay içeriği boş" };

  const mergedText = [text ?? "", detail.altIlanlar?.map((a) => `${a.unvan} ${a.kontenjan ?? ""} ${a.ogrenim ?? ""} ${a.kpss ?? ""} ${a.iller.join(" ")}`).join("\n") ?? ""].join("\n");
  const parsed = parseIlan({ title: detail.baslik ?? job.title, text: mergedText, category: detail.ilanTuru ?? job.category, parsedFrom: "detay" });
  const { methods, applyUrl } = parseApplicationMethods(mergedText);
  parsed.applicationMethods = methods;

  const kontenjanCities = extractCities((detail.kontenjan ?? []).map((k) => `${k.il} Kontenjan (${k.kontenjan ?? 0})`).join("\n"));
  const cities = kontenjanCities.length ? kontenjanCities : extractCities(`${job.title}\n${mergedText}`);
  const positionTotal = (detail.altIlanlar ?? []).reduce((sum, a) => sum + (a.kontenjan ?? 0), 0);
  const kadro =
    positionTotal > 0
      ? positionTotal
      : (parseKadroCount(`${detail.baslik ?? job.title}\n${mergedText}`, detail.baslik ?? job.title, parsed.positions) ?? job.kadroCount);
  const dates = parseDates(mergedText);

  const positions = detail.altIlanlar?.length
    ? detail.altIlanlar.map((a) => ({ title: a.unvan || "Kadro", count: a.kontenjan ?? undefined, kpssType: a.kpss, education: a.ogrenim }))
    : parsed.positions;

  await updateJobRecord(job.sourceKey, {
    title: detail.baslik ?? job.title,
    institution: detail.kurumAdi ?? job.institution,
    unit: detail.birimAdi ?? job.unit,
    ilanNo: detail.ilno ?? job.ilanNo,
    ilanType: classifyIlanType(detail.baslik ?? job.title, detail.ilanTuru ?? job.category, mergedText),
    institutionType: classifyInstitutionType(detail.kurumAdi ?? job.institution, detail.baslik ?? job.title),
    applicationStart: detail.basvuruBaslangic?.toISOString() ?? dates.start?.toISOString() ?? job.applicationStart,
    applicationEnd: detail.basvuruBitis?.toISOString() ?? dates.end?.toISOString() ?? job.applicationEnd,
    kadroCount: kadro,
    cities,
    positions,
    rawText: mergedText.trim() || job.rawText,
    parsed,
    applyUrl: detail.basvuruLinki ?? detail.eDevletServisURL ?? applyUrl ?? job.applyUrl,
  });

  return { ok: true };
}

let inFlight: Promise<SyncSummary> | null = null;

export function syncJobs(options?: { enrichLimit?: number; seedDemo?: boolean }): Promise<SyncSummary> {
  // Eşzamanlı isteklerde aynı taramanın iki kez çalışmasını engelle.
  if (inFlight) return inFlight;
  inFlight = runSync(options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(options?: { enrichLimit?: number; seedDemo?: boolean }): Promise<SyncSummary> {
  const startedAt = Date.now();
  const outcomes: SourceOutcome[] = [];
  const merged = new Map<string, JobRecord>();

  const [sbb, search, kk] = await Promise.all([fetchSbbIlanlar(), fetchKariyerSearch(), fetchKariyerRss()]);

  outcomes.push({
    key: "sbb",
    label: "kamuilan.sbb.gov.tr",
    status: sbb.error ? (sbb.blocked ? "blocked" : "error") : sbb.items.length ? "ok" : "empty",
    message: sbb.error ?? `${sbb.items.length} ilan bulundu`,
    found: sbb.items.length,
  });
  outcomes.push({
    key: "search",
    label: "Kariyer Kapısı tam liste ucu",
    status: search.error ? (search.blocked ? "blocked" : "error") : search.items.length ? "ok" : "empty",
    message: search.error ?? `${search.items.length} ilan bulundu (başvuru tarihleriyle)`,
    found: search.items.length,
  });
  outcomes.push({
    key: "kariyer",
    label: "Kariyer Kapısı (resmî RSS)",
    status: kk.error ? "error" : kk.items.length ? "ok" : "empty",
    message: kk.error ?? `${kk.items.length} ilan bulundu`,
    found: kk.items.length,
  });

  // En zengin kaynaktan başlayarak birleştir (aynı guid tek kayıt olur).
  const addAll = (items: RawIlan[], source: string) => {
    for (const item of items) {
      const job = rawToJob(item, merged.has(item.guid) ? (merged.get(item.guid)!.source as "sbb" | "kariyer" | "search") : source);
      if (!merged.has(job.sourceKey)) merged.set(job.sourceKey, job);
      else {
        // Tarihi/uygulama linki eksikse zengin kaynağın verisiyle tamamla
        const existing = merged.get(job.sourceKey)!;
        if (!existing.applicationEnd && job.applicationEnd) existing.applicationEnd = job.applicationEnd;
        if (!existing.applicationStart && job.applicationStart) existing.applicationStart = job.applicationStart;
        if (!existing.applyUrl && job.applyUrl) existing.applyUrl = job.applyUrl;
      }
    }
  };
  addAll(search.items, "search");
  addAll(sbb.items, "sbb");
  addAll(kk.items, "kariyer");

  let inserted = 0;
  let updated = 0;
  if (merged.size) {
    const result = await upsertJobs([...merged.values()]);
    inserted = result.inserted;
    updated = result.updated;
  }

  // Detay zenginleştirme (isteğe bağlı, sınırlı sayıda)
  let enriched = 0;
  const limit = options?.enrichLimit ?? 0;
  if (limit > 0 && merged.size) {
    const candidates = [...merged.values()].filter((j) => !j.rawText).slice(0, limit);
    const results = await withConcurrency(candidates, 3, async (job) => enrichJob(job));
    enriched = results.filter((r) => r.ok).length;
  }

  // Hiç ilan yoksa örnek veri setiyle uygulamayı ayakta tut
  const existing = await listJobs();
  const hasLive = existing.some((j) => !j.isDemo);
  if (!hasLive && (options?.seedDemo ?? true)) {
    const demo = buildDemoJobs();
    const demoResult = await upsertJobs(demo);
    inserted += demoResult.inserted;
    updated += demoResult.updated;
    outcomes.push({
      key: "demo",
      label: "Örnek veri seti",
      status: "ok",
      message: "Canlı kaynaklara erişilemediği için örnek ilanlar yüklendi (arayüzde 'Örnek' rozetiyle gösterilir).",
      found: demo.length,
    });
  } else if (!hasLive) {
    outcomes.push({ key: "demo", label: "Örnek veri seti", status: "empty", message: "Örnek veri yüklenmedi.", found: 0 });
  }

  for (const outcome of outcomes) {
    await addSyncLog({
      source: outcome.label,
      status: outcome.status,
      message: outcome.message,
      found: outcome.found,
      inserted,
      updated,
      durationMs: Date.now() - startedAt,
    });
  }

  const total = (await listJobs()).length;
  return {
    outcomes,
    inserted,
    updated,
    enriched,
    total,
    durationMs: Date.now() - startedAt,
    at: new Date().toISOString(),
  };
}
