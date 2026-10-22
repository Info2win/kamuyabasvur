"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Inbox,
  StickyNote,
  Send,
  Trash2,
  Trophy,
} from "lucide-react";
import { useAppState } from "@/components/AppState";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { Badge, Button, Card, EmptyState, Input, Textarea } from "@/components/ui";
import { deadlineLabel, formatDate, scoreColor } from "@/lib/format";
import { matchJob } from "@/lib/match";
import type { MatchedJob } from "@/lib/match";
import type { ApplicationRecord } from "@/lib/store";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_ORDER } from "@/lib/types";
import type { ApplicationStatus } from "@/lib/types";

export default function BasvurularPage() {
  const { data, setApplication, pushToast } = useAppState();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const apps = useMemo(() => Object.values(data?.applications ?? {}), [data?.applications]);

  const matchedByKey = useMemo(() => {
    const map = new Map<string, MatchedJob>();
    if (!data) return map;
    for (const job of data.jobs) {
      map.set(job.sourceKey, matchJob(job, data.profile, data.preferences));
    }
    for (const m of [...data.matched, ...data.excluded]) map.set(m.job.sourceKey, m);
    return map;
  }, [data]);

  const columns = APPLICATION_STATUS_ORDER.map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
    items: apps.filter((a) => a.status === status),
  }));
  const rejected = apps.filter((a) => a.status === "rejected");
  const done = apps.filter((a) => ["applied", "exam", "result"].includes(a.status)).length;

  const move = async (app: ApplicationRecord, dir: -1 | 1) => {
    const idx = APPLICATION_STATUS_ORDER.indexOf(app.status as ApplicationStatus);
    const next = APPLICATION_STATUS_ORDER[Math.max(0, Math.min(APPLICATION_STATUS_ORDER.length - 1, idx + dir))];
    await setApplication(app.jobKey, { status: next });
    pushToast(`${APPLICATION_STATUS_LABELS[next]} olarak işaretlendi`);
  };

  const openMatched = openKey ? (matchedByKey.get(openKey) ?? null) : null;

  if (!apps.length) {
    return (
      <div className="space-y-5">
        <Header total={0} done={0} />
        <EmptyState
          icon={Inbox}
          title="Henüz takip ettiğin ilan yok"
          description="İlanlar listesinden bir ilanı kaydet ya da hızlı modda karar ver; burada belge listesi ve başvuru adımlarıyla birlikte takip edebilirsin."
          action={
            <Link href="/ilanlar">
              <Button icon={<Send className="h-4 w-4" />}>İlanlara git</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header total={apps.length} done={done} />

      <div className="grid gap-5 pb-2 sm:flex sm:gap-4 sm:overflow-x-auto sm:pb-4 scroll-x">
        {columns.map((col) => (
          <div key={col.status} className="w-full sm:w-[19rem] sm:shrink-0">
            <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
              <p className="text-[12.5px] font-bold uppercase tracking-wide text-slate-500">{col.label}</p>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">{col.items.length}</span>
            </div>
            <div className="grid gap-2.5 sm:block sm:space-y-2.5">
              {col.items.length ? (
                col.items.map((app) => {
                  const matched = matchedByKey.get(app.jobKey);
                  const job = matched?.job;
                  const docs = app.documents ?? [];
                  const docDone = docs.filter((d) => d.done).length;
                  const deadline = job?.applicationEnd ?? app.deadline;
                  return (
                    <Card key={app.jobKey} className="animate-rise p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11.5px] font-semibold text-brand-700">{app.institution ?? job?.institution ?? "Kurum"}</p>
                        {matched ? <span className={`shrink-0 text-[12px] font-bold tabular-nums ${scoreColor(matched.match.score)}`}>%{matched.match.score}</span> : null}
                      </div>
                      <button type="button" onClick={() => setOpenKey(app.jobKey)} className="focus-ring mt-1 block text-left">
                        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900 hover:text-brand-700">
                          {app.jobTitle ?? job?.title ?? "İlan"}
                        </p>
                      </button>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          <CalendarClock className="h-3 w-3" /> {deadline ? deadlineLabel(deadline) : "tarih yok"}
                        </span>
                        {docs.length ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <FileCheck2 className="h-3 w-3" /> {docDone}/{docs.length} belge
                          </span>
                        ) : null}
                      </div>

                      {docs.length ? (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(docDone / docs.length) * 100}%` }} />
                        </div>
                      ) : null}

                      <div className="mt-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void move(app, -1)}
                          disabled={APPLICATION_STATUS_ORDER.indexOf(app.status as ApplicationStatus) === 0}
                          className="focus-ring grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-35"
                          aria-label="Geri al"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void move(app, 1)}
                          disabled={APPLICATION_STATUS_ORDER.indexOf(app.status as ApplicationStatus) === APPLICATION_STATUS_ORDER.length - 1}
                          className="focus-ring grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-35"
                          aria-label="İlerlet"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenKey(app.jobKey)}
                          className="focus-ring flex-1 rounded-lg bg-ink-900 px-2 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-ink-700"
                        >
                          İncele & belgeler
                        </button>
                        {job?.applyUrl ? (
                          <a href={job.applyUrl} target="_blank" rel="noreferrer noopener" className="focus-ring grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" aria-label="Başvuru linki">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>

                      <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2.5">
                        <div className="relative">
                          <StickyNote className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Textarea
                            rows={2}
                            className="pl-8 text-[12px]"
                            placeholder="Not ekle (ör. F klavye sertifikası alınacak)"
                            value={notes[app.jobKey] ?? app.note ?? ""}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [app.jobKey]: e.target.value }))}
                            onBlur={() => void setApplication(app.jobKey, { note: notes[app.jobKey] ?? app.note ?? "" })}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="date"
                            className="py-1 text-[11.5px]"
                            value={app.reminderDate ? app.reminderDate.slice(0, 10) : ""}
                            onChange={(e) => void setApplication(app.jobKey, { reminderDate: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null })}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await setApplication(app.jobKey, { remove: true });
                              pushToast("Takipten çıkarıldı");
                            }}
                            className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:text-rose-600"
                            aria-label="Takipten çıkar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {app.appliedAt ? <p className="text-[11px] text-slate-400">Başvuru: {formatDate(app.appliedAt)}</p> : null}
                        {job?.isDemo ? <Badge tone="amber">Örnek veri</Badge> : null}
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-6 text-center text-[12px] text-slate-400">
                  Boş
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {rejected.length ? (
        <section>
          <p className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-slate-500">Vazgeçilenler ({rejected.length})</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rejected.map((app) => (
              <Card key={app.jobKey} className="flex items-center justify-between gap-2 p-3 opacity-70">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink-900">{app.jobTitle ?? app.jobKey}</p>
                  <p className="truncate text-[11.5px] text-slate-500">{app.institution}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void setApplication(app.jobKey, { status: "saved" })}>
                  Geri al
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {openMatched ? (
        <JobDetailPanel matched={openMatched} application={data?.applications[openKey!]} onClose={() => setOpenKey(null)} />
      ) : openKey ? (
        <Card className="p-4 text-center text-[13px] text-slate-500">
          Bu ilan havuzdan kaldırılmış. Takip kaydını silebilirsin.
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpenKey(null)}>
              Kapat
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={async () => {
                await setApplication(openKey, { remove: true });
                setOpenKey(null);
              }}
            >
              Kaydı sil
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Header({ total, done }: { total: number; done: number }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <ClipboardList className="h-4 w-4" /> Başvuru hattı
        </p>
        <h1 className="mt-1.5 flex items-center gap-2 text-[21px] font-bold tracking-tight sm:text-[26px] text-ink-900">
          Başvurularım {total ? <Trophy className="h-5 w-5 text-amber-500" /> : null}
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          {total} ilan takipte · {done} başvuru tamamlandı. Kartları ok tuşlarıyla aşamalar arasında taşıyabilirsin.
        </p>
      </div>
      <Link href="/hizli">
        <Button variant="outline">Hızlı moda dön</Button>
      </Link>
    </header>
  );
}
