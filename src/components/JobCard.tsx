"use client";

import { Bookmark, BookmarkCheck, Building2, CalendarClock, Check, ChevronRight, ExternalLink, MapPin, Users } from "lucide-react";
import type { MatchedJob } from "@/lib/match";
import type { ApplicationRecord } from "@/lib/store";
import { ILAN_TYPES } from "@/lib/types";
import { deadlineLabel, formatDate, STATUS_LABEL, STATUS_STYLE, URGENCY_STYLE } from "@/lib/format";
import { Badge, ScoreRing } from "./ui";

const ilanTypeLabel = (value: string | null) => ILAN_TYPES.find((t) => t.value === value)?.label ?? null;

export function JobCard({
  matched,
  application,
  onOpen,
  onSave,
  onApplied,
}: {
  matched: MatchedJob;
  application?: ApplicationRecord;
  onOpen: () => void;
  onSave: () => void;
  onApplied: () => void;
}) {
  const { job, match } = matched;
  const parsed = job.parsed;
  const kpss = parsed.kpss.filter((k) => k.min || k.type).slice(0, 2);
  const saved = Boolean(application);
  const done = application?.status === "applied" || application?.status === "exam" || application?.status === "result";

  return (
    <article
      className={`animate-rise group relative overflow-hidden rounded-2xl border bg-white transition hover:shadow-[0_10px_30px_-12px_rgba(16,35,60,0.25)] ${
        done ? "border-emerald-300" : saved ? "border-brand-300" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
        <button type="button" onClick={onOpen} className="focus-ring flex shrink-0 flex-row items-center gap-3 rounded-xl sm:flex-col sm:gap-2">
          <ScoreRing score={match.score} />
          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ring-inset ${STATUS_STYLE[match.status]}`}>{STATUS_LABEL[match.status]}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-700">
              <Building2 className="h-3.5 w-3.5" />
              {job.institution ?? "Kurum belirtilmemiş"}
            </span>
            {job.isDemo ? <Badge tone="amber">Örnek veri</Badge> : <Badge tone="emerald">Canlı kaynak</Badge>}
            {job.ilanType ? <Badge>{ilanTypeLabel(job.ilanType)}</Badge> : null}
            {done ? <Badge tone="emerald"><Check className="h-3 w-3" /> Başvuruldu</Badge> : saved ? <Badge tone="brand"><BookmarkCheck className="h-3 w-3" /> Takipte</Badge> : null}
          </div>

          <button type="button" onClick={onOpen} className="focus-ring mt-1.5 block text-left">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink-900 group-hover:text-brand-700">{job.title}</h3>
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-slate-600">
            {job.kadroCount ? (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <b className="text-ink-900">{job.kadroCount}</b> kadro
              </span>
            ) : null}
            {job.cities.length ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{job.cities.slice(0, 4).join(", ")}{job.cities.length > 4 ? ` +${job.cities.length - 4}` : ""}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="h-3.5 w-3.5" /> şehir bilgisi yok
              </span>
            )}
            {kpss.length ? (
              <span className="flex items-center gap-1.5">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">KPSS</span>
                {kpss.map((k, i) => (
                  <span key={`${k.type ?? "k"}-${i}`} className="tabular-nums">
                    {k.type ? `${k.type} ` : ""}
                    {k.min ? `en az ${k.min}` : "puan şartı yok"}
                  </span>
                ))}
              </span>
            ) : null}
            {job.applicationEnd ? (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(job.applicationEnd)}
              </span>
            ) : null}
          </div>

          {match.flags.filter((f) => f.kind === "block").length ? (
            <p className="mt-2.5 text-[12.5px] font-medium text-rose-600">
              ⚠ {match.flags.find((f) => f.kind === "block")?.label}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-row items-center gap-2 sm:mt-0 sm:flex-col sm:items-end">
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${URGENCY_STYLE[match.urgency]}`}>
            {deadlineLabel(job.applicationEnd)}
          </span>
          <div className="flex flex-1 gap-2 sm:flex-none sm:gap-1.5">
            <button
              type="button"
              onClick={onSave}
              title={saved ? "Takipten çıkar" : "Kaydet"}
              className={`focus-ring grid h-11 flex-1 place-items-center rounded-xl border transition sm:h-9 sm:w-9 sm:flex-none ${
                saved ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onApplied}
              title="Başvurdum olarak işaretle"
              className={`focus-ring grid h-11 flex-1 place-items-center rounded-xl border transition sm:h-9 sm:w-9 sm:flex-none ${
                done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
              }`}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpen}
              title="Detaylı incele"
              className="focus-ring grid h-11 flex-1 place-items-center rounded-xl border border-slate-300 bg-white text-slate-500 transition hover:border-brand-300 hover:text-brand-600 sm:h-9 sm:w-9 sm:flex-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {job.detailUrl ? (
              <a
                href={job.detailUrl}
                target="_blank"
                rel="noreferrer noopener"
                title="Resmî ilanı aç"
                className="focus-ring grid h-11 flex-1 place-items-center rounded-xl border border-slate-300 bg-white text-slate-500 transition hover:border-brand-300 hover:text-brand-600 sm:h-9 sm:w-9 sm:flex-none"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
