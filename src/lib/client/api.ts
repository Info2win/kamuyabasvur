import { buildDocumentChecklist } from "@/lib/documents";
import { buildDemoJobs } from "@/lib/demo";
import { fetchKariyerRss } from "@/lib/kariyerRss";
import { matchJobs } from "@/lib/match";
import type { MatchedJob } from "@/lib/match";
import { rawToJob } from "@/lib/normalize";
import { parseApplicationMethods, parseDates, parseIlan, parseKadroCount, classifyIlanType, classifyInstitutionType } from "@/lib/parse";
import { extractCities } from "@/lib/cities";
import { importIlanList } from "@/lib/importer";
import {
  DEFAULT_SETTINGS,
  loadState,
  mergeJobs,
  mutateState,
  pushLog,
  saveState,
} from "./db";
import type { ClientSettings, PersistedState } from "./db";
import { DEFAULT_PREFERENCES, DEFAULT_PROFILE } from "@/lib/store-defaults";
import type { ApplicationStatus, DocumentItem, JobRecord, Preferences, Profile, ApplicationRecord, DashboardPayload } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function freshState(): PersistedState {
  return loadState({ profile: DEFAULT_PROFILE, preferences: DEFAULT_PREFERENCES });
}

function buildPayload(state: PersistedState, syncedJustNow = false): DashboardPayload {
  const visibleJobs = state.preferences.includeDemoData ? state.jobs : state.jobs.filter((j) => !j.isDemo);
  const { matched, excluded } = matchJobs(visibleJobs, state.profile, state.preferences);
  const applications: Record<string, ApplicationRecord> = {};
  for (const app of state.applications) {
    const withDocs = app.documents?.length ? app : { ...app, documents: buildDocs(state, app) };
    applications[app.jobKey] = withDocs;
  }

  return {
    profile: state.profile,
    preferences: state.preferences,
    matched,
    excluded,
    applications,
    jobs: state.jobs,
    logs: state.logs,
    syncedJustNow,
    stats: {
      total: visibleJobs.length,
      visible: matched.length,
      strong: matched.filter((m) => m.match.status === "tam-uygun" || m.match.status === "uygun").length,
      partial: matched.filter((m) => m.match.status === "kismi").length,
      risky: matched.filter((m) => m.match.status === "riskli" || m.match.status === "uygun-degil").length,
      urgent: matched.filter((m) => m.match.deadlineDays != null && m.match.deadlineDays >= 0 && m.match.deadlineDays <= 7).length,
      applied: state.applications.filter((a) => ["applied", "exam", "result"].includes(a.status)).length,
      saved: state.applications.length,
      demoCount: state.jobs.filter((j) => j.isDemo).length,
      liveCount: state.jobs.filter((j) => !j.isDemo).length,
    },
  };
}

function buildDocs(state: PersistedState, app: ApplicationRecord): DocumentItem[] {
  const job = state.jobs.find((j) => j.sourceKey === app.jobKey);
  return job ? buildDocumentChecklist(job, state.profile) : [];
}

