import { db } from "@/db";
import { applications, candidateProfiles, jobPreferences, jobs, syncLogs } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import type {
  ApplicationStatus,
  DocumentItem,
  JobRecord,
  ParsedRequirements,
  Preferences,
  Profile,
  SyncLogEntry,
} from "./types";

const EMPTY_PARSED: ParsedRequirements = {
  kpss: [],
  education: [],
  departments: [],
  driverLicense: [],
  certificates: [],
  applicationMethods: [],
  conditions: [],
  positions: [],
  kpssExamYears: [],
  confidence: 0,
  parsedFrom: "baslik",
};

const iso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
};

export const DEFAULT_PROFILE: Profile = {
  fullName: "",
  birthDate: "1998-04-12",
  gender: "kadin",
  homeCity: "Ankara",
  educationLevel: "lisans",
  departments: ["Kamu Yönetimi"],
  fieldOfStudy: "Kamu Yönetimi",
  kpssScore: 81,
  kpssType: "KPSSP3",
  kpssYear: 2024,
  kpssScoreSecondary: 76,
  kpssTypeSecondary: "P93",
  driverLicense: "B sınıfı",
  militaryStatus: "muaf",
  disability: false,
  experienceYears: 1,
  certificates: [],
  languages: ["İngilizce"],
  maritalStatus: "",
  phone: "",
  email: "",
  notes: "",
};

export const DEFAULT_PREFERENCES: Preferences = {
  cities: ["Ankara", "İstanbul", "İzmir"],
  cityMode: "prefer",
  ilanTypes: [],
  institutionTypes: [],
  titleKeywords: [],
  excludeKeywords: [],
  acceptedKpssTypes: [],
  minPositions: 0,
  maxDeadlineDays: null,
  minMatchScore: 0,
  hideUnknownRequirements: false,
  includeDemoData: true,
  sortBy: "score",
};

type ProfileRow = typeof candidateProfiles.$inferSelect;
type PreferenceRow = typeof jobPreferences.$inferSelect;
type JobRow = typeof jobs.$inferSelect;

function mapProfile(row?: ProfileRow | null): Profile {
  return { ...DEFAULT_PROFILE, ...(row ?? {}), id: undefined } as unknown as Profile;
}

function mapPreferences(row?: PreferenceRow | null): Preferences {
  return { ...DEFAULT_PREFERENCES, ...(row ?? {}) } as Preferences;
}

export async function ensureProfileRow(): Promise<void> {
  // Eşzamanlı isteklerde çakışmayı önlemek için onConflictDoNothing kullanılır.
  await db.insert(candidateProfiles).values({ id: 1, ...DEFAULT_PROFILE }).onConflictDoNothing({ target: candidateProfiles.id });
  await db.insert(jobPreferences).values({ id: 1, ...DEFAULT_PREFERENCES }).onConflictDoNothing({ target: jobPreferences.id });
}

export async function getProfile(): Promise<Profile> {
  await ensureProfileRow();
  const rows = await db.select().from(candidateProfiles).where(eq(candidateProfiles.id, 1)).limit(1);
  return mapProfile(rows[0]);
}

export async function saveProfile(input: Partial<Profile>): Promise<Profile> {
  await ensureProfileRow();
  const payload = { ...input, updatedAt: new Date() } as Record<string, unknown>;
  delete payload.id;
  await db.update(candidateProfiles).set(payload).where(eq(candidateProfiles.id, 1));
  return getProfile();
}

export async function getPreferences(): Promise<Preferences> {
  await ensureProfileRow();
  const rows = await db.select().from(jobPreferences).where(eq(jobPreferences.id, 1)).limit(1);
  return mapPreferences(rows[0]);
}

export async function savePreferences(input: Partial<Preferences>): Promise<Preferences> {
  await ensureProfileRow();
  const payload = { ...input, updatedAt: new Date() } as Record<string, unknown>;
  delete payload.id;
  await db.update(jobPreferences).set(payload).where(eq(jobPreferences.id, 1));
  return getPreferences();
}

