import type { MatchedJob } from "@/lib/match";
import type { ApplicationRecord, ApplicationStatus, DashboardPayload, DocumentItem, JobRecord, Preferences, Profile } from "@/lib/types";
import {
  clientAnalyzePaste,
  clientDeleteJob,
  clientEnrichJob,
  clientGetDashboard,
  clientImportList,
  clientReset,
  clientSavePreferences,
  clientSaveProfile,
  clientSaveSettings,
  clientSetApplication,
  clientSync,
  clientUpdateJobText,
} from "./client/api";
import type { ClientSettings } from "./client/db";

/**
 * Uygulama veritabanı kullanmaz: tüm veriler tarayıcıda (localStorage) saklanır.
 * Bu sayede GitHub Pages gibi statik barındırmada ve `npm run dev` ile yerelde
 * hiçbir kurulum yapmadan çalışır.
 */
export const IS_STATIC = true;

export type ApplicationPatch = {
  status?: ApplicationStatus;
  note?: string;
  documents?: DocumentItem[];
  reminderDate?: string | null;
  appliedAt?: string | null;
  examDate?: string | null;
  resultNote?: string | null;
  remove?: boolean;
};

export type AnalyzeInput = { title: string; text: string; institution?: string; sourceUrl?: string };

export type ImportResult = {
  imported: number;
  inserted: number;
  updated: number;
  preview: { title: string; institution: string | null; applicationEnd: string | null; kadroCount: number | null; cities: string[] }[];
  error?: string;
};

export type DataApi = {
  isStatic: boolean;
  getDashboard: () => Promise<DashboardPayload>;
  sync: (enrichLimit?: number) => Promise<{ payload: DashboardPayload; outcomes?: { label: string; status: string; message: string }[] }>;
  saveProfile: (patch: Partial<Profile>) => Promise<DashboardPayload>;
  savePreferences: (patch: Partial<Preferences>) => Promise<DashboardPayload>;
  saveSettings: (patch: Partial<ClientSettings>) => Promise<DashboardPayload>;
  setApplication: (jobKey: string, patch: ApplicationPatch) => Promise<DashboardPayload>;
  updateJobText: (jobKey: string, rawText: string, title?: string) => Promise<{ payload: DashboardPayload; job: JobRecord | null }>;
  enrichJob: (jobKey: string) => Promise<{ ok: boolean; message?: string; payload: DashboardPayload }>;
  analyzePaste: (input: AnalyzeInput) => Promise<{ result: MatchedJob | null; payload: DashboardPayload; error?: string }>;
  importList: (content: string, sourceUrl?: string) => Promise<ImportResult & { payload: DashboardPayload }>;
  deleteJob: (jobKey: string) => Promise<DashboardPayload>;
  reset: (seedDemo?: boolean) => Promise<DashboardPayload>;
};

const dataApi: DataApi = {
  isStatic: true,
  getDashboard: () => clientGetDashboard(),
  async sync() {
    const { payload } = await clientSync();
    return { payload, outcomes: payload.logs.slice(0, 4).map((l) => ({ label: l.source, status: l.status, message: l.message ?? "" })) };
  },
  saveProfile: (patch) => clientSaveProfile(patch),
  savePreferences: (patch) => clientSavePreferences(patch),
  saveSettings: (patch) => clientSaveSettings(patch),
  setApplication: (jobKey, patch) => clientSetApplication(jobKey, patch),
  async updateJobText(jobKey, rawText, title) {
    const payload = await clientUpdateJobText(jobKey, rawText, title);
    return { payload, job: payload.jobs.find((j) => j.sourceKey === jobKey) ?? null };
  },
  enrichJob: () => clientEnrichJob(),
  analyzePaste: (input) => clientAnalyzePaste(input),
  importList: (content, sourceUrl) => clientImportList(content, sourceUrl),
  deleteJob: (jobKey) => clientDeleteJob(jobKey),
  reset: (seedDemo = true) => clientReset(seedDemo),
};

/** Arayüzün kullandığı tek giriş noktası. */
export async function getDataApi(): Promise<DataApi> {
  return dataApi;
}

export type { ApplicationRecord, DashboardPayload };
