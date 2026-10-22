"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useAppState } from "./AppState";
import { JobCard } from "./JobCard";
import { JobDetailPanel } from "./JobDetailPanel";
import { Badge, Button, Chip, EmptyState, Input, Select, Skeleton } from "./ui";
import { CITIES } from "@/lib/cities";
import { STATUS_LABEL } from "@/lib/format";
import type { MatchedJob } from "@/lib/match";

type StatusFilter = "all" | "tam-uygun" | "uygun" | "kismi" | "riskli" | "uygun-degil";

export function JobsList({
  limit,
  showFilters = true,
  includeExcluded = false,
  emptyTitle = "Kriterlerine uyan ilan yok",
  emptyDescription = "İş kriterlerini gevşetmeyi dene (şehir modu, minimum uyum skoru) veya yeni bir tarama başlat.",
  emptyAction,
}: {
  limit?: number;
  showFilters?: boolean;
  includeExcluded?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  const { data, loading, setApplication, sync, syncing } = useAppState();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<"all" | "live" | "demo">("all");
  const [hideApplied, setHideApplied] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const matched: MatchedJob[] = includeExcluded ? [...(data?.matched ?? []), ...(data?.excluded ?? [])] : (data?.matched ?? []);
  const applications = data?.applications ?? {};

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return matched.filter((m) => {
      if (status !== "all" && m.match.status !== status) return false;
      if (city && !m.job.cities.includes(city)) return false;
      if (source === "live" && m.job.isDemo) return false;
      if (source === "demo" && !m.job.isDemo) return false;
      const app = applications[m.job.sourceKey];
      if (hideApplied && app && ["applied", "exam", "result"].includes(app.status)) return false;
      if (!q) return true;
      const hay = `${m.job.title} ${m.job.institution ?? ""} ${m.job.category ?? ""} ${(m.job.rawText ?? "").slice(0, 4000)}`.toLocaleLowerCase("tr");
      return hay.includes(q);
    });
  }, [matched, query, status, city, source, hideApplied, applications]);

  const visible = limit ? filtered.slice(0, limit) : filtered;
  const openJob = openKey ? (matched.find((m) => m.job.sourceKey === openKey) ?? null) : null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: matched.length };
    for (const m of matched) c[m.match.status] = (c[m.match.status] ?? 0) + 1;
    return c;
  }, [matched]);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {showFilters ? (
        <div className="mb-4 space-y-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kurum, unvan, bölüm veya kelime ara…"
              className="pl-9"
              inputMode="search"
              autoCorrect="off"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="focus-ring absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:text-rose-600"
                aria-label="Aramayı temizle"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select value={city} onChange={(e) => setCity(e.target.value)} className="sm:w-auto sm:min-w-[10rem]">
              <option value="">Tüm şehirler</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="sm:w-auto sm:min-w-[9rem]">
              <option value="all">Tüm kaynaklar</option>
              <option value="live">Sadece canlı</option>
              <option value="demo">Sadece örnek</option>
            </Select>
            <div className="col-span-2 flex gap-2 sm:col-span-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setHideApplied((v) => !v)}
                className={`focus-ring flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition sm:min-h-0 sm:flex-none sm:px-3 sm:py-1.5 sm:text-xs ${
                  hideApplied ? "bg-brand-600 text-white" : "border border-slate-300 bg-white text-slate-600"
                }`}
              >
                <Check className="h-3.5 w-3.5" /> Başvurduklarımı gizle
              </button>
              <Button variant="outline" size="sm" className="min-h-11 shrink-0 sm:min-h-0" icon={<Filter className="h-4 w-4 sm:h-3.5 sm:w-3.5" />} disabled={syncing} onClick={() => void sync(0)}>
                Tara
              </Button>
            </div>
          </div>

          <div className="scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {(["all", "tam-uygun", "uygun", "kismi", "riskli", "uygun-degil"] as StatusFilter[]).map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {s === "all" ? `Tümü ${counts.all ?? 0}` : `${STATUS_LABEL[s]} ${counts[s] ?? 0}`}
              </Chip>
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Sıralama:{" "}
              {data?.preferences.sortBy === "score"
                ? "uyum skoru"
                : data?.preferences.sortBy === "deadline"
                  ? "son başvuru tarihi"
                  : data?.preferences.sortBy === "newest"
                    ? "en yeni"
                    : "kadro sayısı"}
            </span>
            <Link href="/tercihler" className="shrink-0 font-semibold text-brand-600 underline-offset-2 hover:underline">
              değiştir
            </Link>
          </p>
        </div>
      ) : null}

      {visible.length ? (
        <div className="space-y-3">
          {visible.map((m) => (
            <JobCard
              key={m.job.sourceKey}
              matched={m}
              application={applications[m.job.sourceKey]}
              onOpen={() => setOpenKey(m.job.sourceKey)}
              onSave={() =>
                applications[m.job.sourceKey]
                  ? void setApplication(m.job.sourceKey, { remove: true })
                  : void setApplication(m.job.sourceKey, { status: "saved" })
              }
              onApplied={() => void setApplication(m.job.sourceKey, { status: "applied", appliedAt: new Date().toISOString() })}
            />
          ))}
          {limit && filtered.length > limit ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-[12.5px] text-slate-500">
                {filtered.length - limit} ilan daha var
              </p>
              <Link href="/ilanlar">
                <Button variant="outline" size="sm">
                  Tüm listeyi aç
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title={emptyTitle}
          description={emptyDescription}
          action={
            emptyAction ?? (
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/tercihler">
                  <Button variant="outline" size="sm">
                    Kriterleri düzenle
                  </Button>
                </Link>
                <Button size="sm" disabled={syncing} onClick={() => void sync(0)}>
                  İlanları yeniden tara
                </Button>
              </div>
            )
          }
        />
      )}

      {data?.excluded?.length ? (
        <p className="mt-4 text-center text-[12px] text-slate-400">
          <Badge tone="slate">{data.excluded.length} ilan kriterlerin nedeniyle gizlendi</Badge>
        </p>
      ) : null}

      {openJob ? <JobDetailPanel matched={openJob} application={applications[openJob.job.sourceKey]} onClose={() => setOpenKey(null)} /> : null}
    </div>
  );
}
