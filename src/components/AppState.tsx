"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardPayload } from "@/lib/payload";
import type { ApplicationRecord } from "@/lib/store";
import type { MatchedJob } from "@/lib/match";
import type { ApplicationStatus, DocumentItem, JobRecord, Preferences, Profile } from "@/lib/types";

type Toast = { id: number; message: string; kind: "ok" | "warn" | "error" };

export type ImportResult = {
  imported: number;
  inserted: number;
  updated: number;
  preview: { title: string; institution: string | null; applicationEnd: string | null; kadroCount: number | null; cities: string[] }[];
};

type State = {
  data: DashboardPayload | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  toasts: Toast[];
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  refresh: () => Promise<void>;
  sync: (enrichLimit?: number) => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
  savePreferences: (patch: Partial<Preferences>) => Promise<void>;
  setApplication: (
    jobKey: string,
    patch: {
      status?: ApplicationStatus;
      note?: string;
      documents?: DocumentItem[];
      reminderDate?: string | null;
      appliedAt?: string | null;
      examDate?: string | null;
      resultNote?: string | null;
      remove?: boolean;
    },
  ) => Promise<void>;
  updateJobText: (jobKey: string, rawText: string, title?: string) => Promise<JobRecord | null>;
  enrichJobDetail: (jobKey: string) => Promise<void>;
  analyzePaste: (payload: { title: string; text: string; institution?: string; sourceUrl?: string }) => Promise<MatchedJob | null>;
  importList: (content: string, sourceUrl?: string) => Promise<ImportResult | null>;
  deleteJob: (jobKey: string) => Promise<void>;
};

const AppStateContext = createContext<State | null>(null);

export function useAppState(): State {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState, StateProvider içinde kullanılmalı");
  return ctx;
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    if (!res.ok) throw new Error(`Veri alınamadı (HTTP ${res.status})`);
    return (await res.json()) as DashboardPayload;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await load();
      setData(payload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sync = useCallback(
    async (enrichLimit = 0) => {
      setSyncing(true);
      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrichLimit }),
        });
        const json = (await res.json()) as DashboardPayload & { summary?: { outcomes: { label: string; status: string; message: string }[] } };
        setData(json);
        setError(null);
        const ok = json.summary?.outcomes?.filter((o) => o.status === "ok") ?? [];
        pushToast(
          ok.length
            ? `Güncellendi · ${ok.map((o) => o.label).join(", ")} · ${json.stats?.visible ?? 0} uygun ilan`
            : "Kaynaklar şu an erişilemiyor, kayıtlı ilanlar gösteriliyor",
          ok.length ? "ok" : "warn",
        );
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Senkronizasyon hatası", "error");
      } finally {
        setSyncing(false);
      }
    },
    [pushToast],
  );

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { profile: Profile };
      setData((prev) => (prev ? { ...prev, profile: json.profile } : prev));
      await refresh();
      pushToast("Profil kaydedildi, ilanlar yeniden puanlandı");
    },
    [pushToast, refresh],
  );

  const savePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { preferences: Preferences };
      setData((prev) => (prev ? { ...prev, preferences: json.preferences } : prev));
      await refresh();
    },
    [refresh],
  );

  const setApplication = useCallback(
    async (
      jobKey: string,
      patch: {
        status?: ApplicationStatus;
        note?: string;
        documents?: DocumentItem[];
        reminderDate?: string | null;
        appliedAt?: string | null;
        examDate?: string | null;
        resultNote?: string | null;
        remove?: boolean;
      },
    ) => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey, ...patch, delete: patch.remove }),
      });
      const json = (await res.json()) as { applications: ApplicationRecord[] };
      const applications = Object.fromEntries(json.applications.map((a) => [a.jobKey, a])) as Record<string, ApplicationRecord>;
      setData((prev) => (prev ? { ...prev, applications, stats: { ...prev.stats, saved: json.applications.length } } : prev));
    },
    [],
  );

  const updateJobText = useCallback(async (jobKey: string, rawText: string, title?: string) => {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobKey)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText, title }),
    });
    const json = (await res.json()) as { job?: JobRecord; error?: string };
    await refresh();
    return json.job ?? null;
  }, [refresh]);

  const enrichJobDetail = useCallback(
    async (jobKey: string) => {
      setSyncing(true);
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobKey)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrich: true }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        await refresh();
        pushToast(json.ok ? "Resmî detay çekildi, şartlar güncellendi" : `Detay alınamadı: ${json.message ?? "bilinmeyen hata"}`, json.ok ? "ok" : "warn");
      } finally {
        setSyncing(false);
      }
    },
    [pushToast, refresh],
  );

  const analyzePaste = useCallback(
    async (payload: { title: string; text: string; institution?: string; sourceUrl?: string }) => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { job: JobRecord; result: MatchedJob; error?: string };
      if (json.error) {
        pushToast(json.error, "error");
        return null;
      }
      await refresh();
      pushToast("İlan eklendi ve puanlandı");
      return json.result ?? null;
    },
    [pushToast, refresh],
  );

  const importList = useCallback(
    async (content: string, sourceUrl?: string) => {
      setSyncing(true);
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, sourceUrl }),
        });
        const json = (await res.json()) as {
          imported?: number;
          inserted?: number;
          updated?: number;
          preview?: ImportResult["preview"];
          error?: string;
        } & DashboardPayload;
        if (json.error) {
          pushToast(json.error, "error");
          return null;
        }
        setData(json);
        pushToast(`${json.imported ?? 0} ilan içe aktarıldı · ${json.stats?.visible ?? 0} ilan kriterlerine uygun`);
        return {
          imported: json.imported ?? 0,
          inserted: json.inserted ?? 0,
          updated: json.updated ?? 0,
          preview: json.preview ?? [],
        };
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "İçe aktarma hatası", "error");
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [pushToast],
  );

  const deleteJob = useCallback(
    async (jobKey: string) => {
      await fetch(`/api/jobs/${encodeURIComponent(jobKey)}`, { method: "DELETE" });
      await refresh();
      pushToast("İlan kaldırıldı");
    },
    [pushToast, refresh],
  );

  const value = useMemo<State>(
    () => ({
      data,
      loading,
      syncing,
      error,
      toasts,
      pushToast,
      refresh,
      sync,
      saveProfile,
      savePreferences,
      setApplication,
      updateJobText,
      enrichJobDetail,
      analyzePaste,
      importList,
      deleteJob,
    }),
    [data, loading, syncing, error, toasts, pushToast, refresh, sync, saveProfile, savePreferences, setApplication, updateJobText, enrichJobDetail, analyzePaste, importList, deleteJob],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function Toasts() {
  const { toasts } = useAppState();
  return (
    <div className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[70] flex w-[min(94vw,28rem)] -translate-x-1/2 flex-col gap-2 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-pop pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
            t.kind === "error"
              ? "bg-rose-600 text-white ring-rose-700"
              : t.kind === "warn"
                ? "bg-amber-500 text-white ring-amber-600"
                : "bg-ink-900 text-white ring-ink-700"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
