import type { SyncLogEntry, ApplicationRecord, DashboardPayload } from "@/lib/types";
import type { JobRecord, Preferences, Profile } from "@/lib/types";

export const STORAGE_KEY = "kpss-ilan-radari:v1";

/** Statik (GitHub Pages) sürümde kullanılan yerel ayarlar. */
export type ClientSettings = {
  /** CORS vekil sunucusu (ör. https://api.allorigins.win/raw?url=). Boşsa canlı çekim denenmez. */
  proxyUrl: string;
  /** Derleme sırasında üretilen ilan verisi (GitHub Actions ile tazelenir). */
  staticDataUrl: string;
  /** Örnek veri seti yüklensin mi? */
  seedDemo: boolean;
  lastSyncAt: string | null;
};

export type PersistedState = {
  profile: Profile;
  preferences: Preferences;
  jobs: JobRecord[];
  applications: ApplicationRecord[];
  logs: SyncLogEntry[];
  settings: ClientSettings;
  version: number;
};

export const DEFAULT_SETTINGS: ClientSettings = {
  proxyUrl: "",
  staticDataUrl: "veri/ilanlar.json",
  seedDemo: true,
  lastSyncAt: null,
};

let cache: PersistedState | null = null;

export function emptyState(): PersistedState {
  return {
    profile: {} as Profile,
    preferences: {} as Preferences,
    jobs: [],
    applications: [],
    logs: [],
    settings: { ...DEFAULT_SETTINGS },
    version: 1,
  };
}

/** localStorage'dan durumu okur (tarayıcı yoksa boş durum döner). */
export function loadState(defaults: { profile: Profile; preferences: Preferences }): PersistedState {
  if (cache) return cache;
  const base: PersistedState = { ...emptyState(), profile: defaults.profile, preferences: defaults.preferences };
  if (typeof window === "undefined") {
    cache = base;
    return base;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = base;
      return base;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    cache = {
      ...base,
      ...parsed,
      profile: { ...defaults.profile, ...(parsed.profile ?? {}) },
      preferences: { ...defaults.preferences, ...(parsed.preferences ?? {}) },
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
    return cache;
  } catch {
    cache = base;
    return base;
  }
}

export function saveState(state: PersistedState): PersistedState {
  cache = state;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Kota dolu olabilir: en eski günlükleri budayarak tekrar dene
      try {
        const slim = { ...state, logs: state.logs.slice(0, 5), jobs: state.jobs.slice(0, 400) };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
        cache = slim;
      } catch {
        /* yoksay */
      }
    }
  }
  return cache;
}

export function mutateState(fn: (state: PersistedState) => PersistedState): PersistedState {
  const current = cache ?? loadState({ profile: {} as Profile, preferences: {} as Preferences });
  return saveState(fn(current));
}

/**
 * Sunucu tarafındaki upsert mantığının tarayıcı karşılığı:
 * yeni kayıtta eksik olan alanlar (metin, tarih, şehir) mevcut kayıttan korunur.
 */
export function mergeJobs(existing: JobRecord[], incoming: JobRecord[]): { jobs: JobRecord[]; inserted: number; updated: number } {
  const map = new Map<string, JobRecord>(existing.map((j) => [j.sourceKey, j]));
  let inserted = 0;
  let updated = 0;
  for (const next of incoming) {
    const prev = map.get(next.sourceKey);
    if (!prev) {
      map.set(next.sourceKey, next);
      inserted += 1;
      continue;
    }
    const keepText = !next.rawText && prev.rawText ? prev.rawText : next.rawText;
    map.set(next.sourceKey, {
      ...prev,
      ...next,
      unit: next.unit || prev.unit,
      ilanNo: next.ilanNo || prev.ilanNo,
      category: next.category || prev.category,
      publishedAt: next.publishedAt ?? prev.publishedAt,
      applicationStart: next.applicationStart ?? prev.applicationStart,
      applicationEnd: next.applicationEnd ?? prev.applicationEnd,
      kadroCount: next.kadroCount ?? prev.kadroCount,
      cities: next.cities?.length ? next.cities : prev.cities,
      positions: next.positions?.length ? next.positions : prev.positions,
      rawText: keepText,
      parsed: next.rawText || !prev.rawText ? next.parsed : prev.parsed,
      detailUrl: next.detailUrl ?? prev.detailUrl,
      applyUrl: next.applyUrl ?? prev.applyUrl,
      logoUrl: next.logoUrl ?? prev.logoUrl,
      fetchedAt: next.fetchedAt ?? new Date().toISOString(),
    });
    updated += 1;
  }
  // En yeni yayım/çekim tarihine göre sırala
  const jobs = [...map.values()].sort((a, b) => {
    const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bt - at;
  });
  return { jobs, inserted, updated };
}

export function pushLog(
  state: PersistedState,
  entry: Partial<SyncLogEntry> & { source: string; status: string },
): PersistedState {
  const id = (state.logs[0]?.id ?? 0) + 1;
  const record: SyncLogEntry = {
    id,
    source: entry.source,
    status: entry.status,
    message: entry.message ?? null,
    found: entry.found ?? 0,
    inserted: entry.inserted ?? 0,
    updated: entry.updated ?? 0,
    durationMs: entry.durationMs ?? 0,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
  return { ...state, logs: [record, ...state.logs].slice(0, 25) };
}
