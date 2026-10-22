import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/store";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

const NUMERIC_FIELDS = ["kpssScore", "kpssYear", "kpssScoreSecondary", "experienceYears"] as const;

function sanitize(body: Record<string, unknown>): Partial<Profile> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id") continue;
    if ((NUMERIC_FIELDS as readonly string[]).includes(key)) {
      const num = value === "" || value == null ? null : Number(value);
      out[key] = num != null && Number.isFinite(num) ? num : null;
      continue;
    }
    if (key === "departments" || key === "certificates" || key === "languages") {
      out[key] = Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
      continue;
    }
    if (key === "disability") {
      out[key] = Boolean(value);
      continue;
    }
    out[key] = value == null ? "" : String(value);
  }
  return out as Partial<Profile>;
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const profile = await saveProfile(sanitize(body));
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
