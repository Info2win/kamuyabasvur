import { NextResponse } from "next/server";
import { extractCities } from "@/lib/cities";
import { refineRow } from "@/lib/importer";
import { enrichJob } from "@/lib/sync";
import { deleteJob, listJobs, removeApplication, updateJobRecord } from "@/lib/store";
import { parseApplicationMethods, parseDates, parseIlan, parseKadroCount } from "@/lib/parse";
import { classifyIlanType, classifyInstitutionType } from "@/lib/parse";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

async function findJob(key: string) {
  const all = await listJobs();
  return all.find((j) => j.sourceKey === key) ?? null;
}

export async function GET(_request: Request, { params }: Params) {
  const { key } = await params;
  const job = await findJob(key);
  if (!job) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  return NextResponse.json({ job });
}

/** İlan metnini yapıştır → yeniden ayrıştır; veya { enrich: true } ile resmî detayı çek. */
export async function PATCH(request: Request, { params }: Params) {
  const { key } = await params;
  const job = await findJob(key);
  if (!job) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    rawText?: string;
    title?: string;
    enrich?: boolean;
    reparse?: boolean;
  };

  // Kayıtlı başlığı/metni güncel ayrıştırıcıyla yeniden çözer (toplu içe aktarımlarda kullanışlı).
  if (body.reparse) {
    const refined = refineRow({
      guid: null,
      title: job.title,
      institution: job.institution ?? "",
      applicationStart: null,
      applicationEnd: null,
      publishedAt: null,
    });
    const title = refined?.title ?? job.title;
    const text = job.rawText ?? "";
    const parsed = parseIlan({ title, text, category: job.category, parsedFrom: text ? "detay" : "baslik" });
    const { methods, applyUrl } = parseApplicationMethods(text || title);
    parsed.applicationMethods = methods;
    const cities = extractCities(`${title}\n${text}`);
    await updateJobRecord(key, {
      title,
      institution: refined?.institution ?? job.institution,
      category: /(iptal|erteleme|düzeltme)/i.test(title) ? "İptal / düzeltme duyurusu" : job.category,
      ilanType: classifyIlanType(title, job.category, text),
      institutionType: classifyInstitutionType(refined?.institution ?? job.institution, title),
      applicationStart: refined?.applicationStart?.toISOString() ?? job.applicationStart,
      applicationEnd: refined?.applicationEnd?.toISOString() ?? job.applicationEnd,
      kadroCount: parseKadroCount(`${title}\n${text}`, title, parsed.positions) ?? job.kadroCount,
      cities: cities.length ? cities : job.cities,
      positions: parsed.positions.length ? parsed.positions : job.positions,
      rawText: text || job.rawText,
      parsed,
      applyUrl: applyUrl ?? job.applyUrl,
    });
    return NextResponse.json({ ok: true, job: await findJob(key) });
  }

  if (body.enrich) {
    const result = await enrichJob(job);
    const fresh = await findJob(key);
    return NextResponse.json({ ok: result.ok, message: result.message, job: fresh });
  }

  const text = (body.rawText ?? "").trim();
  if (!text) return NextResponse.json({ error: "İlan metni boş" }, { status: 400 });

  const title = (body.title ?? job.title).trim();
  const parsed = parseIlan({ title, text, category: job.category, parsedFrom: "yapistirilan" });
  const { methods, applyUrl } = parseApplicationMethods(text);
  parsed.applicationMethods = methods;
  const dates = parseDates(text);
  const cities = extractCities(text);
  const kadro = parseKadroCount(`${title}\n${text}`, title, parsed.positions) ?? job.kadroCount;

  await updateJobRecord(key, {
    title,
    institution: job.institution ?? title.split(" - ")[0],
    ilanType: classifyIlanType(title, job.category, text),
    institutionType: classifyInstitutionType(job.institution, title),
    applicationStart: dates.start?.toISOString() ?? job.applicationStart,
    applicationEnd: dates.end?.toISOString() ?? job.applicationEnd,
    kadroCount: kadro,
    cities: cities.length ? cities : job.cities,
    positions: parsed.positions.length ? parsed.positions : job.positions,
    rawText: text,
    parsed,
    applyUrl: applyUrl ?? job.applyUrl,
  });

  const fresh = await findJob(key);
  return NextResponse.json({ ok: true, job: fresh });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { key } = await params;
  await deleteJob(key);
  await removeApplication(key);
  return NextResponse.json({ ok: true });
}
