import { NextResponse } from "next/server";
import { buildDashboardPayload } from "@/lib/payload";
import { importIlanList } from "@/lib/importer";
import { upsertJobs } from "@/lib/store";
import { addSyncLog } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/import
 * kamuilan.sbb.gov.tr (veya Kariyer Kapısı) liste sayfasının kaynağı/metni yapıştırılır,
 * içindeki tüm ilanlar tek seferde içe aktarılır. Sunucu IP'si engellendiğinde de çalışır.
 */
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = (await request.json()) as { content?: string; sourceUrl?: string };
    const content = (body.content ?? "").trim();
    if (content.length < 40) {
      return NextResponse.json({ error: "Yapıştırılan içerik çok kısa. Liste sayfasının tamamını kopyalayın." }, { status: 400 });
    }

    const { jobs, rows } = importIlanList(content, body.sourceUrl);
    if (!jobs.length) {
      await addSyncLog({
        source: "Toplu içe aktarma",
        status: "empty",
        message: "Yapıştırılan içerikte ilan satırı bulunamadı",
        found: 0,
        durationMs: Date.now() - started,
      });
      return NextResponse.json(
        { error: "İlan satırı bulunamadı. Tarayıcıda liste sayfasını açıp Ctrl+A / Ctrl+C ile tümünü kopyalayın veya 'Kaynağı görüntüle' (Ctrl+U) çıktısını yapıştırın." },
        { status: 422 },
      );
    }

    const result = await upsertJobs(jobs);
    await addSyncLog({
      source: "Toplu içe aktarma",
      status: "ok",
      message: `${rows} ilan satırı çözümlendi · ${result.inserted} yeni, ${result.updated} güncellendi`,
      found: rows,
      inserted: result.inserted,
      updated: result.updated,
      durationMs: Date.now() - started,
    });

    const payload = await buildDashboardPayload();
    return NextResponse.json({
      imported: rows,
      inserted: result.inserted,
      updated: result.updated,
      preview: jobs.slice(0, 12).map((j) => ({
        title: j.title,
        institution: j.institution,
        applicationEnd: j.applicationEnd,
        kadroCount: j.kadroCount,
        cities: j.cities,
        sourceKey: j.sourceKey,
      })),
      ...payload,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
