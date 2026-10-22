"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getDataApi, IS_STATIC } from "@/lib/dataApi";
import type { AnalyzeInput, ApplicationPatch, DataApi, ImportResult } from "@/lib/dataApi";
import type { MatchedJob } from "@/lib/match";
import type { JobRecord, ApplicationRecord, DashboardPayload } from "@/lib/types";

type Toast = { id: number; message: string; kind: "ok" | "warn" | "error" };

export type { ImportResult };

type State = {
  data: DashboardPayload | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  isStatic: boolean;
  toasts: Toast[];
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  refresh: () => Promise<void>;
  sync: (enrichLimit?: number) => Promise<void>;
  saveProfile: (patch: Record<string, unknown>) => Promise<void>;
  savePreferences: (patch: Record<string, unknown>) => Promise<void>;
  saveSettings: (patch: Record<string, unknown>) => Promise<void>;
  setApplication: (jobKey: string, patch: ApplicationPatch) => Promise<void>;
  updateJobText: (jobKey: string, rawText: string, title?: string) => Promise<JobRecord | null>;
  enrichJobDetail: (jobKey: string) => Promise<void>;
  analyzePaste: (payload: AnalyzeInput) => Promise<MatchedJob | null>;
  importList: (content: string, sourceUrl?: string) => Promise<ImportResult | null>;
  deleteJob: (jobKey: string) => Promise<void>;
  resetData: (seedDemo?: boolean) => Promise<void>;
};

const AppStateContext = createContext<State | null>(null);

export function useAppState(): State {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState, StateProvider içinde kullanılmalı");
  return ctx;
}

let apiPromise: Promise<DataApi> | null = null;
function api(): Promise<DataApi> {
  if (!apiPromise) apiPromise = getDataApi();
  return apiPromise;
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
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4600);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const client = await api();
      setData(await client.getDashboard());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sync = useCallback(
    async (enrichLimit = 0) => {
      setSyncing(true);
      try {
        const client = await api();
        const { payload, outcomes } = await client.sync(enrichLimit);
        setData(payload);
        setError(null);
        const ok = (outcomes ?? []).filter((o) => o.status === "ok");
        pushToast(
          ok.length
            ? `İlan listesi güncellendi · ${payload.stats.visible} ilan sana uygun`
            : "Şu an yeni ilan alınamadı — kayıtlı ilanların duruyor",
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
    async (patch: Record<string, unknown>) => {
      const client = await api();
      setData(await client.saveProfile(patch as never));
      pushToast("Profil kaydedildi, ilanlar yeniden puanlandı");
    },
    [pushToast],
  );

  const savePreferences = useCallback(async (patch: Record<string, unknown>) => {
    const client = await api();
    setData(await client.savePreferences(patch as never));
  }, []);

  const saveSettings = useCallback(async (patch: Record<string, unknown>) => {
    const client = await api();
    setData(await client.saveSettings(patch as never));
  }, []);

  const setApplication = useCallback(async (jobKey: string, patch: ApplicationPatch) => {
    const client = await api();
    setData(await client.setApplication(jobKey, patch));
  }, []);

  const updateJobText = useCallback(async (jobKey: string, rawText: string, title?: string) => {
    const client = await api();
    const { payload, job } = await client.updateJobText(jobKey, rawText, title);
    setData(payload);
    return job;
  }, []);

  const enrichJobDetail = useCallback(
    async (jobKey: string) => {
      setSyncing(true);
      try {
        const client = await api();
        const result = await client.enrichJob(jobKey);
        setData(result.payload);
        pushToast(
          result.ok ? "Resmî detay çekildi, şartlar güncellendi" : `Detay alınamadı: ${result.message ?? "bilinmeyen hata"}`,
          result.ok ? "ok" : "warn",
        );
      } finally {
        setSyncing(false);
      }
    },
    [pushToast],
  );

  const analyzePaste = useCallback(
    async (payloadInput: AnalyzeInput) => {
      const client = await api();
      const result = await client.analyzePaste(payloadInput);
      setData(result.payload);
      if (result.error) {
        pushToast(result.error, "error");
        return null;
      }
      pushToast("İlan eklendi ve puanlandı");
      return result.result;
    },
    [pushToast],
  );

  const importList = useCallback(
    async (content: string, sourceUrl?: string) => {
      setSyncing(true);
      try {
        const client = await api();
        const result = await client.importList(content, sourceUrl);
        setData(result.payload);
        if (result.error) {
          pushToast(result.error, "error");
          return null;
        }
        pushToast(`${result.imported} ilan listene eklendi · ${result.payload.stats.visible} ilan kriterlerine uygun`);
        return { imported: result.imported, inserted: result.inserted, updated: result.updated, preview: result.preview };
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "İlanlar eklenemedi", "error");
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [pushToast],
  );

  const deleteJob = useCallback(
    async (jobKey: string) => {
      const client = await api();
      setData(await client.deleteJob(jobKey));
      pushToast("İlan listeden çıkarıldı");
    },
    [pushToast],
  );

  const resetData = useCallback(
    async (seedDemo = true) => {
      const client = await api();
      setData(await client.reset(seedDemo));
      pushToast("İlan listesi temizlendi");
    },
    [pushToast],
  );

  const value = useMemo<State>(
    () => ({
      data,
      loading,
      syncing,
      error,
      isStatic: IS_STATIC,
      toasts,
      pushToast,
      refresh,
      sync,
      saveProfile,
      savePreferences,
      saveSettings,
      setApplication,
      updateJobText,
      enrichJobDetail,
      analyzePaste,
      importList,
      deleteJob,
      resetData,
    }),
    [
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
      saveSettings,
      setApplication,
      updateJobText,
      enrichJobDetail,
      analyzePaste,
      importList,
      deleteJob,
      resetData,
    ],
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
