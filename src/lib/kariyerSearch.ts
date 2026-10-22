import type { RawIlan } from "./kariyerRss";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Kariyer Kapısı'nın kamuya açık ilan arama ucu.
 * `https://kariyerkapisi.gov.tr/Ilanlar` sayfasındaki listenin tamamı (tüm kurumlar,
 * tüm ilan türleri) bu uçtan gelir — kamuilan.sbb.gov.tr listesiyle aynı kümedir.
 * Not: api.kariyerkapisi.gov.tr bazı yurt dışı IP'lerini TLS seviyesinde engeller.
 */
export async function fetchKariyerSearch(options?: {
  apiUrl?: string;
  timeoutMs?: number;
  searchText?: string;
  il?: string;
  ilanTuru?: string;
}): Promise<{ items: RawIlan[]; error?: string; blocked?: boolean }> {
  const api = options?.apiUrl ?? process.env.KARIYER_API_URL ?? "https://api.kariyerkapisi.gov.tr/api";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 12_000);
  try {
    const res = await fetch(`${api}/ilan/SearchIlanPublic`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
        "User-Agent": UA,
        Origin: "https://kariyerkapisi.gov.tr",
        Referer: "https://kariyerkapisi.gov.tr/Ilanlar",
      },
      body: JSON.stringify({
        krM_ID: 0,
        searchText: options?.searchText ?? "",
        il: options?.il ?? "0",
        ilanTuru: options?.ilanTuru ?? "0",
      }),
      cache: "no-store",
    });
    if (!res.ok) return { items: [], blocked: res.status === 403, error: `Arama ucu yanıtı: HTTP ${res.status}` };
    const json = (await res.json()) as unknown;
    const rows = Array.isArray(json) ? json : ((json as Record<string, unknown>)?.ilanlar as unknown[]) ?? [];
    const items: RawIlan[] = [];
    for (const row of rows as Record<string, unknown>[]) {
      const guid = String(row.guid ?? row.ilanGuid ?? row.id ?? "").trim();
      const baslik = String(row.ilanBaslik ?? row.baslik ?? "").trim();
      if (!baslik) continue;
      const kurum = String(row.kurumAdi ?? row.kurum ?? "").trim();
      const birim = String(row.birimAdi ?? "").trim();
      const ilanTipi = Number(row.ilanTipi ?? 1);
      const basvuruLinki = row.basvuruLinki ? String(row.basvuruLinki) : null;
      items.push({
        guid: guid || basvuruLinki || baslik.slice(0, 60),
        title: kurum ? `${kurum} - ${baslik}` : baslik,
        institution: kurum || baslik.split(" - ")[0],
        unit: birim || null,
        category: String(row.ilanTuruAdi ?? row.ilanTuru ?? "") || null,
        publishedAt: toDate(row.yayimTarihi ?? row.basTarih),
        applicationStart: toDate(row.basTarih ?? row.basvuruBaslangic),
        applicationEnd: toDate(row.bitTarih ?? row.basvuruBitis),
        detailUrl: ilanTipi === 1 && guid ? `https://kariyerkapisi.gov.tr/IlanDetay?i=${guid}` : (basvuruLinki ?? `https://kariyerkapisi.gov.tr/Ilanlar`),
        applyUrl: basvuruLinki,
        logoUrl: row.logo_Path ? `https://kariyerkapisi.gov.tr/UPS/${row.logo_Path}` : null,
        description: [baslik, birim, row.ozet ?? ""].filter(Boolean).join(" - "),
      });
    }
    if (!items.length) return { items: [], error: "Arama ucu boş liste döndü" };
    return { items };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { items: [], blocked: /SSL|TLS|ECONNRESET|timeout|AbortError/i.test(message), error: message };
  } finally {
    clearTimeout(timer);
  }
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const str = String(value);
  const numeric = str.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
  if (numeric) {
    const d = new Date(Date.UTC(+numeric[3], +numeric[2] - 1, +numeric[1], 21, 0, 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}
