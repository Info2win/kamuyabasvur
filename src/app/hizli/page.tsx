"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  CalendarClock,
  Check,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  GraduationCap,
  Keyboard,
  MapPin,
  RotateCcw,
  Send,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useAppState } from "@/components/AppState";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { Badge, Button, Card, EmptyState, ScoreRing } from "@/components/ui";
import { deadlineLabel, formatDate, STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import { EDUCATION_LABELS } from "@/lib/types";
import type { MatchedJob } from "@/lib/match";

type Decision = "saved" | "applied" | "skipped";

export default function HizliModPage() {
  const { data, setApplication, loading } = useAppState();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [index, setIndex] = useState(0);
  const [openDetail, setOpenDetail] = useState(false);

  const queue: MatchedJob[] = useMemo(() => {
    const apps = data?.applications ?? {};
    return (data?.matched ?? [])
      .filter((m) => !decisions[m.job.sourceKey])
      .filter((m) => {
        const app = apps[m.job.sourceKey];
        return !app || !["applied", "exam", "result"].includes(app.status);
      })
      .sort((a, b) => b.match.score - a.match.score);
  }, [data, decisions]);

  useEffect(() => {
    if (index > 0 && index >= queue.length) setIndex(Math.max(0, queue.length - 1));
  }, [queue.length, index]);

  const current = queue[Math.min(index, Math.max(0, queue.length - 1))] ?? null;

  const decide = useCallback(
    async (decision: Decision) => {
      if (!current) return;
      const key = current.job.sourceKey;
      if (decision === "saved") {
        await setApplication(key, { status: data?.applications[key]?.status === "saved" ? "reviewed" : "saved" });
      } else if (decision === "applied") {
        await setApplication(key, { status: "applied", appliedAt: new Date().toISOString() });
      }
      setDecisions((prev) => ({ ...prev, [key]: decision }));
      setIndex(0);
    },
    [current, data?.applications, setApplication],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openDetail) return;
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        void decide("skipped");
      } else if (e.key === "ArrowLeft" || e.key === "k" || e.key === "K" || e.key === "2") {
        e.preventDefault();
        void decide("saved");
      } else if (e.key === "Enter" || e.key === "3") {
        e.preventDefault();
        if (e.shiftKey || e.key === "3") void decide("applied");
        else setOpenDetail(true);
      } else if (e.key === "d" || e.key === "D") {
        setOpenDetail(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, openDetail]);

  const total = Object.keys(decisions).length;
  const savedCount = Object.values(decisions).filter((d) => d === "saved").length;
  const appliedCount = Object.values(decisions).filter((d) => d === "applied").length;

  if (loading && !data) {
    return <p className="py-20 text-center text-sm text-slate-500">İlanlar yükleniyor…</p>;
  }

  if (!current) {
    return (
      <div className="space-y-5">
        <Header total={total} savedCount={savedCount} appliedCount={appliedCount} />
        <EmptyState
          icon={Trophy}
          title={total ? "Kuyruk bitti! Harika iş." : "Şu an hızlı modda gösterilecek ilan yok"}
          description={
            total
              ? `${total} ilana karar verdin: ${appliedCount} başvuru işaretlendi, ${savedCount} ilan kaydedildi. Başvurularım sekmesinden belge listelerini tamamlayabilirsin.`
              : "Tüm uygun ilanlara karar verilmiş görünüyor. Yeni ilanlar için tekrar tarama yapabilirsin."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setDecisions({})}>
                Kararları sıfırla
              </Button>
              <Link href="/basvurular">
                <Button icon={<BookmarkCheck className="h-4 w-4" />}>Başvurularım</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const { job, match } = current;
  const parsed = job.parsed;
  const blockers = match.flags.filter((f) => f.kind === "block").slice(0, 3);
  const greens = match.flags.filter((f) => f.kind === "match").slice(0, 4);
  const unknowns = match.flags.filter((f) => f.kind === "unknown").slice(0, 3);

  return (
    <div className="space-y-5">
      <Header total={total} savedCount={savedCount} appliedCount={appliedCount} remaining={queue.length} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-5">
        <Card className="animate-pop overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-3.5 py-4 sm:gap-4 sm:px-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ring-inset ${STATUS_STYLE[match.status]}`}>
                  {STATUS_LABEL[match.status]}
                </span>
                {job.isDemo ? <Badge tone="amber">Örnek veri</Badge> : <Badge tone="emerald">Canlı</Badge>}
                {job.kadroCount ? <Badge tone="brand">{job.kadroCount} kadro</Badge> : null}
              </div>
              <p className="text-[13px] font-semibold text-brand-700">{job.institution ?? "Kurum belirtilmemiş"}</p>
              <h2 className="mt-1 text-[19px] font-bold leading-snug text-ink-900">{job.title}</h2>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ScoreRing score={match.score} size={64} />
              <span className="text-[11px] font-semibold text-slate-500">uyum</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-3.5 py-4 sm:px-5 lg:grid-cols-3">
            <MiniFact icon={<CalendarClock className="h-4 w-4" />} label="Son başvuru" value={deadlineLabel(job.applicationEnd)} sub={formatDate(job.applicationEnd)} urgent={(match.deadlineDays ?? 99) <= 7} />
            <MiniFact icon={<Fingerprint className="h-4 w-4" />} label="KPSS" value={parsed.kpss.length ? parsed.kpss.map((k) => `${k.type ?? ""}${k.min ? ` ≥ ${k.min}` : " şart yok"}`).join(" · ") : "Belirtilmemiş"} />
            <MiniFact icon={<GraduationCap className="h-4 w-4" />} label="Öğrenim" value={parsed.education.length ? parsed.education.map((e) => EDUCATION_LABELS[e]).join(" / ") : "Belirtilmemiş"} />
            <MiniFact icon={<MapPin className="h-4 w-4" />} label="Şehirler" value={job.cities.length ? job.cities.slice(0, 5).join(", ") : "Metinde şehir bilgisi yok"} />
            <MiniFact icon={<Users className="h-4 w-4" />} label="Yaş / cinsiyet" value={[parsed.ageMax ? `${parsed.ageMax} yaş sınırı` : null, parsed.gender ? (parsed.gender === "kadin" ? "Kadın" : "Erkek") : null].filter(Boolean).join(" · ") || "Şart yok"} />
            <MiniFact icon={<Send className="h-4 w-4" />} label="Başvuru" value={parsed.applicationMethods?.slice(0, 2).join(" · ") || "Belirtilmemiş"} />
          </div>

          <div className="grid gap-3 border-t border-slate-100 px-3.5 py-4 sm:grid-cols-2 sm:px-5">
            <div>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-emerald-600">Sağlıyorsun</p>
              <ul className="space-y-1">
                {greens.length ? greens.map((f, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-slate-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {f.label}
                  </li>
                )) : <li className="text-[12.5px] text-slate-400">Profil bilgilerin eksik olabilir.</li>}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-rose-600">Engeller / dikkat</p>
              <ul className="space-y-1">
                {blockers.length ? blockers.map((f, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-slate-600">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> {f.label}
                  </li>
                )) : null}
                {unknowns.map((f, i) => (
                  <li key={`u-${i}`} className="flex gap-2 text-[12.5px] text-slate-500">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" /> {f.label}
                  </li>
                ))}
                {!blockers.length && !unknowns.length ? <li className="text-[12.5px] text-emerald-600">Bilinen bir engel yok.</li> : null}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-3.5 py-3.5 sm:flex sm:flex-wrap sm:items-center sm:px-5 sm:py-4">
            <Button variant="outline" className="w-full sm:w-auto" icon={<ArrowRight className="h-4 w-4" />} onClick={() => void decide("skipped")}>
              Atla <kbd className="ml-1 rounded bg-slate-200 px-1 text-[10px] font-bold text-slate-600">→</kbd>
            </Button>
            <Button variant="dark" className="w-full sm:w-auto" icon={<BookmarkCheck className="h-4 w-4" />} onClick={() => void decide("saved")}>
              Kaydet <kbd className="ml-1 rounded bg-white/15 px-1 text-[10px] font-bold">←</kbd>
            </Button>
            <Button variant="success" className="w-full sm:w-auto" icon={<Check className="h-4 w-4" />} onClick={() => void decide("applied")}>
              Başvurdum <kbd className="ml-1 rounded bg-white/15 px-1 text-[10px] font-bold">3</kbd>
            </Button>
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setOpenDetail(true)}>
              Tüm detay <kbd className="ml-1 rounded bg-slate-200 px-1 text-[10px] font-bold text-slate-600">D</kbd>
            </Button>
            <span className="col-span-2 ml-auto flex gap-2 sm:col-span-1">
              {job.detailUrl ? (
                <a href={job.detailUrl} target="_blank" rel="noreferrer noopener">
                  <Button variant="outline" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                    Resmî ilan
                  </Button>
                </a>
              ) : null}
              {job.applyUrl ? (
                <a href={job.applyUrl} target="_blank" rel="noreferrer noopener">
                  <Button size="sm" icon={<Send className="h-3.5 w-3.5" />}>
                    Başvur
                  </Button>
                </a>
              ) : null}
            </span>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wide text-slate-500">
              <Keyboard className="h-4 w-4" /> Kısayollar
            </p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-slate-600">
              <li className="flex items-center justify-between"><span>Atla</span> <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">→</kbd></li>
              <li className="flex items-center justify-between"><span>Kaydet</span> <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">←</kbd></li>
              <li className="flex items-center justify-between"><span>Başvurdum</span> <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">3</kbd></li>
              <li className="flex items-center justify-between"><span>Detayı aç</span> <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">D</kbd></li>
            </ul>
          </Card>

          <Card className="p-4">
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-slate-500">Bu oturum</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 py-2">
                <p className="text-lg font-bold text-ink-900">{total}</p>
                <p className="text-[10.5px] text-slate-500">karar</p>
              </div>
              <div className="rounded-xl bg-brand-50 py-2">
                <p className="text-lg font-bold text-brand-700">{savedCount}</p>
                <p className="text-[10.5px] text-brand-600">kaydedildi</p>
              </div>
              <div className="rounded-xl bg-emerald-50 py-2">
                <p className="text-lg font-bold text-emerald-700">{appliedCount}</p>
                <p className="text-[10.5px] text-emerald-600">başvuru</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
              Kuyrukta <b className="text-ink-900">{queue.length}</b> ilan kaldı. Kararlar anında veritabanına yazılır, sekmeyi kapatsan da kaybolmaz.
            </p>
          </Card>

          <Card className="p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wide text-slate-500">
              <Zap className="h-4 w-4" /> Hız tavsiyesi
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
              Skoru <b>%70</b> üzeri ve son başvurusu <b>7 günden az</b> kalan ilanları önce kaydet, belge listesini sonra tamamla. Şartları belirsiz ilanlarda
              &quot;Tüm detay&quot; ile ilanın ham metnini yapıştırıp netleştirebilirsin.
            </p>
          </Card>
        </aside>
      </div>

      {openDetail ? (
        <JobDetailPanel matched={current} application={data?.applications[job.sourceKey]} onClose={() => setOpenDetail(false)} />
      ) : null}
    </div>
  );
}

function MiniFact({ icon, label, value, sub, urgent }: { icon: React.ReactNode; label: string; value: string; sub?: string; urgent?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${urgent ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-white"}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className={urgent ? "text-rose-500" : "text-slate-400"}>{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-ink-900">{value}</p>
      {sub ? <p className="text-[11.5px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Header({ total, savedCount, appliedCount, remaining }: { total: number; savedCount: number; appliedCount: number; remaining?: number }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <Zap className="h-4 w-4" /> Hızlı mod
        </p>
        <h1 className="mt-1.5 text-[21px] font-bold tracking-tight sm:text-[26px] text-ink-900">Tek tek karar ver, hızlıca başvur</h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          {total} karar verdin · {savedCount} kaydedildi · {appliedCount} başvuru{remaining != null ? ` · kuyrukta ${remaining} ilan` : ""}
        </p>
      </div>
      <Link href="/ilanlar">
        <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />}>
          Liste görünümü
        </Button>
      </Link>
    </header>
  );
}
