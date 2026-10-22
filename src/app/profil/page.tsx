"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, Save, Sparkles, UserRound, Wrench } from "lucide-react";
import { useAppState } from "@/components/AppState";
import { Badge, Button, Card, Field, Input, SectionTitle, Select, TagInput, Toggle } from "@/components/ui";
import { CITIES } from "@/lib/cities";
import { ageFromBirthDate } from "@/lib/match";
import { EDUCATION_LABELS, KPSS_TYPES } from "@/lib/types";
import type { EducationLevel, Profile } from "@/lib/types";

const DEPARTMENT_SUGGESTIONS = [
  "Hemşirelik", "Ebelik", "Kamu Yönetimi", "İşletme", "İktisat", "Maliye", "Hukuk",
  "Bilgisayar Mühendisliği", "İnsan Kaynakları Yönetimi", "Çocuk Gelişimi", "Psikoloji",
  "Sosyal Hizmet", "Büro Yönetimi ve Yönetici Asistanlığı", "Tıbbi Dokümantasyon ve Sekreterlik",
  "İlk ve Acil Yardım", "Anestezi", "Fizyoterapi ve Rehabilitasyon", "Beslenme ve Diyetetik",
  "İlahiyat", "Türkçe Öğretmenliği", "Sınıf Öğretmenliği", "Okul Öncesi Öğretmenliği",
  "Muhasebe ve Vergi Uygulamaları", "Bilgisayar Programcılığı", "Elektrik", "Makine", "İnşaat Teknolojisi",
];

const CERTIFICATE_SUGGESTIONS = ["Bilgisayar işletmenliği (MEB onaylı)", "F klavye", "Özel güvenlik kimlik kartı", "İlk yardım sertifikası", "İngilizce YDS"];

