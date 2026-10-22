import { NextResponse } from "next/server";
import { buildDashboardPayload } from "@/lib/payload";
import { syncJobs } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await buildDashboardPayload();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/** POST /api/jobs → kaynakları yeniden tara. Body: { enrichLimit?: number, seedDemo?: boolean } */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { enrichLimit?: number; seedDemo?: boolean };
    const summary = await syncJobs({
      enrichLimit: Math.min(12, Math.max(0, Number(body.enrichLimit ?? 0) || 0)),
      seedDemo: body.seedDemo ?? true,
    });
    const payload = await buildDashboardPayload();
    return NextResponse.json({ summary, ...payload });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
