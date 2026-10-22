import { NextResponse } from "next/server";
import { getPreferences, savePreferences } from "@/lib/store";
import type { Preferences } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ preferences: await getPreferences() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

const LIST_FIELDS = ["cities", "ilanTypes", "institutionTypes", "titleKeywords", "excludeKeywords", "acceptedKpssTypes"] as const;

function sanitize(body: Record<string, unknown>): Partial<Preferences> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id") continue;
    if ((LIST_FIELDS as readonly string[]).includes(key)) {
      out[key] = Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
      continue;
    }
    if (key === "minPositions" || key === "minMatchScore") {
      const num = Number(value ?? 0);
      out[key] = Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
      continue;
    }
    if (key === "maxDeadlineDays") {
      out[key] = value === null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
      continue;
    }
    if (key === "hideUnknownRequirements" || key === "includeDemoData") {
      out[key] = Boolean(value);
      continue;
    }
    if (key === "cityMode") {
      out[key] = value === "strict" || value === "any" ? value : "prefer";
      continue;
    }
    if (key === "sortBy") {
      out[key] = ["score", "deadline", "newest", "positions"].includes(String(value)) ? value : "score";
      continue;
    }
    out[key] = value;
  }
  return out as Partial<Preferences>;
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ preferences: await savePreferences(sanitize(body)) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
