"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  Flame,
  GraduationCap,
  Radar,
  RefreshCw,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { useAppState } from "@/components/AppState";
import { JobsList } from "@/components/JobsList";
import { SourceBanner } from "@/components/SourceBanner";
import { Badge, Button, Card, SectionTitle, Skeleton, StatTile } from "@/components/ui";
import { deadlineLabel, formatDate, relativeTime, scoreColor } from "@/lib/format";
import { ageFromBirthDate } from "@/lib/match";
import { EDUCATION_LABELS } from "@/lib/types";
import type { EducationLevel } from "@/lib/types";

export default function DashboardPage() {
  const { data, loading, syncing, sync, error } = useAppState();

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const profile = data?.profile;
  const stats = data?.stats;
  const age = ageFromBirthDate(profile?.birthDate);
  const urgent = (data?.matched ?? [])
    .filter((m) => m.match.deadlineDays != null && m.match.deadlineDays >= 0)
    .sort((a, b) => (a.match.deadlineDays ?? 999) - (b.match.deadlineDays ?? 999))
    .slice(0, 6);
  const top = (data?.matched ?? []).slice(0, 3);
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="animate-rise relative overflow-hidden rounded-3xl bg-ink-950 p-4 text-white sm:p-6 lg:p-8">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-300">
              <Radar className="h-4 w-4" /> Kamu ilan radarı
            </p>
            <h1 className="mt-2.5 text-[clamp(1.45rem,6.2vw,2.4rem)] font-bold leading-[1.12] tracking-tight sm:mt-3">
              {profile?.fullName ? `Merhaba ${profile.fullName.split(" ")[0]},` : "Merhaba,"} bugün{" "}
              <span className="text-brand-300">{stats?.strong ?? 0} ilan</span> sana uygun görünüyor.
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-300">
              Resmî kamu ilanları profilinle karşılaştırıldı. {stats?.urgent ?? 0} ilanın başvurusu 7 gün içinde kapanıyor.
            </p>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {profile?.kpssScore ? <Badge tone="brand">{profile.kpssType || "KPSS"} · {profile.kpssScore} puan</Badge> : <Badge tone="amber">KPSS puanı girilmedi</Badge>}
              {profile?.educationLevel ? <Badge tone="brand">{EDUCATION_LABELS[profile.educationLevel as EducationLevel]}</Badge> : null}
              {age != null ? <Badge tone="brand">{age} yaş</Badge> : null}
              {profile?.gender ? <Badge tone="brand">{profile.gender === "kadin" ? "Kadın" : "Erkek"}</Badge> : null}
              {profile?.homeCity ? <Badge tone="brand">{profile.homeCity}</Badge> : null}
              {(data?.preferences.cities ?? []).length ? (
                <Badge tone="teal">Hedef: {(data?.preferences.cities ?? []).slice(0, 3).join(", ")}</Badge>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2 lg:flex lg:flex-wrap">
            <Link href="/hizli" className="flex">
              <Button size="lg" className="flex-1 lg:flex-none" icon={<Zap className="h-4 w-4" />}>
                Hızlı başvuru modu
              </Button>
            </Link>
            <Link href="/ilanlar" className="flex">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-white/25 bg-white/10 text-white hover:border-white/40 hover:text-white lg:flex-none"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                İlanları incele
              </Button>
            </Link>
            <Link href="/profil" className="flex">
              <Button size="lg" variant="ghost" className="flex-1 text-slate-300 hover:bg-white/10 hover:text-white lg:flex-none" icon={<UserRound className="h-4 w-4" />}>
                Profil
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <Card className="flex items-center gap-3 border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-[13px] text-rose-800">{error}</p>
        </Card>
      ) : null}

      <SourceBanner />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <StatTile label="Sana uygun ilan" value={stats?.strong ?? 0} hint={`${stats?.visible ?? 0} ilan kriterlerinden geçti`} tone="brand" icon={<Target className="h-4 w-4" />} />
        <StatTile label="7 gün içinde kapanıyor" value={stats?.urgent ?? 0} hint="Önce bunlara başvur" tone="rose" icon={<Flame className="h-4 w-4" />} />
        <StatTile label="Takip listende" value={stats?.saved ?? 0} hint="Kaydedilen ilanlar" tone="amber" icon={<Clock3 className="h-4 w-4" />} />
        <StatTile label="Başvuru yaptın" value={stats?.applied ?? 0} hint="Başvuruldu olarak işaretlenen" tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section>
          <SectionTitle
            title="En uygun ilanlar"
            subtitle="Uyum skoruna göre sıralandı"
            action={
              <Link href="/ilanlar">
                <Button size="sm" variant="outline" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Tümü
                </Button>
              </Link>
            }
          />
          <JobsList limit={4} showFilters={false} />
        </section>

        <div className="space-y-6">
          <section>
            <SectionTitle title="Kapanmak üzere" subtitle="Son başvuru tarihine göre" />
            <Card className="divide-y divide-slate-100">
              {urgent.length ? (
                urgent.map((m) => (
                  <Link key={m.job.sourceKey} href="/ilanlar" className="focus-ring flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink-900">{m.job.institution ?? m.job.title}</span>
                      <span className="block truncate text-[12px] text-slate-500">{m.job.title}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className={`text-[11.5px] font-bold ${m.match.deadlineDays! <= 3 ? "text-rose-600" : "text-amber-600"}`}>
                          {deadlineLabel(m.job.applicationEnd)}
                        </span>
                        <span className="text-[11px] text-slate-400">· {formatDate(m.job.applicationEnd)}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 text-[13px] font-bold tabular-nums ${scoreColor(m.match.score)}`}>%{m.match.score}</span>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-[12.5px] text-slate-500">Yakın tarihte kapanan ilan görünmüyor.</p>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle title="İlk 3 öneri" subtitle="Hemen göz at" />
            <Card className="divide-y divide-slate-100">
              {top.length ? (
                top.map((m) => (
                  <div key={m.job.sourceKey} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-[12px] font-bold text-brand-700">
                      %{m.match.score}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink-900">{m.job.institution ?? m.job.title}</span>
                      <span className="block truncate text-[12px] text-slate-500">
                        {m.job.kadroCount ? `${m.job.kadroCount} kadro · ` : ""}
                        {m.job.cities.slice(0, 2).join(", ") || "şehir bilgisi yok"}
                      </span>
                    </span>
                    <Link href="/ilanlar">
                      <Button size="sm" variant="ghost" icon={<Sparkles className="h-3.5 w-3.5" />}>
                        Aç
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-[12.5px] text-slate-500">
                  Henüz ilan yok.{" "}
                  <button type="button" className="font-semibold text-brand-600 underline" onClick={() => void sync(0)}>
                    Şimdi tara
                  </button>
                </p>
              )}
            </Card>
          </section>


        </div>
      </div>
    </div>
  );
}
