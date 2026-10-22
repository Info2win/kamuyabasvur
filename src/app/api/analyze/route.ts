import { NextResponse } from "next/server";
import { extractCities } from "@/lib/cities";
import { matchJob } from "@/lib/match";
import {
  classifyIlanType,
  classifyInstitutionType,
  parseApplicationMethods,
  parseDates,
  parseIlan,
  parseKadroCount,
} from "@/lib/parse";
import { getPreferences, getProfile, upsertJobs } from "@/lib/store";
import type { JobRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => map[c] ?? c)
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Yapıştırılan ilan metnini çözümler, isteğe bağlı olarak kaydeder ve profile göre puanlar. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      text?: string;
      institution?: string;
      sourceUrl?: string;
      save?: boolean;
    };
    const text = (body.text ?? "").trim();
    const title = (body.title ?? "").trim();
    if (!text && !title) return NextResponse.json({ error: "İlan başlığı veya metni gerekli" }, { status: 400 });

    const parsed = parseIlan({ title, text, parsedFrom: "yapistirilan" });
    const { methods, applyUrl } = parseApplicationMethods(text);
    parsed.applicationMethods = methods;
    const dates = parseDates(`${title}\n${text}`);
    const cities = extractCities(`${title}\n${text}`);
    const kadro = parseKadroCount(`${title}\n${text}`, title, parsed.positions);
    const institution = body.institution?.trim() || title.split(" - ")[0] || "Manuel eklenen ilan";

    const job: JobRecord = {
      sourceKey: `manual-${slugify(title || institution)}-${Date.now().toString(36)}`,
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
      kadroCount: kadro,
      cities,
      positions: parsed.positions,
      rawText: text || null,
      parsed,
      detailUrl: body.sourceUrl?.trim() || null,
      applyUrl: applyUrl ?? body.sourceUrl?.trim() ?? null,
      logoUrl: null,
      isDemo: false,
      fetchedAt: new Date().toISOString(),
    };

    if (body.save !== false) {
      await upsertJobs([job]);
    }

    const [profile, preferences] = await Promise.all([getProfile(), getPreferences()]);
    const result = matchJob(job, profile, preferences);
    return NextResponse.json({ job, parsed, result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