/** Derleme/CI sırasında üretilen hazır ilan verisini çeker (aynı origin → CORS sorunu yok). */
async function fetchStaticData(settings: ClientSettings): Promise<{ jobs: JobRecord[]; message: string; ok: boolean }> {
  const url = settings.staticDataUrl.startsWith("http")
    ? settings.staticDataUrl
    : `${BASE}/${settings.staticDataUrl.replace(/^\//, "")}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { jobs: [], ok: false, message: "İlan listesi şu an alınamadı" };
    const json = (await res.json()) as { jobs?: JobRecord[]; generatedAt?: string };
    const jobs = Array.isArray(json.jobs) ? json.jobs : [];
    return { jobs, ok: jobs.length > 0, message: jobs.length ? `${jobs.length} güncel ilan` : "Şu an yeni ilan yok" };
  } catch (error) {
    return { jobs: [], ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/** İsteğe bağlı canlı akışı çeker (kapalıysa atlanır). */
async function fetchRssViaProxy(settings: ClientSettings): Promise<{ jobs: JobRecord[]; message: string; ok: boolean }> {
  const target = "https://kariyerkapisi.gov.tr/rss";
  const proxy = settings.proxyUrl.trim();
  if (!proxy) return { jobs: [], ok: false, message: "Canlı akış kapalı" };
  const url = proxy.includes("{url}") ? proxy.replace("{url}", encodeURIComponent(target)) : `${proxy}${encodeURIComponent(target)}`;
  const result = await fetchKariyerRss({ baseUrl: url, timeoutMs: 20_000 });
  if (result.error) return { jobs: [], ok: false, message: result.error };
  return { jobs: result.items.map((item) => rawToJob(item, "kariyer")), ok: true, message: `${result.items.length} güncel ilan` };
}

export type ClientSyncOptions = { enrichLimit?: number; seedDemo?: boolean; forceProxy?: boolean };

export async function clientSync(options?: ClientSyncOptions): Promise<{ state: PersistedState; payload: DashboardPayload }> {
  const started = Date.now();
  let state = freshState();
  const seedDemo = options?.seedDemo ?? state.settings.seedDemo;

  const staticResult = await fetchStaticData(state.settings);
  state = pushLog(state, {
    source: "İlan listesi",
    status: staticResult.ok ? "ok" : "empty",
    message: staticResult.message,
    found: staticResult.jobs.length,
    durationMs: Date.now() - started,
    createdAt: new Date().toISOString(),
  });

  const proxyResult = await fetchRssViaProxy(state.settings);
  state = pushLog(state, {
    source: "Resmî ilan akışı",
    status: proxyResult.ok ? "ok" : state.settings.proxyUrl ? "error" : "blocked",
    message: proxyResult.message,
    found: proxyResult.jobs.length,
    durationMs: Date.now() - started,
    createdAt: new Date().toISOString(),
  });

  const incoming = [...staticResult.jobs, ...proxyResult.jobs];
  let inserted = 0;
  let updated = 0;
  if (incoming.length) {
    const merged = mergeJobs(state.jobs, incoming);
    state = { ...state, jobs: merged.jobs };
    inserted = merged.inserted;
    updated = merged.updated;
  }

  const hasLive = state.jobs.some((j) => !j.isDemo);
  if (!hasLive && seedDemo) {
    const merged = mergeJobs(state.jobs, buildDemoJobs());
    state = { ...state, jobs: merged.jobs };
    inserted += merged.inserted;
    updated += merged.updated;
    state = pushLog(state, {
      source: "Örnek veri seti",
      status: "ok",
      message: "Gerçek ilanlar yüklenene kadar örnek ilanlar gösteriliyor ('Örnek ilan' rozetiyle).",
      found: merged.inserted,
      durationMs: Date.now() - started,
      createdAt: new Date().toISOString(),
    });
  }

  state = { ...state, settings: { ...state.settings, lastSyncAt: new Date().toISOString() } };
  state = pushLog(state, {
    source: "Özet",
    status: "ok",
    message: `${inserted} yeni, ${updated} güncellendi · listede ${state.jobs.length} ilan`,
    found: incoming.length,
    inserted,
    updated,
    durationMs: Date.now() - started,
    createdAt: new Date().toISOString(),
  });

  saveState(state);
  return { state, payload: buildPayload(state, true) };
}

export async function clientGetDashboard(): Promise<DashboardPayload> {
  let state = freshState();
  if (!state.jobs.length) {
    const synced = await clientSync();
    state = synced.state;
    return synced.payload;
  }
  return buildPayload(state);
}

export async function clientSaveProfile(patch: Partial<Profile>): Promise<DashboardPayload> {
  const state = mutateState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  return buildPayload(state);
}

export async function clientSavePreferences(patch: Partial<Preferences>): Promise<DashboardPayload> {
  const state = mutateState((prev) => ({ ...prev, preferences: { ...prev.preferences, ...patch } }));
  return buildPayload(state);
}

export async function clientSaveSettings(patch: Partial<ClientSettings>): Promise<DashboardPayload> {
  const state = mutateState((prev) => ({ ...prev, settings: { ...DEFAULT_SETTINGS, ...prev.settings, ...patch } }));
  return buildPayload(state);
}

export async function clientSetApplication(
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
): Promise<DashboardPayload> {
  const state = mutateState((prev) => {
    if (patch.remove) return { ...prev, applications: prev.applications.filter((a) => a.jobKey !== jobKey) };
    const job = prev.jobs.find((j) => j.sourceKey === jobKey);
    const existing = prev.applications.find((a) => a.jobKey === jobKey);
    const documents = patch.documents ?? existing?.documents ?? (job ? buildDocumentChecklist(job, prev.profile) : []);
    const record: ApplicationRecord = {
      id: existing?.id ?? (prev.applications.reduce((max, a) => Math.max(max, a.id), 0) + 1),
      jobKey,
      jobTitle: job?.title ?? existing?.jobTitle ?? null,
      institution: job?.institution ?? existing?.institution ?? null,
      status: patch.status ?? existing?.status ?? "saved",
      score: existing?.score ?? null,
      note: patch.note !== undefined ? patch.note : (existing?.note ?? null),
      documents,
      deadline: job?.applicationEnd ?? existing?.deadline ?? null,
      reminderDate: patch.reminderDate !== undefined ? patch.reminderDate : (existing?.reminderDate ?? null),
      savedAt: existing?.savedAt ?? new Date().toISOString(),
      appliedAt: patch.appliedAt !== undefined ? patch.appliedAt : patch.status === "applied" && !existing?.appliedAt ? new Date().toISOString() : (existing?.appliedAt ?? null),
      examDate: patch.examDate !== undefined ? patch.examDate : (existing?.examDate ?? null),
      resultNote: patch.resultNote !== undefined ? patch.resultNote : (existing?.resultNote ?? null),
      lastOpenedAt: new Date().toISOString(),
    };
    const others = prev.applications.filter((a) => a.jobKey !== jobKey);
    return { ...prev, applications: [record, ...others] };
  });
  return buildPayload(state);
}

/** Yapıştırılan ilan metnini çözümler ve kaydı günceller. */
export async function clientUpdateJobText(jobKey: string, rawText: string, title?: string): Promise<DashboardPayload> {
  const state = mutateState((prev) => ({
    ...prev,
    jobs: prev.jobs.map((job) => {
      if (job.sourceKey !== jobKey) return job;
      const nextTitle = (title ?? job.title).trim();
      const parsed = parseIlan({ title: nextTitle, text: rawText, category: job.category, parsedFrom: "yapistirilan" });
      const { methods, applyUrl } = parseApplicationMethods(rawText);
      parsed.applicationMethods = methods;
      const dates = parseDates(rawText);
      const cities = extractCities(rawText);
      return {
        ...job,
        title: nextTitle,
        institution: job.institution ?? nextTitle.split(" - ")[0],
        ilanType: classifyIlanType(nextTitle, job.category, rawText),
        institutionType: classifyInstitutionType(job.institution, nextTitle),
        applicationStart: dates.start?.toISOString() ?? job.applicationStart,
        applicationEnd: dates.end?.toISOString() ?? job.applicationEnd,
        kadroCount: parseKadroCount(`${nextTitle}\n${rawText}`, nextTitle, parsed.positions) ?? job.kadroCount,
        cities: cities.length ? cities : job.cities,
        positions: parsed.positions.length ? parsed.positions : job.positions,
        rawText,
        parsed,
        applyUrl: applyUrl ?? job.applyUrl,
      } satisfies JobRecord;
    }),
  }));
  return buildPayload(state);
}

/** Statik sürümde resmî detay ucu CORS nedeniyle kullanılamaz; kullanıcıya yol gösterilir. */
export async function clientEnrichJob(): Promise<{ ok: boolean; message: string; payload: DashboardPayload }> {
  const state = freshState();
  return {
    ok: false,
    message: "Bu ilanın detay metni henüz eklenmedi. 'Metni yapıştır' ile ilanın tamamını kopyalarsan tüm şartlar otomatik dolar.",
    payload: buildPayload(state),
  };
}

export async function clientAnalyzePaste(payload: {
  title: string;
  text: string;
  institution?: string;
  sourceUrl?: string;
}): Promise<{ result: MatchedJob | null; payload: DashboardPayload; error?: string }> {
  const text = (payload.text ?? "").trim();
  const title = (payload.title ?? "").trim();
  if (!text && !title) {
    return { result: null, payload: buildPayload(freshState()), error: "İlan başlığı veya metni gerekli" };
  }

  const parsed = parseIlan({ title, text, parsedFrom: "yapistirilan" });
  const { methods, applyUrl } = parseApplicationMethods(text);
  parsed.applicationMethods = methods;
  const dates = parseDates(`${title}\n${text}`);
  const cities = extractCities(`${title}\n${text}`);
  const institution = payload.institution?.trim() || title.split(" - ")[0] || "Manuel eklenen ilan";

  const job: JobRecord = {
    sourceKey: `manual-${Date.now().toString(36)}`,
    source: "manual",
    title: title || `${institution} - elle eklenen ilan`,
    institution,
    unit: null,
    ilanNo: null,
    category: "Manuel ekleme",
    ilanType: classifyIlanType(title, null, text),
    institutionType: classifyInstitutionType(institution, title),
    publishedAt: new Date().toISOString(),
    applicationStart: dates.start?.toISOString() ?? null,
    applicationEnd: dates.end?.toISOString() ?? null,
    kadroCount: parseKadroCount(`${title}\n${text}`, title, parsed.positions),
    cities,
    positions: parsed.positions,
    rawText: text || null,
    parsed,
    detailUrl: payload.sourceUrl?.trim() || null,
    applyUrl: applyUrl ?? payload.sourceUrl?.trim() ?? null,
    logoUrl: null,
    isDemo: false,
    fetchedAt: new Date().toISOString(),
  };

  const state = mutateState((prev) => ({ ...prev, jobs: mergeJobs(prev.jobs, [job]).jobs }));
  const matched = matchJobs([job], state.profile, state.preferences, { includeExcluded: true }).matched[0] ?? null;
  return { result: matched, payload: buildPayload(state) };
}

export async function clientImportList(
  content: string,
  sourceUrl?: string,
): Promise<{ imported: number; inserted: number; updated: number; preview: JobRecord[]; payload: DashboardPayload; error?: string }> {
  const empty = { imported: 0, inserted: 0, updated: 0, preview: [] as JobRecord[], payload: buildPayload(freshState()) };
  if ((content ?? "").trim().length < 40) {
    return { ...empty, error: "Yapıştırdığın içerik çok kısa. Resmî liste sayfasının tamamını kopyala." };
  }
  const { jobs, rows } = importIlanList(content, sourceUrl);
  if (!jobs.length) {
    const state = pushLog(freshState(), {
      source: "Listeden ekleme",
      status: "empty",
      message: "Yapıştırılan içerikte ilan bulunamadı",
      found: 0,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    return { ...empty, payload: buildPayload(state), error: "İlan bulunamadı. Resmî liste sayfasında Ctrl+A ile tümünü seçip Ctrl+C ile kopyaladıktan sonra tekrar dene." };
  }

  const prev = freshState();
  const merged = mergeJobs(prev.jobs, jobs);
  let state: PersistedState = { ...prev, jobs: merged.jobs };
  state = pushLog(state, {
    source: "Listeden ekleme",
    status: "ok",
    message: `${rows} ilan eklendi · ${merged.inserted} yeni, ${merged.updated} güncellendi`,
    found: rows,
    inserted: merged.inserted,
    updated: merged.updated,
    createdAt: new Date().toISOString(),
  });
  saveState(state);

  return {
    imported: rows,
    inserted: merged.inserted,
    updated: merged.updated,
    preview: jobs.slice(0, 12),
    payload: buildPayload(state, true),
  };
}

export async function clientDeleteJob(jobKey: string): Promise<DashboardPayload> {
  const state = mutateState((prev) => ({
    ...prev,
    jobs: prev.jobs.filter((j) => j.sourceKey !== jobKey),
    applications: prev.applications.filter((a) => a.jobKey !== jobKey),
  }));
  return buildPayload(state);
}

/** Tüm yerel veriyi sıfırlar (örnek verileri yeniden yüklemek için). */
export async function clientReset(seedDemo = true): Promise<DashboardPayload> {
  const state = freshState();
  saveState({ ...state, jobs: seedDemo ? buildDemoJobs() : [], logs: [], settings: { ...state.settings, lastSyncAt: null } });
  return clientGetDashboard();
}
