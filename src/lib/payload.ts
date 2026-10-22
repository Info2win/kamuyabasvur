import { getPreferences, getProfile, listApplications, listJobs, listSyncLogs } from "@/lib/store";
import { syncJobs } from "@/lib/sync";
import { matchJobs } from "@/lib/match";
import { buildDocumentChecklist } from "@/lib/documents";
import type { ApplicationRecord } from "@/lib/store";
import type { JobRecord, Preferences, Profile } from "@/lib/types";

export type DashboardPayload = {
  profile: Profile;
  preferences: Preferences;
  matched: ReturnType<typeof matchJobs>["matched"];
  excluded: ReturnType<typeof matchJobs>["excluded"];
  applications: Record<string, ApplicationRecord>;
  jobs: JobRecord[];
  logs: Awaited<ReturnType<typeof listSyncLogs>>;
  stats: {
    total: number;
    visible: number;
    strong: number;
    partial: number;
    risky: number;
    urgent: number;
    applied: number;
    saved: number;
    demoCount: number;
    liveCount: number;
  };
  syncedJustNow: boolean;
};

export async function buildDashboardPayload(options?: { includeExcluded?: boolean }): Promise<DashboardPayload> {
  const [profile, preferences] = await Promise.all([getProfile(), getPreferences()]);
  let jobs = await listJobs();
  let syncedJustNow = false;

  if (!jobs.length) {
    await syncJobs({ seedDemo: true });
    jobs = await listJobs();
    syncedJustNow = true;
  }

  const visibleJobs = preferences.includeDemoData ? jobs : jobs.filter((j) => !j.isDemo);
  const { matched, excluded } = matchJobs(visibleJobs, profile, preferences, { includeExcluded: options?.includeExcluded });
  const apps = await listApplications();
  const logs = await listSyncLogs(8);

  const applications = Object.fromEntries(apps.map((a) => [a.jobKey, a])) as DashboardPayload["applications"];

  // Belge kontrol listelerini eksikse üret
  for (const app of apps) {
    if (!app.documents?.length) {
      const job = jobs.find((j) => j.sourceKey === app.jobKey);
      if (job) app.documents = buildDocumentChecklist(job, profile);
    }
  }

  const visible = matched.length;
  return {
    profile,
    preferences,
    matched,
    excluded,
    applications,
    jobs,
    logs,
    syncedJustNow,
    stats: {
      total: visibleJobs.length,
      visible,
      strong: matched.filter((m) => m.match.status === "tam-uygun" || m.match.status === "uygun").length,
      partial: matched.filter((m) => m.match.status === "kismi").length,
      risky: matched.filter((m) => m.match.status === "riskli" || m.match.status === "uygun-degil").length,
      urgent: matched.filter((m) => m.match.deadlineDays != null && m.match.deadlineDays >= 0 && m.match.deadlineDays <= 7).length,
      applied: apps.filter((a) => a.status === "applied" || a.status === "exam" || a.status === "result").length,
      saved: apps.length,
      demoCount: jobs.filter((j) => j.isDemo).length,
      liveCount: jobs.filter((j) => !j.isDemo).length,
    },
  };
}
