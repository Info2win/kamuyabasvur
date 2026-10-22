"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Check,
  ClipboardPaste,
  ExternalLink,
  FileStack,
  Fingerprint,
  GraduationCap,
  Info,
  ListTree,
  MapPin,
  ScanText,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useAppState } from "@/components/AppState";
import { Badge, Button, Card, Field, Input, ScoreRing, SectionTitle, Textarea } from "@/components/ui";
import { deadlineLabel, formatDate, STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import { EDUCATION_LABELS } from "@/lib/types";
import type { MatchedJob } from "@/lib/match";

type Mode = "liste" | "tek";

type ImportPreview = { title: string; institution: string | null; applicationEnd: string | null; kadroCount: number | null; cities: string[] }[];

export default function YapistirPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-sm text-slate-500">Yükleniyor…</p>}>
      <YapistirInner />
    </Suspense>
  );
}

function YapistirInner() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("liste");
  useEffect(() => {
    const m = params?.get("mod");
    if (m === "tek" || m === "liste") setMode(m);
  }, [params]);

  return (
    <div className="space-y-6">
      <header>
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <ClipboardPaste className="h-4 w-4" /> İlan içe aktarma merkezi
        </p>
        <h1 className="mt-1.5 text-[21px] font-bold tracking-tight sm:text-[26px] text-ink-900">
          {mode === "liste" ? "Tüm ilan listesini tek seferde aktar" : "Tek bir ilanın metnini çözümle"}
        </h1>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-slate-500">
          {mode === "liste"
            ? "kamuilan.sbb.gov.tr adresindeki ilan listesinin tamamını (ör. 101 ilan) buraya yapıştır; hepsi saniyeler içinde havuza eklenir ve profilinle puanlanır."
            : "Tek bir ilanın metnini yapıştır; KPSS, yaş, bölüm, kadro, şehir ve son başvuru bilgileri otomatik çıkarılsın."}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {([
          { key: "liste", label: "Toplu liste içe aktar", icon: ListTree },
          { key: "tek", label: "Tek ilan çözümle", icon: ScanText },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={`focus-ring flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition ${
                mode === t.key ? "bg-ink-900 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {mode === "liste" ? <BulkImport /> : <SingleAnalyze />}
    </div>
  );
}

function BulkImport() {
  const { importList, data, syncing, deleteJob } = useAppState();
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("https://kamuilan.sbb.gov.tr/");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview>([]);
  const [result, setResult] = useState<{ imported: number; inserted: number; updated: number } | null>(null);

  const run = async () => {
    if (content.trim().length < 40) return;
    setBusy(true);
    try {
      const res = await importList(content, sourceUrl);
      if (res) {
        setResult({ imported: res.imported, inserted: res.inserted, updated: res.updated });
        setPreview(res.preview ?? []);
      } else {
        setResult(null);
        setPreview([]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Card className="p-4 sm:p-5">
        <SectionTitle title="Liste içeriği" subtitle="HTML kaynağı veya kopyalanan liste metni" />
        <div className="space-y-3.5">
          <Field label="Kaynak adresi" hint="hangi portaldan kopyaladın?">
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://kamuilan.sbb.gov.tr/" />
          </Field>
          <Field label="İlan listesi" hint={`${content.length.toLocaleString("tr-TR")} karakter`}>
            <Textarea
              rows={18}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"Liste sayfasının tamamını buraya yapıştır…\n\nYöntem 1 (önerilen): kamuilan.sbb.gov.tr aç → Ctrl+U (kaynağı görüntüle) → Ctrl+A → Ctrl+C → buraya yapıştır.\nYöntem 2: sayfada Ctrl+A ile tümünü seç, kopyala ve buraya yapıştır (görsel metin de çalışır)."}
              className="font-mono text-base sm:text-[11.5px]"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button icon={<FileStack className="h-4 w-4" />} disabled={busy || syncing || content.trim().length < 40} onClick={() => void run()}>
              {busy || syncing ? "İçe aktarılıyor…" : "Tümünü içe aktar"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setContent("");
                setResult(null);
                setPreview([]);
              }}
            >
              Temizle
            </Button>
            <Link href="/ilanlar">
              <Button variant="outline">İlan listesini gör</Button>
            </Link>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-brand-50 px-3.5 py-3 text-[12px] leading-relaxed text-brand-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              kamuilan.sbb.gov.tr bazı sunucu IP&apos;lerini engelliyor. Bu yüzden liste doğrudan çekilemediğinde en pratik yol budur: sayfayı kendi
              tarayıcında açıp kopyala, buraya yapıştır — <b>101 ilan varsa 101&apos;i de</b> havuza eklenir. Aynı ilanlar tekrar yapıştırılırsa güncellenir,
              çoğalmaz.
            </span>
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        {result ? (
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="emerald">
                <Check className="h-3 w-3" /> {result.imported} ilan çözümlendi
              </Badge>
              <Badge tone="brand">{result.inserted} yeni kayıt</Badge>
              <Badge tone="slate">{result.updated} güncellendi</Badge>
              <Badge tone="teal">havuzda {data?.stats.total ?? 0} ilan</Badge>
            </div>
            {preview.length ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {preview.map((p, i) => (
                  <li key={`${p.title}-${i}`} className="py-2.5">
                    <p className="text-[12.5px] font-semibold leading-snug text-ink-900">{p.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
                      {p.institution ? <span>{p.institution}</span> : null}
                      {p.kadroCount ? <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.kadroCount} kadro</span> : null}
                      {p.applicationEnd ? <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{formatDate(p.applicationEnd)}</span> : null}
                      {p.cities.length ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.cities.slice(0, 3).join(", ")}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-[12px] text-slate-500">
              İçe aktarılan ilanların detay metni yoksa, ilan kartındaki <b>Metni yapıştır</b> veya <b>Resmî detayı çek</b> ile şartları
              netleştirebilirsin.
            </p>
          </Card>
        ) : (
          <Card className="grid place-items-center p-10 text-center">
            <div>
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <ListTree className="h-6 w-6" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink-900">Henüz içe aktarma yapılmadı</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
                Soldaki alana liste içeriğini yapıştırıp &quot;Tümünü içe aktar&quot; dediğinde; başlıklar, kurumlar, kadro sayıları ve son başvuru tarihleri
                ayrıştırılıp profilinle eşleştirilir.
              </p>
            </div>
          </Card>
        )}

        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-500">Nasıl çalışır?</h3>
          <ol className="space-y-2.5">
            {[
              "Tarayıcında kamuilan.sbb.gov.tr adresini aç (giriş gerekmez).",
              "Ctrl+U ile sayfa kaynağını aç, Ctrl+A ile tümünü seç ve kopyala. Alternatif olarak liste sayfasında Ctrl+A + Ctrl+C de yeterli.",
              "Buraya yapıştır, 'Tümünü içe aktar' de.",
              "İlanlar havuza eklenir; uyum skoruna göre /ilanlar ve /hizli modda sıralanır.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                <span className="text-[12.5px] leading-relaxed text-slate-600">{step}</span>
              </li>
            ))}
          </ol>
          {data?.jobs.some((j) => j.source === "import" || j.source === "sbb") ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[12px] font-semibold text-slate-500">İçe aktarılan son ilanlar</p>
              <div className="flex flex-wrap gap-1.5">
                {data.jobs
                  .filter((j) => j.source === "import" || j.source === "sbb")
                  .slice(0, 6)
                  .map((j) => (
                    <span key={j.sourceKey} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">
                      {j.title.slice(0, 46)}
                      <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => void deleteJob(j.sourceKey)} aria-label="Kaldır">
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function SingleAnalyze() {
  const { analyzePaste, setApplication, pushToast } = useAppState();
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MatchedJob | null>(null);

  const run = async () => {
    if (!text.trim() && !title.trim()) {
      pushToast("Önce ilan başlığı veya metnini yapıştır", "warn");
      return;
    }
    setBusy(true);
    try {
      const res = await analyzePaste({ title, text, institution, sourceUrl });
      setResult(res);
      if (res) {
        const blocks = res.match.flags.filter((f) => f.kind === "block").length;
        pushToast(blocks ? `${blocks} engel bulundu — detaylara bak` : "Uygun görünüyor! Takibe alabilirsin", blocks ? "warn" : "ok");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-4 sm:p-5">
        <SectionTitle title="İlan bilgileri" subtitle="Başlık ve metin yeterli, diğerleri isteğe bağlı" />
        <div className="space-y-3.5">
          <Field label="İlan başlığı" hint="ör. MİLLİ SARAYLAR - 158 Sözleşmeli Personel Alımı">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kurum - ilan başlığı" />
          </Field>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Kurum">
              <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="ör. Milli Saraylar İdaresi Başkanlığı" />
            </Field>
            <Field label="İlan bağlantısı">
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://kamuilan.sbb.gov.tr/…" />
            </Field>
          </div>
          <Field label="İlan metni" hint={`${text.length.toLocaleString("tr-TR")} karakter`}>
            <Textarea
              rows={16}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"İlan metninin tamamını buraya yapıştır…\n\nÖrnek: 657 sayılı Kanunun 4/B maddesi kapsamında… KPSSP3 puan türünden en az 60 puan… 35 yaşını doldurmamış olmak…"}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button icon={<ScanText className="h-4 w-4" />} disabled={busy} onClick={() => void run()}>
              {busy ? "Çözümleniyor…" : "Çözümle ve listeye ekle"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTitle("");
                setInstitution("");
                setSourceUrl("");
                setText("");
                setResult(null);
              }}
            >
              Temizle
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        {result ? (
          <>
            <Card className="overflow-hidden">
              <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-5 py-4">
                <ScoreRing score={result.match.score} size={64} />
                <div className="min-w-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ring-inset ${STATUS_STYLE[result.match.status]}`}>
                    {STATUS_LABEL[result.match.status]}
                  </span>
                  <h2 className="mt-1.5 text-[15px] font-bold leading-snug text-ink-900">{result.job.title}</h2>
                  <p className="text-[12.5px] text-slate-500">{result.job.institution}</p>
                </div>
              </div>

              <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
                <Fact icon={<CalendarClock className="h-4 w-4" />} label="Son başvuru" value={deadlineLabel(result.job.applicationEnd)} sub={formatDate(result.job.applicationEnd)} />
                <Fact icon={<Users className="h-4 w-4" />} label="Kadro" value={String(result.job.kadroCount ?? "belirtilmemiş")} />
                <Fact
                  icon={<Fingerprint className="h-4 w-4" />}
                  label="KPSS"
                  value={result.job.parsed.kpss.length ? result.job.parsed.kpss.map((k) => `${k.type ?? ""}${k.min ? ` ≥ ${k.min}` : ""}`).join(" · ") : "şart yok / bulunamadı"}
                />
                <Fact
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Öğrenim"
                  value={result.job.parsed.education.length ? result.job.parsed.education.map((e) => EDUCATION_LABELS[e]).join(" / ") : "belirtilmemiş"}
                />
                <Fact icon={<MapPin className="h-4 w-4" />} label="İller" value={result.job.cities.length ? result.job.cities.join(", ") : "metinden çıkarılamadı"} />
                <Fact icon={<CalendarClock className="h-4 w-4" />} label="Yaş" value={result.job.parsed.ageMax ? `${result.job.parsed.ageMax} yaşını doldurmamış` : "şart bulunamadı"} />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
                <Button
                  variant="dark"
                  icon={<Check className="h-4 w-4" />}
                  onClick={async () => {
                    await setApplication(result.job.sourceKey, { status: "saved" });
                    pushToast("Takip listesine eklendi");
                  }}
                >
                  Takibe al
                </Button>
                <Button
                  variant="success"
                  icon={<Send className="h-4 w-4" />}
                  onClick={async () => {
                    await setApplication(result.job.sourceKey, { status: "applied", appliedAt: new Date().toISOString() });
                    pushToast("Başvuruldu olarak işaretlendi");
                  }}
                >
                  Başvurdum
                </Button>
                {result.job.applyUrl ? (
                  <a href={result.job.applyUrl} target="_blank" rel="noreferrer noopener">
                    <Button variant="outline" icon={<ExternalLink className="h-4 w-4" />}>
                      Başvuru linki
                    </Button>
                  </a>
                ) : null}
                <Link href="/ilanlar">
                  <Button variant="ghost">Listede gör</Button>
                </Link>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">
                <Sparkles className="h-4 w-4" /> Değerlendirme
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-emerald-600">Sağlıyorsun</p>
                  <ul className="space-y-1.5">
                    {result.match.flags.filter((f) => f.kind === "match").map((f, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] text-slate-600">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {f.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-rose-600">Engeller</p>
                  <ul className="space-y-1.5">
                    {result.match.flags.filter((f) => f.kind === "block").map((f, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] text-slate-600">
                        <span className="mt-0.5 shrink-0 text-rose-500">✕</span>
                        <span>
                          {f.label}
                          {f.detail ? <span className="mt-0.5 block text-[11.5px] text-slate-500">{f.detail}</span> : null}
                        </span>
                      </li>
                    ))}
                    {!result.match.flags.some((f) => f.kind === "block") ? <li className="text-[12.5px] text-emerald-600">Bilinen bir engel yok.</li> : null}
                  </ul>
                </div>
              </div>
              {result.job.parsed.conditions?.length ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">Metinden çıkan şartlar</p>
                  <ul className="space-y-1.5">
                    {result.job.parsed.conditions.slice(0, 8).map((c, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-slate-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          </>
        ) : (
          <Card className="grid place-items-center p-10 text-center">
            <div>
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <ClipboardPaste className="h-6 w-6" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink-900">Henüz bir ilan çözümlenmedi</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
                İlan metnini yapıştırıp &quot;Çözümle&quot; dediğinde KPSS, yaş, bölüm, şehir ve son başvuru bilgileri otomatik çıkarılır ve profilinle
                karşılaştırılır.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Fact({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-ink-900">{value}</p>
      {sub ? <p className="text-[11.5px] text-slate-500">{sub}</p> : null}
    </div>
  );
}
