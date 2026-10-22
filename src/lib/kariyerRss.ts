import { cleanHtml } from "./parse";

export type RawIlan = {
  guid: string;
  title: string;
  institution: string;
  unit?: string | null;
  category: string | null;
  publishedAt: Date | null;
  applicationStart?: Date | null;
  applicationEnd?: Date | null;
  detailUrl: string;
  applyUrl?: string | null;
  logoUrl: string | null;
  description: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(cleanHtml(m[1])) : null;
}

/**
 * Kariyer Kapısı (Cumhurbaşkanlığı kamu işe alım) resmî RSS beslemesi.
 * kamuilan.sbb.gov.tr'de yayımlanan ilanların başvuru tarafı bu portaldır;
 * SBB portalı erişime kapalıysa (yurt dışı IP engeli) canlı veri buradan gelir.
 */
export async function fetchKariyerRss(options?: { timeoutMs?: number; baseUrl?: string }): Promise<{ items: RawIlan[]; error?: string }> {
  const base = options?.baseUrl ?? process.env.KARIYER_RSS_URL ?? "https://kariyerkapisi.gov.tr/rss";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 15_000);
  try {
    const res = await fetch(base, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      cache: "no-store",
    });
    if (!res.ok) return { items: [], error: `RSS yanıtı: HTTP ${res.status}` };
    const xml = await res.text();
    const blocks = xml.split(/<item>/i).slice(1);
    const items: RawIlan[] = [];
    for (const raw of blocks) {
      const block = raw.split(/<\/item>/i)[0];
      const link = tag(block, "link") ?? tag(block, "guid");
      if (!link) continue;
      const title = tag(block, "title") ?? "";
      if (!title || /Kariyer Kapısı - Kamu İşe Alım/i.test(title)) continue;
      const splitIndex = title.indexOf(" - ");
      const institution = splitIndex > 3 ? title.slice(0, splitIndex).trim() : "";
      const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"/i);
      items.push({
        guid: link.match(/[?&]i=([0-9a-f-]{8,})/i)?.[1] ?? link,
        title: title.trim(),
        institution: institution || "Kurum belirtilmemiş",
        category: tag(block, "category"),
        publishedAt: parseRfcDate(tag(block, "pubDate")),
        detailUrl: link,
        logoUrl: enclosure ? decodeEntities(enclosure[1]) : null,
        description: tag(block, "description") ?? title,
      });
    }
    if (!items.length) return { items: [], error: "RSS içeriğinden ilan çıkarılamadı" };
    return { items };
  } catch (error) {
    return { items: [], error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export function parseRfcDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
