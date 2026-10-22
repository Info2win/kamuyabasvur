import { cleanHtml } from "./parse";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export type KontenjanSatiri = { il: string; kontenjan: number | null };

export type IlanDetail = {
  ilanGuid: string;
  ilno?: string;
  baslik?: string;
  kurumAdi?: string;
  birimAdi?: string;
  ilanTuru?: string;
  basvuruBaslangic?: Date | null;
  basvuruBitis?: Date | null;
  anaIlanMetni?: string;
  basvuruLinki?: string | null;
  eDevletServisURL?: string | null;
  logoPath?: string | null;
  kontenjan?: KontenjanSatiri[];
  altIlanlar?: { unvan: string; kontenjan: number | null; ogrenim?: string; kpss?: string; iller: string[] }[];
};

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    for (const actual of Object.keys(obj)) {
      if (actual.toLocaleLowerCase("tr") === key.toLocaleLowerCase("tr")) return obj[actual];
    }
  }
  return undefined;
}

function toDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const numeric = value.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
    if (numeric) {
      const d = new Date(Date.UTC(+numeric[3], +numeric[2] - 1, +numeric[1], 21, 0, 0));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function postJson(url: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
        "User-Agent": UA,
        Origin: "https://kariyerkapisi.gov.tr",
        Referer: "https://kariyerkapisi.gov.tr/",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Kariyer Kapısı açık detay uçları (ilan metni + kontenjan/alt ilan bilgisi). */
export async function fetchIlanDetail(guid: string, options?: { timeoutMs?: number; apiUrl?: string }): Promise<{ detail?: IlanDetail; error?: string }> {
  const api = options?.apiUrl ?? process.env.KARIYER_API_URL ?? "https://api.kariyerkapisi.gov.tr/api";
  const timeoutMs = options?.timeoutMs ?? 9000;
  try {
    const raw = (await postJson(`${api}/ilan/GetIlanPreviewPublic`, { ilanGuid: guid }, timeoutMs)) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return { error: "Detay yanıtı boş" };

    let altIlanlar: IlanDetail["altIlanlar"] = [];
    let kontenjan: KontenjanSatiri[] = [];
    try {
      const altRaw = (await postJson(`${api}/altilan/GetAltIlanInfoByIlanIdPublic`, { ilanGuid: guid }, timeoutMs)) as unknown;
      if (Array.isArray(altRaw)) {
        for (const entry of altRaw as Record<string, unknown>[]) {
          const list = (pick(entry, ["kontenjanList", "KontenjanList"]) ?? []) as Record<string, unknown>[];
          const iller: string[] = [];
          for (const k of list) {
            const il = pick(k, ["il", "Il", "sehir", "Sehir"]);
            const adet = pick(k, ["kontenjan", "Kontenjan", "adet"]);
            if (typeof il === "string" && il.trim()) {
              iller.push(il.trim());
              kontenjan.push({ il: il.trim(), kontenjan: typeof adet === "number" ? adet : Number(adet ?? 0) || null });
            }
          }
          altIlanlar.push({
            unvan: String(pick(entry, ["unvan", "Unvan", "unvanAdi", "altIlanBaslik", "baslik"]) ?? "").trim(),
            kontenjan: Number(pick(entry, ["kontenjan", "toplamKontenjan", "adet"]) ?? 0) || null,
            ogrenim: String(pick(entry, ["ogrenim", "ogrenimDurumu", "egitim"]) ?? "").trim() || undefined,
            kpss: String(pick(entry, ["kpss", "kpssPuani", "kpssTuru"]) ?? "").trim() || undefined,
            iller,
          });
        }
      }
    } catch {
      // alt ilan uçları isteğe bağlıdır
    }

    const detail: IlanDetail = {
      ilanGuid: guid,
      ilno: String(pick(raw, ["ILN_NO", "ilno", "ilanNo", "ilnNo"]) ?? "") || undefined,
      baslik: String(pick(raw, ["IlanBaslik", "ilanBaslik", "baslik", "title"]) ?? "") || undefined,
      kurumAdi: String(pick(raw, ["KurumAdi", "kurumAdi", "kurum"]) ?? "") || undefined,
      birimAdi: String(pick(raw, ["BirimAdi", "birimAdi", "birim"]) ?? "") || undefined,
      ilanTuru: String(pick(raw, ["IlanTuru", "ilanTuru", "tur"]) ?? "") || undefined,
      basvuruBaslangic: toDateValue(pick(raw, ["basTarih", "BasDate", "basvuruBaslangic", "basvuruBaslangicTarihi", "sdate"])),
      basvuruBitis: toDateValue(pick(raw, ["bitTarih", "BitDate", "basvuruBitis", "basvuruBitisTarihi", "edate"])),
      anaIlanMetni: cleanHtml(String(pick(raw, ["anailanmetni", "anaIlanMetni", "ilanMetni", "icerik"]) ?? "")),
      basvuruLinki: (pick(raw, ["basvuruLinki", "BasvuruLinki"]) as string | null | undefined) ?? null,
      eDevletServisURL: (pick(raw, ["eDevletServisURL", "edevletServisURL"]) as string | null | undefined) ?? null,
      logoPath: (pick(raw, ["logo_Path", "logoPath"]) as string | null | undefined) ?? null,
      kontenjan,
      altIlanlar,
    };
    return { detail };
  } catch (error) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}