export function rowToJob(row: JobRow): JobRecord {
  const parsed = (row.parsed ?? {}) as unknown as ParsedRequirements;
  return {
    sourceKey: row.sourceKey,
    source: row.source,
    title: row.title,
    institution: row.institution,
    unit: row.unit,
    ilanNo: row.ilanNo,
    category: row.category,
    ilanType: row.ilanType,
    institutionType: row.institutionType,
    publishedAt: iso(row.publishedAt),
    applicationStart: iso(row.applicationStart),
    applicationEnd: iso(row.applicationEnd),
    kadroCount: row.kadroCount,
    cities: (row.cities as string[] | null) ?? [],
    positions: (row.positions as ParsedRequirements["positions"] | null) ?? parsed.positions ?? [],
    rawText: row.rawText,
    parsed: { ...EMPTY_PARSED, ...(parsed as Partial<ParsedRequirements>) },
    detailUrl: row.detailUrl,
    applyUrl: row.applyUrl,
    logoUrl: row.logoUrl,
    isDemo: row.isDemo ?? false,
    fetchedAt: iso(row.fetchedAt),
  };
}

export async function listJobs(): Promise<JobRecord[]> {
  const rows = await db.select().from(jobs).orderBy(desc(jobs.fetchedAt));
  return rows.map(rowToJob);
}

export type UpsertResult = { inserted: number; updated: number };

