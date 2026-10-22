import { extractCities } from "./cities";
import type { RawIlan } from "./kariyerRss";
import {
  classifyIlanType,
  classifyInstitutionType,
  parseApplicationMethods,
  parseDates,
  parseIlan,
  parseKadroCount,
} from "./parse";
import type { JobRecord } from "./types";

/**
 * Ham ilan kaydını (RSS / arama ucu / SBB HTML) normalize edilmiş JobRecord'a çevirir.
 * Saf fonksiyondur: hem sunucu tarafında hem tarayıcıda hem de derleme betiklerinde çalışır.
 */
export function rawToJob(raw: RawIlan, source: string): JobRecord {
  const title = raw.title.replace(/\s+/g, " ").trim();
  const institution = raw.institution || title.split(" - ")[0] || "Kurum belirtilmemiş";
  const body = raw.description && raw.description.trim() !== title ? raw.description : "";
  const parsed = parseIlan({ title, text: body, category: raw.category, parsedFrom: body ? "detay" : "baslik" });
  const { methods, applyUrl } = parseApplicationMethods(`${title}\n${body}`);
  parsed.applicationMethods = methods;
  const kadro = parseKadroCount(`${title}\n${body}`, title, parsed.positions);
  const cities = extractCities(`${title}\n${body}`);
  const dates = parseDates(`${title}\n${body}`);

  return {
    sourceKey: raw.guid,
    source,
    title,
    institution,
    unit: raw.unit ?? null,
    ilanNo: null,
    category: raw.category,
    ilanType: classifyIlanType(title, raw.category, body),
    institutionType: classifyInstitutionType(institution, title),
    publishedAt: raw.publishedAt ? raw.publishedAt.toISOString() : null,
    applicationStart: raw.applicationStart?.toISOString() ?? dates.start?.toISOString() ?? null,
    applicationEnd: raw.applicationEnd?.toISOString() ?? dates.end?.toISOString() ?? null,
    kadroCount: kadro,
    cities,
    positions: parsed.positions,
    rawText: body || null,
    parsed,
    detailUrl: raw.detailUrl,
    applyUrl: raw.applyUrl ?? applyUrl ?? raw.detailUrl,
    logoUrl: raw.logoUrl,
    isDemo: false,
    fetchedAt: new Date().toISOString(),
  };
}