export default function ProfilPage() {
  const { data, saveProfile, loading } = useAppState();
  const [form, setForm] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.profile && !form) setForm({ ...data.profile });
  }, [data?.profile, form]);

  const age = useMemo(() => ageFromBirthDate(form?.birthDate), [form?.birthDate]);

  if (!form || loading) {
    return <p className="py-20 text-center text-sm text-slate-500">Profil yükleniyor…</p>;
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await saveProfile(form);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header>
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <UserRound className="h-4 w-4" /> Aday profili
        </p>
        <h1 className="mt-1.5 text-[21px] font-bold tracking-tight sm:text-[26px] text-ink-900">Bilgilerini bir kez gir, her ilanda otomatik kontrol edilsin</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-slate-500">
          KPSS puanın, öğrenim durumun, yaşın, cinsiyetin ve belgelerin; her ilanın şartlarıyla karşılaştırılır. Bilgileri güncellediğinde tüm ilanlar anında yeniden puanlanır.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {age != null ? <Badge tone="brand">{age} yaş (otomatik hesaplandı)</Badge> : <Badge tone="amber">Doğum tarihi girilmedi</Badge>}
          {form.kpssScore ? <Badge tone="emerald">{form.kpssType || "KPSS"} {form.kpssScore}</Badge> : <Badge tone="rose">KPSS puanı yok</Badge>}
          {form.educationLevel ? <Badge tone="brand">{EDUCATION_LABELS[form.educationLevel as EducationLevel]}</Badge> : null}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionTitle title="Kişisel bilgiler" subtitle="Yaş ve cinsiyet şartları buradan kontrol edilir" />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Ad soyad" className="sm:col-span-2">
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="ör. Ayşe Yılmaz" />
            </Field>
            <Field label="Doğum tarihi" hint={age != null ? `${age} yaş` : undefined}>
              <Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
            </Field>
            <Field label="Cinsiyet">
              <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Belirtmek istemiyorum</option>
                <option value="kadin">Kadın</option>
                <option value="erkek">Erkek</option>
              </Select>
            </Field>
            <Field label="İkamet ettiğin il">
              <Select value={form.homeCity} onChange={(e) => set("homeCity", e.target.value)}>
                <option value="">Seçilmedi</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Medeni durum">
              <Select value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
                <option value="">Belirtilmedi</option>
                <option value="bekar">Bekâr</option>
                <option value="evli">Evli</option>
              </Select>
            </Field>
            <Field label="Telefon">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="05xx xxx xx xx" />
            </Field>
            <Field label="E-posta">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ornek@eposta.com" />
            </Field>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle title="Eğitim" subtitle="Öğrenim seviyesi ve mezun olunan bölüm" />
          <div className="grid gap-3.5">
            <Field label="Öğrenim seviyesi">
              <Select value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value as EducationLevel)}>
                <option value="">Seçilmedi</option>
                {(Object.keys(EDUCATION_LABELS) as EducationLevel[]).map((level) => (
                  <option key={level} value={level}>{EDUCATION_LABELS[level]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Mezun olunan bölüm(ler)" hint="virgülle ayır">
              <TagInput value={form.departments} onChange={(v) => set("departments", v)} placeholder="ör. Hemşirelik, Çocuk Gelişimi" suggestions={DEPARTMENT_SUGGESTIONS} />
            </Field>
            <Field label="Alan / uzmanlık açıklaması" hint="ör. yoğun bakım deneyimi">
              <Input value={form.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} placeholder="Kısa açıklama" />
            </Field>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle title="KPSS bilgileri" subtitle="Puan, puan türü ve sınav yılı" />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="KPSS puanı (asıl)">
              <Input type="number" min={0} max={100} value={form.kpssScore ?? ""} onChange={(e) => set("kpssScore", e.target.value === "" ? null : Number(e.target.value))} placeholder="ör. 81" />
            </Field>
            <Field label="Puan türü">
              <Select value={form.kpssType} onChange={(e) => set("kpssType", e.target.value)}>
                <option value="">Seçilmedi</option>
                {KPSS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sınav yılı">
              <Input type="number" min={2000} max={2030} value={form.kpssYear ?? ""} onChange={(e) => set("kpssYear", e.target.value === "" ? null : Number(e.target.value))} placeholder="2024" />
            </Field>
            <Field label="İkinci puan (varsa)">
              <Input type="number" min={0} max={100} value={form.kpssScoreSecondary ?? ""} onChange={(e) => set("kpssScoreSecondary", e.target.value === "" ? null : Number(e.target.value))} placeholder="ör. 76" />
            </Field>
            <Field label="İkinci puan türü">
              <Select value={form.kpssTypeSecondary} onChange={(e) => set("kpssTypeSecondary", e.target.value)}>
                <option value="">Seçilmedi</option>
                {KPSS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle title="Diğer şartlar" subtitle="Ehliyet, deneyim, sertifikalar" />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Sürücü belgesi">
              <Select value={form.driverLicense} onChange={(e) => set("driverLicense", e.target.value)}>
                <option value="">Yok</option>
                <option value="B sınıfı">B sınıfı</option>
                <option value="A sınıfı">A sınıfı</option>
                <option value="C sınıfı">C sınıfı</option>
                <option value="CE sınıfı">CE sınıfı</option>
                <option value="D sınıfı">D sınıfı</option>
              </Select>
            </Field>
            <Field label="Askerlik durumu">
              <Select value={form.militaryStatus} onChange={(e) => set("militaryStatus", e.target.value)}>
                <option value="">Geçerli değil / belirtilmedi</option>
                <option value="yapti">Yaptı</option>
                <option value="muaf">Muaf</option>
                <option value="tecilli">Tecilli</option>
                <option value="yapmadi">Yapmadı</option>
              </Select>
            </Field>
            <Field label="İş deneyimi (yıl)">
              <Input type="number" min={0} max={40} value={form.experienceYears ?? 0} onChange={(e) => set("experienceYears", Number(e.target.value) || 0)} />
            </Field>
            <Field label="Yabancı diller" hint="virgülle ayır">
              <TagInput value={form.languages} onChange={(v) => set("languages", v)} placeholder="İngilizce" suggestions={["İngilizce", "Almanca", "Arapça", "Fransızca"]} />
            </Field>
            <Field label="Sertifikalar / belgeler" className="sm:col-span-2">
              <TagInput value={form.certificates} onChange={(v) => set("certificates", v)} placeholder="ör. F klavye, bilgisayar işletmenliği" suggestions={CERTIFICATE_SUGGESTIONS} />
            </Field>
            <div className="sm:col-span-2">
              <Toggle
                checked={Boolean(form.disability)}
                onChange={(v) => set("disability", v)}
                label="Engelli kontenjanından başvurabiliyorum"
                description="Engelli personel alımlarında ek ilanlar eşleşir."
              />
            </div>
            <Field label="Kendi notların" className="sm:col-span-2" hint="sadece sende kalır">
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="ör. Ankara dışına taşınabilirim" />
            </Field>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur lg:bottom-0 lg:left-64 xl:left-72">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="hidden items-center gap-2 text-[12.5px] text-slate-500 sm:flex">
            {saved ? (
              <Badge tone="emerald"><Sparkles className="h-3 w-3" /> Kaydedildi · ilanlar yeniden puanlandı</Badge>
            ) : (
              <span className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Değişiklikleri kaydetmeyi unutma
              </span>
            )}
          </p>
          <div className="flex flex-1 gap-2">
            <Link href="/tercihler">
              <Button variant="outline" icon={<GraduationCap className="h-4 w-4" />}>
                İş kriterlerim
              </Button>
            </Link>
            <Button className="flex-1 sm:flex-none" icon={<Save className="h-4 w-4" />} disabled={saving} onClick={() => void submit()}>
              {saving ? "Kaydediliyor…" : "Profili kaydet"}
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
