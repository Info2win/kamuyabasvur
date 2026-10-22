import { NextResponse } from "next/server";
import { buildDocumentChecklist } from "@/lib/documents";
import {
  getProfile,
  listApplications,
  listJobs,
  removeApplication,
  upsertApplication,
} from "@/lib/store";
import type { ApplicationStatus, DocumentItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: ApplicationStatus[] = ["saved", "reviewed", "documents", "applied", "exam", "result", "rejected"];

export async function GET() {
  try {
    return NextResponse.json({ applications: await listApplications() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobKey?: string;
      status?: ApplicationStatus;
      note?: string;
      documents?: DocumentItem[];
      reminderDate?: string | null;
      appliedAt?: string | null;
      examDate?: string | null;
      resultNote?: string | null;
      delete?: boolean;
    };
    if (!body.jobKey) return NextResponse.json({ error: "jobKey zorunlu" }, { status: 400 });
    if (body.delete) {
      await removeApplication(body.jobKey);
      return NextResponse.json({ ok: true, applications: await listApplications() });
    }

    const jobs = await listJobs();
    const job = jobs.find((j) => j.sourceKey === body.jobKey) ?? null;
    const profile = await getProfile();
    const documents = body.documents ?? (job ? buildDocumentChecklist(job, profile) : []);

    const record = await upsertApplication({
      jobKey: body.jobKey,
      jobTitle: job?.title ?? null,
      institution: job?.institution ?? null,
      status: body.status && STATUSES.includes(body.status) ? body.status : undefined,
      note: body.note,
      documents,
      deadline: job?.applicationEnd ?? null,
      reminderDate: body.reminderDate ?? undefined,
      appliedAt: body.appliedAt ?? undefined,
      examDate: body.examDate ?? undefined,
      resultNote: body.resultNote ?? undefined,
    });

    return NextResponse.json({ application: record, applications: await listApplications() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
