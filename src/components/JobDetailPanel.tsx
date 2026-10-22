"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ExternalLink,
  FileText,
  GraduationCap,
  Hourglass,
  Fingerprint,
  ListChecks,
  MapPin,
  PencilLine,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { MatchedJob } from "@/lib/match";
import { APPLICATION_STATUS_LABELS, EDUCATION_LABELS } from "@/lib/types";
import type { ApplicationStatus, DocumentItem, JobRecord, ApplicationRecord, DashboardPayload } from "@/lib/types";
import { deadlineLabel, formatDate, formatDateTime, relativeTime, STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import { useEscapeKey, useScrollLock } from "@/lib/useScrollLock";
import { useAppState } from "./AppState";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "./ui";

function Fact({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "default" | "danger" | "warn" | "good" }) {
  const tones = {
    default: "border-slate-200 bg-white",
    danger: "border-rose-200 bg-rose-50/60",
    warn: "border-amber-200 bg-amber-50/60",
    good: "border-emerald-200 bg-emerald-50/60",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-[13.5px] font-semibold leading-snug text-ink-900">{value}</p>
    </div>
  );
}

function FlagList({ matched }: { matched: MatchedJob }) {
  const groups = [
    { key: "match" as const, title: "Sağladığın şartlar", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600" },
    { key: "block" as const, title: "Engel / risk", icon: <AlertTriangle className="h-4 w-4" />, color: "text-rose-600" },
    { key: "unknown" as const, title: "Kontrol etmen gerekenler", icon: <CircleDashed className="h-4 w-4" />, color: "text-slate-500" },
  ];
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const items = matched.match.flags.filter((f) => f.kind === group.key);
        if (!items.length) return null;
        return (
          <div key={group.key}>
            <p className={`mb-2 flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide ${group.color}`}>
              {group.icon}
              {group.title}
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{items.length}</span>
            </p>
            <ul className="space-y-1.5">
              {items.map((flag, i) => (
                <li key={`${flag.label}-${i}`} className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className={`mt-0.5 shrink-0 ${group.color}`}>{group.key === "match" ? "✓" : group.key === "block" ? "✕" : "?"}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-snug text-ink-900">{flag.label}</span>
                    {flag.detail ? <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-500">{flag.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function JobDetailPanel({
  matched,
  application,
  onClose,
}: {
  matched: MatchedJob;
  application?: ApplicationRecord;
  onClose: () => void;
}) {
  const { job, match } = matched;
  const { setApplication, updateJobText, pushToast } = useAppState();
  const [note, setNote] = useState(application?.note ?? "");
  const [reminder, setReminder] = useState(application?.reminderDate ? application.reminderDate.slice(0, 10) : "");
  const [examDate, setExamDate] = useState(application?.examDate ? application.examDate.slice(0, 10) : "");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState(job.rawText ?? "");
  const [savingPaste, setSavingPaste] = useState(false);

  useEffect(() => {
    setNote(application?.note ?? "");
    setReminder(application?.reminderDate ? application.reminderDate.slice(0, 10) : "");
    setExamDate(application?.examDate ? application.examDate.slice(0, 10) : "");
    setPasteText(job.rawText ?? "");
  }, [application, job.sourceKey, job.rawText]);

  useScrollLock(true);
  useEscapeKey(true, onClose);

  const documents = useMemo<DocumentItem[]>(() => application?.documents ?? [], [application]);
  const doneCount = documents.filter((d) => d.done).length;

  const toggleDoc = async (index: number) => {
    const next = documents.map((d, i) => (i === index ? { ...d, done: !d.done } : d));
    await setApplication(job.sourceKey, { documents: next, status: application?.status ?? "saved" });
  };

  const changeStatus = async (status: ApplicationStatus) => {
    await setApplication(job.sourceKey, {
      status,
      note,
      documents,
      reminderDate: reminder ? new Date(`${reminder}T09:00:00`).toISOString() : null,
      examDate: examDate ? new Date(`${examDate}T09:00:00`).toISOString() : null,
    });
    pushToast(`Durum: ${APPLICATION_STATUS_LABELS[status]}`);
  };

  const savePaste = async () => {
    setSavingPaste(true);
    try {
      const updated = await updateJobText(job.sourceKey, pasteText);
      if (updated) pushToast("İlan metni çözümlendi, şartlar güncellendi");
      setPasteOpen(false);
    } finally {
      setSavingPaste(false);
    }
  };

  const parsed = job.parsed;
  const kpssText = parsed.kpss.length
    ? parsed.kpss.map((k) => `${k.type ?? "KPSS"}${k.min ? `: en az ${k.min}` : ""}${k.year ? ` (${k.year})` : ""}`).join(" · ")
    : "Belirtilmemiş";

  const deadlineTone = match.urgency === "bugun" || match.urgency === "acil" ? "danger" : match.urgency === "yaklasiyor" ? "warn" : match.urgency === "kapanmis" ? "warn" : "good";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]" />
      <aside className="animate-rise relative flex max-h-[93dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:animate-slide-in sm:h-full sm:max-h-none sm:w-[min(740px,100%)] sm:rounded-none">
        <span className="mx-auto mt-2.5 block h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <header className="border-b border-slate-200 bg-white px-4 pb-3.5 pt-3 sm:px-5 sm:pb-4 sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ring-inset ${STATUS_STYLE[match.status]}`}>
                  {STATUS_LABEL[match.status]} · %{match.score}
                </span>
                {job.isDemo ? <Badge tone="amber">Örnek ilan</Badge> : null}
                {job.category ? <Badge>{job.category}</Badge> : null}
              </div>
              <h2 className="text-[15.5px] font-bold leading-snug text-ink-900 sm:text-[17px]">{job.title}</h2>
              <p className="mt-1 text-[13px] font-medium text-brand-700">{job.institution ?? "Kurum belirtilmemiş"}</p>
              <p className="mt-0.5 text-[11.5px] text-slate-400">
                {job.ilanNo ? `İlan no: ${job.ilanNo} · ` : ""}Yayım tarihi: {formatDate(job.publishedAt)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100" aria-label="Paneli kapat">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {job.applyUrl ? (
              <a href={job.applyUrl} target="_blank" rel="noreferrer noopener" className="flex min-w-0">
                <Button variant="success" className="flex-1 sm:flex-none" icon={<Send className="h-4 w-4" />}>
                  Başvur
                </Button>
              </a>
            ) : null}
            {job.detailUrl ? (
              <a href={job.detailUrl} target="_blank" rel="noreferrer noopener" className="flex min-w-0">
                <Button variant="outline" className="flex-1 sm:flex-none" icon={<ExternalLink className="h-4 w-4" />}>
                  Resmî ilan
                </Button>
              </a>
            ) : null}
            <Button variant={application ? "primary" : "dark"} className="col-span-2 sm:col-span-1 sm:flex-none" icon={<Check className="h-4 w-4" />} onClick={() => void changeStatus("applied")}>
              Başvurdum
            </Button>
            <Button variant="ghost" className="sm:flex-none" icon={<PencilLine className="h-4 w-4" />} onClick={() => setPasteOpen((v) => !v)}>
              Metni yapıştır
            </Button>
          </div>
        </header>

        <div className="scroll-y flex-1 space-y-4 overflow-y-auto px-3.5 py-4 pb-24 sm:space-y-5 sm:px-5 sm:py-5 sm:pb-6">
          {pasteOpen ? (
            <Card className="p-4">
              <Field
                label="İlan metnini buraya yapıştır"
                hint="resmî ilan sayfasındaki metnin tamamı"
              >
                <Textarea
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="İlan metnini kopyalayıp buraya yapıştırın. KPSS puanı, yaş, bölüm, şehir kontenjanları ve son başvuru tarihi otomatik çıkarılır."
                />
              </Field>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => void savePaste()} disabled={savingPaste || pasteText.trim().length < 20}>
                  {savingPaste ? "Çözümleniyor…" : "Çözümle ve kaydet"}
                </Button>
                <Button variant="ghost" onClick={() => setPasteOpen(false)}>
                  Vazgeç
                </Button>
              </div>
            </Card>
          ) : null}

          <section>
            <h3 className="mb-2.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">
              <Hourglass className="h-4 w-4" /> Tek bakışta
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Fact icon={<CalendarClock className="h-3.5 w-3.5" />} label="Son başvuru" value={deadlineLabel(job.applicationEnd)} tone={deadlineTone as "danger" | "warn" | "good"} />
              <Fact icon={<Users className="h-3.5 w-3.5" />} label="Kadro sayısı" value={job.kadroCount ?? "Belirtilmemiş"} />
              <Fact icon={<Fingerprint className="h-3.5 w-3.5" />} label="KPSS şartı" value={kpssText} />
              <Fact
                icon={<GraduationCap className="h-3.5 w-3.5" />}
                label="Öğrenim"
                value={parsed.education.length ? parsed.education.map((e) => EDUCATION_LABELS[e]).join(" / ") : "Belirtilmemiş"}
              />
              <Fact
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                label="Yaş şartı"
                value={parsed.ageMax ? `${parsed.ageMax} yaşını doldurmamış olmak` : parsed.ageMin ? `En az ${parsed.ageMin} yaş` : "Belirtilmemiş"}
              />
              <Fact
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Şehirler"
                value={job.cities.length ? `${job.cities.slice(0, 6).join(", ")}${job.cities.length > 6 ? ` +${job.cities.length - 6}` : ""}` : "İlan metninden çıkarılamadı"}
              />
              <Fact
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Başvuru yöntemi"
                value={parsed.applicationMethods?.length ? parsed.applicationMethods.join(" · ") : "Belirtilmemiş"}
              />
              <Fact
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Başvuru tarihleri"
                value={`${formatDate(job.applicationStart)} → ${formatDate(job.applicationEnd)}`}
              />
              <Fact
                icon={<ListChecks className="h-3.5 w-3.5" />}
                label="İlan metni"
                value={parsed.parsedFrom === "baslik" ? "Sadece başlık var" : "Tam metin okundu"}
                tone={parsed.parsedFrom === "baslik" ? "warn" : "good"}
              />
            </div>
            {(parsed.confidence ?? 0) < 40 ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                Bu ilanda yalnızca başlık bilgisi var. <b>Metni yapıştır</b> ile ilanın tamamını kopyalarsan KPSS, yaş, bölüm, şehir ve son başvuru bilgileri otomatik doldurulur.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">
              <Sparkles className="h-4 w-4" /> Sana uygunluk analizi
            </h3>
            <FlagList matched={matched} />
          </section>

          {job.positions?.length ? (
            <section>
              <h3 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-500">Kadro / pozisyon dağılımı</h3>
              <Card className="divide-y divide-slate-100">
                {job.positions.slice(0, 14).map((p, i) => (
                  <div key={`${p.title}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[13px] font-medium text-ink-900">{p.title}</span>
                    <span className="flex items-center gap-2">
                      {p.kpssType ? <Badge tone="brand">{p.kpssType}</Badge> : null}
                      {p.education ? <Badge>{p.education}</Badge> : null}
                      {p.count ? <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-bold tabular-nums text-ink-900">{p.count}</span> : null}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}

          {parsed.conditions?.length ? (
            <section>
              <h3 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-500">İlandaki önemli şartlar</h3>
              <Card className="p-4">
                <ul className="space-y-2">
                  {parsed.conditions.map((c, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2.5 flex items-center justify-between gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">
              <span className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Başvuru adımları
              </span>
            </h3>
            <Card className="p-4">
              <ol className="space-y-2.5">
                {[
                  { t: "Resmî ilanı aç ve şartları teyit et", href: job.detailUrl },
                  { t: "Başvuru kanalından başvurunuzu yapın (Kariyer Kapısı / e-Devlet / şahsen)", href: job.applyUrl },
                  { t: "Belgeleri hazırla ve aşağıdaki listeyi işaretle", href: null },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                    {step.href ? (
                      <a href={step.href} target="_blank" rel="noreferrer noopener" className="focus-ring text-[13px] font-medium text-brand-700 underline-offset-2 hover:underline">
                        {step.t} <ExternalLink className="inline h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[13px] font-medium text-ink-900">{step.t}</span>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          </section>

          <section>
            <h3 className="mb-2.5 flex items-center justify-between gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Belge kontrol listesi
              </span>
              {documents.length ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {doneCount}/{documents.length}
                </span>
              ) : null}
            </h3>
            {documents.length ? (
              <Card className="divide-y divide-slate-100">
                {documents.map((doc, i) => (
                  <button
                    key={`${doc.label}-${i}`}
                    type="button"
                    onClick={() => void toggleDoc(i)}
                    className="focus-ring flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${doc.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"}`}>
                      {doc.done ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-medium ${doc.done ? "text-slate-400 line-through" : "text-ink-900"}`}>{doc.label}</span>
                      {doc.hint ? <span className="mt-0.5 block text-[11.5px] leading-relaxed text-slate-500">{doc.hint}</span> : null}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${doc.source === "ilana-ozel" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"}`}>
                      {doc.source === "ilana-ozel" ? "ilana özel" : "genel"}
                    </span>
                  </button>
                ))}
              </Card>
            ) : (
              <Card className="p-4">
                <p className="text-[12.5px] text-slate-500">
                  Belge listesi ilan kaydedildiğinde otomatik oluşturulur.
                </p>
                <Button className="mt-3" size="sm" onClick={() => void changeStatus("saved")}>
                  İlanı kaydet ve listeyi oluştur
                </Button>
              </Card>
            )}
          </section>

          <section>
            <details className="group rounded-2xl border border-slate-200 bg-white">
              <summary className="focus-ring flex cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-bold text-slate-600">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> İlan metni
                </span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="max-h-72 overflow-y-auto border-t border-slate-100 px-4 py-3">
                <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-slate-600">
                  {job.rawText ?? "İlan metni henüz eklenmedi. 'Metni yapıştır' ile ilanın tamamını kopyalayabilirsin."}
                </pre>
              </div>
            </details>
          </section>

          <section>
            <h3 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-500">Takip bilgileri</h3>
            <Card className="space-y-3 p-4">
              <Field label="Başvuru durumu">
                <Select value={application?.status ?? ""} onChange={(e) => void changeStatus(e.target.value as ApplicationStatus)}>
                  <option value="">— Takibe alınmadı —</option>
                  {(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {APPLICATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Not" hint="ör. F klavye sertifikam yok, 12'sine kadar alacağım">
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => application && void setApplication(job.sourceKey, { note })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Hatırlatma tarihi">
                  <Input type="date" value={reminder} onChange={(e) => setReminder(e.target.value)} onBlur={() => void setApplication(job.sourceKey, { reminderDate: reminder ? new Date(`${reminder}T09:00:00`).toISOString() : null })} />
                </Field>
                <Field label="Sınav / mülakat tarihi">
                  <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} onBlur={() => void setApplication(job.sourceKey, { examDate: examDate ? new Date(`${examDate}T09:00:00`).toISOString() : null })} />
                </Field>
              </div>
              {application ? (
                <p className="text-[11.5px] text-slate-400">Takibe alındı: {formatDateTime(application.savedAt)}</p>
              ) : null}
            </Card>
          </section>
        </div>
      </aside>
    </div>
  );
}

export function JobDetailPlaceholder({ job }: { job: JobRecord }) {
  return <p>{job.title}</p>;
}
