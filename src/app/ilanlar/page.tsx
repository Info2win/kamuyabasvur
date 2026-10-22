"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, RefreshCw, Zap } from "lucide-react";
import { useAppState } from "@/components/AppState";
import { JobsList } from "@/components/JobsList";
import { SourceBanner } from "@/components/SourceBanner";
import { Badge, Button } from "@/components/ui";

export default function IlanlarPage() {
  const { data, syncing, sync } = useAppState();
  const [tab, setTab] = useState<"onemli" | "tumu" | "gizli">("onemli");

  const stats = data?.stats;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <LayoutGrid className="h-4 w-4" /> İlan havuzu
          </p>
          <h1 className="mt-1.5 text-[21px] font-bold tracking-tight sm:text-[26px] text-ink-900">Sana uygun kamu ilanları</h1>
          <p className="mt-1 text-[13.5px] text-slate-500">
            Toplam {stats?.total ?? 0} ilan tarandı · <b className="text-brand-700">{stats?.visible ?? 0}</b> tanesi kriterlerinden geçti ·{" "}
            {stats?.liveCount ?? 0} canlı, {stats?.demoCount ?? 0} örnek kayıt
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/hizli">
            <Button icon={<Zap className="h-4 w-4" />}>Hızlı mod</Button>
          </Link>
          <Button variant="outline" icon={<RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />} disabled={syncing} onClick={() => void sync(0)}>
            Yeniden tara
          </Button>
        </div>
      </header>

      <SourceBanner compact />

      <div className="flex flex-wrap items-center gap-2">
        {([
          { key: "onemli", label: "Uygun ilanlar" },
          { key: "tumu", label: "Tümü (kritersiz)" },
          { key: "gizli", label: "Gizlenenler" },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`focus-ring rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${
              tab === t.key ? "bg-ink-900 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        {tab === "gizli" ? <Badge tone="amber">Kriterlerin nedeniyle elenen ilanlar</Badge> : null}
      </div>

      {tab === "gizli" ? (
        <div className="space-y-3">
          {(data?.excluded ?? []).length ? (
            (data?.excluded ?? []).map((m) => (
              <div key={m.job.sourceKey} className="rounded-2xl border border-slate-200 bg-white p-4 opacity-90">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink-900">{m.job.title}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">{m.job.institution}</p>
                  </div>
                  <Badge tone="rose">{m.excludeReason ?? "Gizlendi"}</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-[13px] text-slate-500">
              Kriterlerin hiçbir ilanı elemiyor.
            </p>
          )}
        </div>
      ) : (
        <JobsList includeExcluded={tab === "tumu"} />
      )}
    </div>
  );
}