export async function upsertJobs(records: JobRecord[]): Promise<UpsertResult> {
  if (!records.length) return { inserted: 0, updated: 0 };
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  for (const record of records) {
    const existingRows = await db.select({ key: jobs.sourceKey, hasText: jobs.rawText }).from(jobs).where(eq(jobs.sourceKey, record.sourceKey)).limit(1);
    const existed = Boolean(existingRows.length);
    const keepText = !record.rawText && existingRows[0]?.hasText ? existingRows[0].hasText : record.rawText;

    const values = {
      sourceKey: record.sourceKey,
      source: record.source,
      title: record.title,
      institution: record.institution,
      unit: record.unit,
      ilanNo: record.ilanNo,
      category: record.category,
      ilanType: record.ilanType,
      institutionType: record.institutionType,
      publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
      applicationStart: record.applicationStart ? new Date(record.applicationStart) : null,
      applicationEnd: record.applicationEnd ? new Date(record.applicationEnd) : null,
      kadroCount: record.kadroCount,
      cities: record.cities ?? [],
      positions: (record.positions ?? []) as unknown[],
      rawText: keepText,
      parsed: record.parsed as unknown as Record<string, unknown>,
      detailUrl: record.detailUrl,
      applyUrl: record.applyUrl,
      logoUrl: record.logoUrl,
      isDemo: record.isDemo,
      detailFetchedAt: record.rawText ? now : null,
      fetchedAt: now,
      updatedAt: now,
    };

    // Yarış durumlarına dayanıklı tek adımlı upsert: yeni kayıtta eksik olan
    // alanlar (metin, tarih, şehir, görsel) mevcut kayıttan korunur.
    await db
      .insert(jobs)
      .values(values as typeof jobs.$inferInsert)
      .onConflictDoUpdate({
        target: jobs.sourceKey,
        set: {
          title: sql`coalesce(nullif(excluded.title, ''), jobs.title)`,
          institution: sql`coalesce(nullif(excluded.institution, ''), jobs.institution)`,
          unit: sql`coalesce(nullif(excluded.unit, ''), jobs.unit)`,
          ilanNo: sql`coalesce(nullif(excluded.ilan_no, ''), jobs.ilan_no)`,
          category: sql`coalesce(nullif(excluded.category, ''), jobs.category)`,
          ilanType: sql`coalesce(nullif(excluded.ilan_type, ''), jobs.ilan_type)`,
          institutionType: sql`coalesce(nullif(excluded.institution_type, ''), jobs.institution_type)`,
          publishedAt: sql`coalesce(excluded.published_at, jobs.published_at)`,
          applicationStart: sql`coalesce(excluded.application_start, jobs.application_start)`,
          applicationEnd: sql`coalesce(excluded.application_end, jobs.application_end)`,
          kadroCount: sql`coalesce(excluded.kadro_count, jobs.kadro_count)`,
          cities: sql`case when jsonb_array_length(coalesce(excluded.cities, '[]'::jsonb)) > 0 then excluded.cities else coalesce(jobs.cities, '[]'::jsonb) end`,
          positions: sql`case when jsonb_array_length(coalesce(excluded.positions, '[]'::jsonb)) > 0 then excluded.positions else coalesce(jobs.positions, '[]'::jsonb) end`,
          rawText: sql`coalesce(nullif(excluded.raw_text, ''), jobs.raw_text)`,
          parsed: sql`case when coalesce(nullif(excluded.raw_text, ''), '') <> '' then excluded.parsed else coalesce(jobs.parsed, excluded.parsed) end`,
          detailUrl: sql`coalesce(nullif(excluded.detail_url, ''), jobs.detail_url)`,
          applyUrl: sql`coalesce(nullif(excluded.apply_url, ''), jobs.apply_url)`,
          logoUrl: sql`coalesce(nullif(excluded.logo_url, ''), jobs.logo_url)`,
          isDemo: sql`excluded.is_demo`,
          detailFetchedAt: sql`case when coalesce(nullif(excluded.raw_text,''),'') <> '' then excluded.detail_fetched_at else jobs.detail_fetched_at end`,
          fetchedAt: sql`excluded.fetched_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    if (existed) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated };
}

export async function updateJobRecord(sourceKey: string, patch: Partial<JobRecord>): Promise<void> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.rawText !== undefined) values.rawText = patch.rawText;
  if (patch.parsed !== undefined) values.parsed = patch.parsed as unknown as Record<string, unknown>;
  if (patch.positions !== undefined) values.positions = patch.positions as unknown[];
  if (patch.cities !== undefined) values.cities = patch.cities;
  if (patch.applicationStart !== undefined) values.applicationStart = patch.applicationStart ? new Date(patch.applicationStart) : null;
  if (patch.applicationEnd !== undefined) values.applicationEnd = patch.applicationEnd ? new Date(patch.applicationEnd) : null;
  if (patch.applyUrl !== undefined) values.applyUrl = patch.applyUrl;
  if (patch.detailUrl !== undefined) values.detailUrl = patch.detailUrl;
  if (patch.kadroCount !== undefined) values.kadroCount = patch.kadroCount;
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.institution !== undefined) values.institution = patch.institution;
  if (patch.ilanNo !== undefined) values.ilanNo = patch.ilanNo;
  if (patch.ilanType !== undefined) values.ilanType = patch.ilanType;
  if (patch.institutionType !== undefined) values.institutionType = patch.institutionType;
  values.detailFetchedAt = new Date();
  await db.update(jobs).set(values).where(eq(jobs.sourceKey, sourceKey));
}

export async function deleteJob(sourceKey: string): Promise<void> {
  await db.delete(jobs).where(eq(jobs.sourceKey, sourceKey));
}

export async function deleteJobsBySource(source: string): Promise<number> {
  const rows = await db.select({ key: jobs.sourceKey }).from(jobs).where(eq(jobs.source, source));
  if (!rows.length) return 0;
  await db.delete(jobs).where(eq(jobs.source, source));
  return rows.length;
}

export type ApplicationRecord = {
  id: number;
  jobKey: string;
  jobTitle: string | null;
  institution: string | null;
  status: ApplicationStatus;
  score: number | null;
  note: string | null;
  documents: DocumentItem[];
  deadline: string | null;
  reminderDate: string | null;
  savedAt: string | null;
  appliedAt: string | null;
  examDate: string | null;
  resultNote: string | null;
  lastOpenedAt: string | null;
};

type ApplicationRow = typeof applications.$inferSelect;

function mapApplication(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    jobKey: row.jobKey,
    jobTitle: row.jobTitle,
    institution: row.institution,
    status: (row.status as ApplicationStatus) ?? "saved",
    score: row.score,
    note: row.note,
    documents: (row.documents as DocumentItem[] | null) ?? [],
    deadline: iso(row.deadline),
    reminderDate: iso(row.reminderDate),
    savedAt: iso(row.savedAt),
    appliedAt: iso(row.appliedAt),
    examDate: iso(row.examDate),
    resultNote: row.resultNote,
    lastOpenedAt: iso(row.lastOpenedAt),
  };
}

export async function listApplications(): Promise<ApplicationRecord[]> {
  const rows = await db.select().from(applications).orderBy(desc(applications.savedAt));
  return rows.map(mapApplication);
}

export async function upsertApplication(input: {
  jobKey: string;
  jobTitle?: string | null;
  institution?: string | null;
  status?: ApplicationStatus;
  score?: number | null;
  note?: string | null;
  documents?: DocumentItem[];
  deadline?: string | null;
  reminderDate?: string | null;
  appliedAt?: string | null;
  examDate?: string | null;
  resultNote?: string | null;
}): Promise<ApplicationRecord> {
  const existingRows = await db.select().from(applications).where(eq(applications.jobKey, input.jobKey)).limit(1);
  const existing = existingRows[0] ? mapApplication(existingRows[0]) : null;
  const values: Record<string, unknown> = {
    jobKey: input.jobKey,
    jobTitle: input.jobTitle ?? existing?.jobTitle ?? null,
    institution: input.institution ?? existing?.institution ?? null,
    status: input.status ?? existing?.status ?? "saved",
    score: input.score ?? existing?.score ?? null,
    note: input.note !== undefined ? input.note : (existing?.note ?? null),
    documents: (input.documents ?? existing?.documents ?? []) as unknown[],
    deadline: input.deadline !== undefined ? (input.deadline ? new Date(input.deadline) : null) : existing?.deadline ? new Date(existing.deadline) : null,
    reminderDate: input.reminderDate !== undefined ? (input.reminderDate ? new Date(input.reminderDate) : null) : existing?.reminderDate ? new Date(existing.reminderDate) : null,
    appliedAt: input.appliedAt !== undefined ? (input.appliedAt ? new Date(input.appliedAt) : null) : existing?.appliedAt ? new Date(existing.appliedAt) : null,
    examDate: input.examDate !== undefined ? (input.examDate ? new Date(input.examDate) : null) : existing?.examDate ? new Date(existing.examDate) : null,
    resultNote: input.resultNote !== undefined ? input.resultNote : (existing?.resultNote ?? null),
    lastOpenedAt: new Date(),
  };
  if (input.status === "applied" && !input.appliedAt && !existing?.appliedAt) values.appliedAt = new Date();

  if (existing) {
    await db.update(applications).set(values).where(eq(applications.jobKey, input.jobKey));
  } else {
    await db
      .insert(applications)
      .values(values as typeof applications.$inferInsert)
      .onConflictDoNothing({ target: applications.jobKey });
  }
  const rows = await db.select().from(applications).where(eq(applications.jobKey, input.jobKey)).limit(1);
  return mapApplication(rows[0]!);
}

export async function removeApplication(jobKey: string): Promise<void> {
  await db.delete(applications).where(eq(applications.jobKey, jobKey));
}

export async function addSyncLog(entry: {
  source: string;
  status: string;
  message?: string | null;
  found?: number;
  inserted?: number;
  updated?: number;
  durationMs?: number;
}): Promise<void> {
  await db.insert(syncLogs).values({
    source: entry.source,
    status: entry.status,
    message: entry.message ?? null,
    found: entry.found ?? 0,
    inserted: entry.inserted ?? 0,
    updated: entry.updated ?? 0,
    durationMs: entry.durationMs ?? 0,
  });
}

export async function listSyncLogs(limit = 12): Promise<SyncLogEntry[]> {
  const rows = await db.select().from(syncLogs).orderBy(desc(syncLogs.id)).limit(limit);
  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    status: row.status,
    message: row.message,
    found: row.found,
    inserted: row.inserted,
    updated: row.updated,
    durationMs: row.durationMs,
    createdAt: iso(row.createdAt),
  }));
}
