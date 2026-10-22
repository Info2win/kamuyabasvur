import { cleanHtml } from "./parse";
import { parseRfcDate } from "./kariyerRss";
import type { RawIlan } from "./kariyerRss";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export type SbbResult = { items: RawIlan[]; error?: string; blocked?: boolean };

/**
 * kamuilan.sbb.gov.tr (Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı) ana sayfasını
 * çeker ve #pnlIlanlar içindeki ilan satırlarını ayrıştırır.
 * Site yurt dışı IP'lerini engelleyebildiği için hata durumu ayrıca raporlanır.
 */
export async function fetchSbbIlanlar(options?: { timeoutMs?: number; baseUrl?: string }): Promise<SbbResult> {
  const base = options?.baseUrl ?? process.env.SBB_ILAN_URL ?? "https://kamuilan.sbb.gov.tr/";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 12_000);
  try {
    const res = await fetch(base, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return { items: [], blocked: res.status === 403 || res.status === 451, error: `SBB yanıtı: HTTP ${res.status}` };
    }
    const html = await res.text();
    if (/Access Restricted|Erişim Engellendi|IP adresiniz/i.test(html) && html.length < 6000) {
      return { items: [], blocked: true, error: "SBB portalı bu sunucunun IP'sini engelliyor (403 Access Restricted)" };
    }

    const items: RawIlan[] = [];
    const linkRe = /href="([^"]*IlanDetay[^"]*i=([0-9a-fA-F-]{8,})[^"]*)"[^>]*>([\s\S]{0,600}?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html))) {
      const href = m[1];
      const guid = m[2];
      const text = cleanHtml(m[3]);
      if (!text || text.length < 8) continue;
      const absolute = href.startsWith("http") ? href : new URL(href, base).toString();
      const dateMatch = text.match(/(\d{1,2}[./]\d{1,2}[./]20\d{2})/);
      const splitIndex = text.indexOf(" - ");
      items.push({
        guid,
        title: text.replace(/\s+/g, " ").trim(),
        institution: splitIndex > 3 ? text.slice(0, splitIndex).trim() : "",
        category: null,
        publishedAt: dateMatch
          ? parseRfcDate(new Date(+dateMatch[1].slice(6), +dateMatch[1].slice(3, 5) - 1, +dateMatch[1].slice(0, 2)).toISOString())
          : null,
        detailUrl: absolute,
        logoUrl: null,
        description: text,
      });
    }
    if (!items.length) {
      return { items: [], error: "SBB sayfası açıldı ancak ilan satırı bulunamadı (liste tarayıcıda üretiliyor olabilir)" };
    }
    return { items };
  } catch (error) {
    return { items: [], error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  } finally {
    clearTimeout(timer);
  }
}
