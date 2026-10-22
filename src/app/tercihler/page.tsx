"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Save, Search, SlidersHorizontal, Target } from "lucide-react";
import { useAppState } from "@/components/AppState";
import { Badge, Button, Card, Chip, Field, Input, SectionTitle, Select, TagInput, Toggle } from "@/components/ui";
import { CITIES, REGIONS } from "@/lib/cities";
import { matchJobs } from "@/lib/match";
import { ILAN_TYPES, INSTITUTION_TYPES } from "@/lib/types";
import type { Preferences } from "@/lib/types";

const KEYWORD_SUGGESTIONS = ["hemşire", "büro personeli", "zabıta", "bilişim", "mühendis", "güvenlik", "şoför", "memur", "tekniker", "uzman yardımcısı", "destek personeli"];
const EXCLUDE_SUGGESTIONS = ["akademik", "öğretim üyesi", "askeri", "subay", "araştırma görevlisi"];

export default function TercihlerPage() {
  const { data, savePreferences, loading } = useAppState();
  const [form, setForm] = useState<Preferences | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.preferences && !form) setForm({ ...data.preferences });
  }, [data?.preferences, form]);

  const preview = useMemo(() => {
    if (!data || !form) return null;
    const { matched, excluded } = matchJobs(data.jobs, data.profile, form);
    return {
      visible: matched.length,
      strong: matched.filter((m) => m.match.status === "tam-uygun" || m.match.status === "uygun").length,
      urgent: matched.filter((m) => m.match.deadlineDays != null && m.match.deadlineDays >= 0 && m.match.deadlineDays <= 7).length,
      excluded: excluded.length,
    };
  }, [data, form]);

  if (!form || loading) return <p className="py-20 text-center text-sm text-slate-500">Kriterler yükleniyor…</p>;

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const toggleCity = (city: string) => {
    const has = form.cities.includes(city);
    set("cities", has ? form.cities.filter((c) => c !== city) : [...form.cities, city]);
  };

  const addRegion = (region: string) => {
    const regionCities = REGIONS[region] ?? [];
    set("cities", [...new Set([...form.cities, ...regionCities])]);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await savePreferences(form);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const filteredCities = CITIES.filter((c) => c.toLocaleLowerCase("tr").includes(cityQuery.toLocaleLowerCase("tr")));

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <Target className="h-4 w-4" /> İş kriterleri
          </p>
          <h1 className="mt-1.5 text-[21px] font-bold tracking-tight sm:text-[26px] text-ink-900">Nasıl bir iş arıyorsun?</h1>
          <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-slate-500">
            Şehir, ilan türü, kurum türü ve anahtar kelimeler. Bu kriterler profille birleşip her ilan için uyum skorunu üretir.
          </p>
        </div>
        {preview ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="brand">{preview.visible} ilan görünür</Badge>
            <Badge tone="emerald">{preview.strong} güçlü uyum</Badge>
            <Badge tone="rose">{preview.urgent} acele</Badge>
            {preview.excluded ? <Badge tone="slate">{preview.excluded} gizlendi</Badge> : null}
          </div>
        ) : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="p-4 sm:p-5">
          <SectionTitle
            title="Şehir tercihi"
            subtitle={`${form.cities.length} il seçildi`}
            action={
              <Button size="sm" variant="ghost" onClick={() => set("cities", [])}>
                Temizle
              </Button>
            }
          />

          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            {([
              { value: "strict", label: "Sadece bu iller", desc: "Diğer illerdeki ilanlar gizlenir" },
              { value: "prefer", label: "Öncelikli iller", desc: "Bu illerdeki ilanlar öne çıkar" },
              { value: "any", label: "Tüm Türkiye", desc: "Şehir filtresi uygulanmaz" },
            ] as const).map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => set("cityMode", mode.value)}
                className={`focus-ring rounded-xl border px-3 py-2.5 text-left transition ${
                  form.cityMode === mode.value ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200" : "border-slate-200 bg-white hover:border-brand-300"
                }`}
              >
                <span className="block text-[12.5px] font-bold text-ink-900">{mode.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{mode.desc}</span>
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.keys(REGIONS).map((region) => (
              <Chip key={region} onClick={() => addRegion(region)}>
                + {region}
              </Chip>
            ))}
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} placeholder="İl ara…" className="pl-9" />
          </div>

          <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            {filteredCities.map((city) => (
              <Chip key={city} active={form.cities.includes(city)} onClick={() => toggleCity(city)}>
                <MapPin className="mr-1 inline h-3 w-3" />
                {city}
              </Chip>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <SectionTitle title="İlan türü" subtitle="Hangi statülerde çalışmak istersin?" />
            <div className="flex flex-wrap gap-1.5">
              {ILAN_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  active={form.ilanTypes.includes(t.value)}
                  onClick={() => set("ilanTypes", form.ilanTypes.includes(t.value) ? form.ilanTypes.filter((v) => v !== t.value) : [...form.ilanTypes, t.value])}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle title="Kurum türü" subtitle="Hangi kurumlar öncelikli?" />
            <div className="flex flex-wrap gap-1.5">
              {INSTITUTION_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  active={form.institutionTypes.includes(t.value)}
                  onClick={() =>
                    set(
                      "institutionTypes",
                      form.institutionTypes.includes(t.value)
                        ? form.institutionTypes.filter((v) => v !== t.value)
                        : [...form.institutionTypes, t.value],
                    )
                  }
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle title="Kelime filtreleri" subtitle="Başlık ve ilan metninde aranır" />
            <div className="space-y-3.5">
              <Field label="Aranan kelimeler" hint="ör. hemşire, zabıta">
                <TagInput value={form.titleKeywords} onChange={(v) => set("titleKeywords", v)} placeholder="Kelime ekle…" suggestions={KEYWORD_SUGGESTIONS} />
              </Field>
              <Field label="Hariç tutulan kelimeler" hint="bu kelimeleri içeren ilanlar gizlenir">
                <TagInput value={form.excludeKeywords} onChange={(v) => set("excludeKeywords", v)} placeholder="Kelime ekle…" suggestions={EXCLUDE_SUGGESTIONS} />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <SectionTitle title="İnce ayar" subtitle="Listeyi daraltan eşikler" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="En az kadro sayısı" hint="0 = sınırsız">
            <Input type="number" min={0} value={form.minPositions} onChange={(e) => set("minPositions", Number(e.target.value) || 0)} />
          </Field>
          <Field label="Son başvuru en geç kaç gün içinde?" hint="boş bırak = sınırsız">
            <Input
              type="number"
              min={1}
              value={form.maxDeadlineDays ?? ""}
              onChange={(e) => set("maxDeadlineDays", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="ör. 30"
            />
          </Field>
          <Field label="Sıralama">
            <Select value={form.sortBy} onChange={(e) => set("sortBy", e.target.value as Preferences["sortBy"])}>
              <option value="score">Uyum skoruna göre</option>
              <option value="deadline">Son başvuru tarihine göre</option>
              <option value="newest">En yeni ilanlar</option>
              <option value="positions">Kadro sayısına göre</option>
            </Select>
          </Field>
          <Field label={`Minimum uyum skoru: %${form.minMatchScore}`}>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={form.minMatchScore}
              onChange={(e) => set("minMatchScore", Number(e.target.value))}
              className="focus-ring mt-3 w-full accent-brand-600"
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={form.hideUnknownRequirements}
            onChange={(v) => set("hideUnknownRequirements", v)}
            label="Şartları belirsiz ilanları gizle"
            description="İlan metni okunamayan (sadece başlığı olan) kayıtları listede gösterme."
          />
          <Toggle
            checked={form.includeDemoData}
            onChange={(v) => set("includeDemoData", v)}
            label="Örnek ilanları göster"
            description="Canlı kaynaklara erişilemediğinde yüklenen örnek kayıtlar (rozetle işaretli)."
          />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur lg:bottom-0 lg:left-64 xl:left-72">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="hidden items-center gap-2 text-[12.5px] text-slate-500 sm:flex">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {saved ? <Badge tone="emerald">Kaydedildi · liste güncellendi</Badge> : "Değişiklikleri kaydet"}
          </p>
          <div className="flex flex-1 gap-2">
            <Link href="/ilanlar">
              <Button variant="outline">İlanları gör</Button>
            </Link>
            <Button className="flex-1 sm:flex-none" icon={<Save className="h-4 w-4" />} disabled={saving} onClick={() => void submit()}>
              {saving ? "Kaydediliyor…" : "Kriterleri kaydet"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
