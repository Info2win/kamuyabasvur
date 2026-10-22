"use client";

import Link from "next/link";
import { CalendarCheck2, ListTree, RefreshCw, ScanText, Trash2 } from "lucide-react";
import { useAppState } from "./AppState";
import { Button } from "./ui";
import { formatDateTime, relativeTime } from "@/lib/format";

/** İlan listesinin durumu ve güncelleme kısayolları (kullanıcı diliyle). */
export function SourceBanner({ compact = false }: { compact?: boolean }) {
  const { data, syncing, sync, savePreferences, resetData } = useAppState();
  const stats = data?.stats;
  const preferences = data?.preferences;
  const jobs = data?.jobs ?? [];

  const lastUpdate = jobs.reduce<string | null>(
    (latest, job) => (!latest || (job.fetchedAt ?? "") > latest ? (job.fetchedAt ?? latest) : latest),
    null,
  );
  const demoCount = stats?.demoCount ?? 0;
  const ageHours = lastUpdate ? (Date.now() - new Date(lastUpdate).getTime()) / 3_600_000 : null;
  const stale = ageHours != null && ageHours > 24;
  const ageLabel =
    ageHours == null ? "" : ageHours < 1 ? "az önce" : ageHours < 48 ? `${Math.round(ageHours)} saat önce` : `${Math.round(ageHours / 24)} gün önce`;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5">
        <CalendarCheck2 className="h-4 w-4 shrink-0 text-slate-400" />
        <p className="min-w-0 flex-1 truncate text-[12.5px] text-slate-600">
          <b className="text-ink-900">{stats?.total ?? 0}</b> ilan · <b className="text-brand-700">{stats?.visible ?? 0}</b> tanesi sana uygun
          {lastUpdate ? ` · liste ${ageLabel} güncellendi` : ""}
        </p>
        <Button size="sm" variant="outline" disabled={syncing} onClick={() => void sync(0)}>
          {syncing ? "Güncelleniyor…" : "Güncelle"}
        </Button>
        <Link href="/yapistir?mod=liste">
          <Button size="sm" variant="ghost" icon={<ListTree className="h-3.5 w-3.5" />}>
            Resmî listeyi ekle
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <section className="animate-rise overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <CalendarCheck2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink-900">İlan listen</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
            Havuzda <b className="text-ink-900">{stats?.total ?? 0}</b> ilan var, <b className="text-brand-700">{stats?.visible ?? 0}</b> tanesi kriterlerine
            uygun{stats?.urgent ? `, ${stats.urgent} ilanın başvurusu 7 gün içinde kapanıyor` : ""}.
          </p>
          <p className={`mt-1 text-[12px] ${stale ? "font-semibold text-amber-700" : "text-slate-500"}`}>
            {lastUpdate
              ? stale
                ? `İlan listesi ${ageLabel} güncellenmiş (${formatDateTime(lastUpdate)}). Yeni ilanlar için resmî listeyi yapıştırman yeterli.`
                : `Liste güncel · son yenilenme ${relativeTime(lastUpdate)} (${formatDateTime(lastUpdate)})`
              : "Henüz ilan yüklenmedi — resmî listeyi yapıştırarak başlayabilirsin."}
          </p>

          {demoCount ? (
            <p className="mt-1.5 text-[12px] text-slate-500">
              Listede <b>{demoCount}</b> örnek ilan var (üstünde &quot;Örnek ilan&quot; yazar). Gerçek ilanlarını eklediğinde bunları gizleyebilirsin.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={<RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />} disabled={syncing} onClick={() => void sync(0)}>
              {syncing ? "Güncelleniyor…" : "İlanları güncelle"}
            </Button>
            <Link href="/yapistir?mod=liste">
              <Button size="sm" variant="outline" icon={<ListTree className="h-3.5 w-3.5" />}>
                Resmî listeyi yapıştır
              </Button>
            </Link>
            <Link href="/yapistir?mod=tek">
              <Button size="sm" variant="ghost" icon={<ScanText className="h-3.5 w-3.5" />}>
                Tek ilan ekle
              </Button>
            </Link>
            {demoCount ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void savePreferences({ includeDemoData: !(preferences?.includeDemoData ?? true) })}
              >
                {preferences?.includeDemoData ? "Örnek ilanları gizle" : "Örnek ilanları göster"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2">
        <p className="text-[11.5px] text-slate-500">İlanlar resmî kaynaktan alınır: kamuilan.sbb.gov.tr</p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && !window.confirm("Eklediğin tüm ilanlar ve başvuru takibi silinsin mi? Profilin ve kriterlerin kalır.")) return;
            void resetData(false);
          }}
          className="focus-ring flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium text-slate-400 transition hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" /> İlan listesini temizle
        </button>
      </div>
    </section>
  );
}
