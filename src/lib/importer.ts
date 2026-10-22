import { extractCities } from "./cities";
import {
  classifyIlanType,
  classifyInstitutionType,
  cleanHtml,
  INSTITUTION_SUFFIX,
  parseApplicationMethods,
  parseDates,
  parseIlan,
  parseKadroCount,
  parseTurkishDateRange,
  splitInstitution,
  stripDateExpressions,
} from "./parse";
import type { JobRecord } from "./types";

export type ImportedRow = {
  guid: string | null;
  title: string;
  institution: string;
  applicationStart: Date | null;
  applicationEnd: Date | null;
  publishedAt: Date | null;
};

/** Slogan/navigasyon satırları: ilan fiili veya sayı içermiyorsa elenir. */
const SLOGAN = /(tek adreste|tüm kamu personel|tum kamu personel|cumhurbaşkanlığı strateji|strateji ve bütçe başkanlığı|kamu ilan portalı|©|telif hakkı)/i;
const ILAN_HINT = /(alacak|alımı|alimi|ilanı|ilani|temini|sınavı|sinavi|duyurusu|başvuru|basvuru|personel al|işçi al|isci al|\d{1,3}\s)/i;

const NOISE = /^(ana sayfa|hakkımızda|hakkinda|iletişim|iletisim|giriş yap|e-devlet|kariyer kapısı|arama|kurum seçiniz|il seçiniz|ilan türü|i̇lan türü|başvur$|ilana git$|tümü|liste|sayfa|kaydet|menü|menu|rss|twitter|facebook|instagram|linkedin|youtube|©|telif|gizlilik|çerez|cerez|kvks|k\.v\.k\.k|duyurular|mevzuat|sık sorulan|s.s.s|ileti̇şi̇m|strateji ve bütçe|cumhurbaşkanlığı|t\.c\.)/i;

/** Pencere kesildiği için yarım kalan HTML etiketlerini temizler. */
function trimPartialTags(input: string): string {
  let out = input;
  const firstLt = out.indexOf("<");
  const firstGt = out.indexOf(">");
  if (firstGt !== -1 && (firstLt === -1 || firstGt < firstLt)) out = out.slice(firstGt + 1);
  const lastLt = out.lastIndexOf("<");
  const lastGt = out.lastIndexOf(">");
  if (lastLt !== -1 && lastLt > lastGt) out = out.slice(0, lastLt);
  return out;
}

function toDate(value: string): Date | null {
  const m = value.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 21, 0, 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickTitle(lines: string[]): { title: string; institution: string } {
  const cleaned = lines
    .map((l) => l.replace(/<[^>]*>?/g, " ").replace(/[{};]/g, " ").replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2 && !NOISE.test(l))
    .filter((l) => !/style=|class=|function\(|var |=>|\.js|\.css|https?:\/\//i.test(l))
    .filter((l) => /[A-Za-zçğıöşüÇĞİÖŞÜ]{4}/.test(l));
  if (!cleaned.length) return { title: "", institution: "" };

  // SBB listesinde kurum adı ayrı satırda durur: "DÜZCE ÜNİVERSİTESİ" gibi.
  const instLine = cleaned.find((l) => INSTITUTION_SUFFIX.test(l) && l.length <= 90);
  const candidates = cleaned.filter((l) => l !== instLine);
  const withDash = candidates.filter((l) => l.includes(" - ") && l.length >= 15);
  const longest = [...candidates].sort((a, b) => b.length - a.length)[0];
  let title = (withDash[0] ?? longest ?? instLine ?? "").slice(0, 260).trim();
  if (!title) return { title: "", institution: "" };

  let institution = "";
  // "14 Ekim - 28 Ekim" içindeki tire kurum ayracı sanılmasın: önce tarihleri soyutla.
  const forSplit = stripDateExpressions(title);
  if (forSplit.includes(" - ")) {
    institution = forSplit.slice(0, forSplit.indexOf(" - ")).trim();
  } else if (instLine && instLine !== title) {
    institution = instLine;
    title = `${instLine} - ${title}`;
  } else {
    const parts = splitInstitution(title);
    if (parts.institution && parts.rest) {
      institution = parts.institution;
      title = `${parts.institution} - ${parts.rest}`;
    }
  }
  return { title, institution };
}

/**
 * Ham satırı rafine eder: Türkçe tarih aralığını ("14 Ekim - 28 Ekim") ve sayısal
 * tarihleri başlıktan ayırıp başvuru tarihine dönüştürür, büyük harfli başlıklarda
 * kurum adını öne çıkarır, slogan satırlarını eler.
 */
export function refineRow(row: ImportedRow): ImportedRow | null {
  let title = row.title.replace(/\s+/g, " ").trim();

  const range = parseTurkishDateRange(title);
  if (range.matched) {
    title = title.replace(range.matched, " ");
  }
  title = title
    .replace(/\d{1,2}[./]\d{1,2}[./]20\d{2}/g, " ")
    .replace(/\s+[-–—]\s+/g, " ")
    .replace(/\(\s*[-–—]?\s*\)/g, " ")
    .replace(/[\s\-–—]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (title.length < 10) return null;
  if (SLOGAN.test(title) && !ILAN_HINT.test(title)) return null;

  const numeric = parseDates(title);
  const { institution, rest } = splitInstitution(title);
  const prettyTitle = institution && rest && !title.includes(" - ") ? `${institution} - ${rest}` : title;
  // Kurum adı, ilan fiili/sayı içeren uzun bir satırsa güvenilmez → başlıktan yeniden türet.
  const unreliable = !institution || /(alacak|alımı|alimi|temini|personel|memur|işçi|isci|\d{2,})/i.test(institution);

  const iptal = /(iptal|erteleme|düzeltme|duzeltme|sonuç ilan|sonuc ilan)/i.test(prettyTitle);

  return {
    ...row,
    title: prettyTitle,
    institution: !unreliable ? institution : prettyTitle.includes(" - ") ? prettyTitle.slice(0, prettyTitle.indexOf(" - ")).trim() : institution,
    applicationStart: row.applicationStart ?? range.start ?? numeric.start,
    applicationEnd: row.applicationEnd ?? range.end ?? numeric.end,
    publishedAt: row.publishedAt ?? (iptal ? null : null),
  };
}

/** Yapıştırılan ilan listesi HTML/metninden tüm satırları çıkarır. */
export function extractRows(content: string): ImportedRow[] {
  const rows: ImportedRow[] = [];
  const seen = new Set<string>();

  // 1) Bağlantı içeren liste (kamuilan.sbb.gov.tr / kariyerkapisi.gov.tr sayfa kaynağı)
  const linkRe = /IlanDetay\?i=([0-9a-fA-F-]{8,})/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(content))) {
    const guid = m[1];
    if (seen.has(guid)) continue;
    // Pencereyi yalnızca bu satırla sınırla: önceki kayıt sınırından (hr / row / tr / önceki link) başlat.
    const rawStart = Math.max(0, m.index - 2200);
    const before = content.slice(rawStart, m.index);
    const cut = Math.max(
      before.lastIndexOf("<hr"),
      before.lastIndexOf("IlanDetay?i="),
      before.lastIndexOf('class="row'),
      before.lastIndexOf("<tr"),
    );
    const windowText = cleanHtml(trimPartialTags(before.slice(cut >= 0 ? cut : 0)));
    const lines = windowText.split(/\n+/);
    const { title, institution } = pickTitle(lines);
    if (!title) continue;
    const dates = [...windowText.matchAll(/(\d{1,2}[./]\d{1,2}[./]20\d{2})/g)].map((d) => d[1]);
    seen.add(guid);
    const refined = refineRow({
      guid,
      title,
      institution: institution || title.split(" - ")[0],
      applicationStart: null,
      applicationEnd: dates.length ? toDate(dates[dates.length - 1]) : null,
      publishedAt: null,
    });
    if (refined) rows.push(refined);
  }

  // İçerik HTML ise (bağlantı/liste etiketleri var) düz metin yoluna geçme: aynı ilanlar
  // iki kez eklenmesin.
  const looksLikeHtml = /<a\s|<div|<tr|<span|<table/i.test(content);
  if (rows.length >= 2 || (rows.length === 1 && looksLikeHtml)) return rows;

  // 2) Düz metin (kopyala-yapıştır liste)
  const lines = cleanHtml(content).split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim());
  let buffer: string[] = [];
  const flush = (dateText: string | null) => {
    if (!buffer.length) return;
    const local = buffer;
    buffer = [];

    // Yalnızca tarih içeren satırları ayır (ör. "25 Ekim - 8 Kasım") ve başlığa ipucu olarak ekle.
    let hint = dateText;
    const contentLines = local.filter((line) => {
      const tr = parseTurkishDateRange(line);
      const num = line.match(/(\d{1,2}[./]\d{1,2}[./]20\d{2})/);
      const trOnly = tr.matched && line.replace(tr.matched, "").replace(/[\s()]/g, "").length < 2;
      const numOnly = Boolean(num) && line.replace(num![0], "").replace(/[\s()]/g, "").length < 2;
      if ((trOnly || numOnly) && !hint) hint = (tr.matched || num![0]).trim();
      return !(trOnly || numOnly);
    });

    const picked = pickTitle(contentLines.length ? contentLines : local);
    const title = hint && !parseTurkishDateRange(picked.title).matched && !/\d{1,2}[./]\d{1,2}[./]20\d{2}/.test(picked.title)
      ? `${picked.title} ${hint}`
      : picked.title;
    const institution = picked.institution;
    if (!title || title.length < 12) return;
    const key = title.toLocaleLowerCase("tr").slice(0, 80);
    if (seen.has(key)) return;
    seen.add(key);
    const refined = refineRow({
      guid: null,
      title,
      institution: institution || title.split(" - ")[0],
      applicationStart: null,
      applicationEnd: dateText ? toDate(dateText) : null,
      publishedAt: null,
    });
    if (refined) rows.push(refined);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dm = line.match(/(\d{1,2}[./]\d{1,2}[./]20\d{2})/);
    if (dm) {
      const rest = line.replace(dm[0], "").trim();
      if (rest.length > 2) buffer.push(rest);
      flush(dm[1]);
      continue;
    }

    // "14 Ekim - 28 Ekim" gibi yıl içermeyen Türkçe tarih satırı da kaydı kapatır.
    const tr = parseTurkishDateRange(line);
    if (tr.matched) {
      buffer.push(line);
      flush(null);
      continue;
    }

    if (NOISE.test(line) || /^(başvur|ilana git|detay|devamı|…|\.{3})$/i.test(line)) continue;
    buffer.push(line);

    // Tek satırda kurum + unvan + fiil bir aradaysa kayıt tamamlanmıştır.
    const complete = INSTITUTION_SUFFIX.test(line) && /(alacak|alımı|alimi|temini|sınavı|sinavi|duyurusu|ilanı|ilani)/i.test(line);
    if (complete || buffer.length >= 4) flush(null);
  }
  flush(null);
  return rows;
}

function slug(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => map[c] ?? c)
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Çıkarılan satırlardan veritabanına yazılabilir ilan kayıtları üretir. */
export function rowsToJobs(rows: ImportedRow[], sourceUrl?: string): JobRecord[] {
  // İçe aktarılan kayıtlar her zaman "import" kaynağıyla işaretlenir (kanıt: yapıştırılan liste).
  const source = "import";
  const kariyer = /kariyerkapisi/i.test(sourceUrl ?? "");
  const now = new Date().toISOString();
  const out: JobRecord[] = [];

  for (const row of rows) {
    const parsed = parseIlan({ title: row.title, text: "", category: null, parsedFrom: "baslik" });
    const { methods, applyUrl } = parseApplicationMethods(row.title);
    parsed.applicationMethods = methods;
    const kadro = parseKadroCount(row.title, row.title, parsed.positions);
    const cities = extractCities(row.title);
    const guid = row.guid ?? `imp-${slug(row.title)}`;
    const detailUrl = row.guid
      ? `${kariyer ? "https://kariyerkapisi.gov.tr" : "https://kamuilan.sbb.gov.tr"}/IlanDetay?i=${row.guid}`
      : (sourceUrl?.trim() || null);
    const dates = parseDates(row.title);

    out.push({
      sourceKey: guid,
      source,
      title: row.title,
      institution: row.institution || row.title.split(" - ")[0],
      unit: null,
      ilanNo: null,
      category: /(iptal|erteleme|düzeltme|duzeltme)/i.test(row.title) ? "İptal / düzeltme duyurusu" : null,
      ilanType: classifyIlanType(row.title, null, ""),
      institutionType: classifyInstitutionType(row.institution, row.title),
      publishedAt: row.publishedAt?.toISOString() ?? dates.start?.toISOString() ?? now,
      applicationStart: row.applicationStart?.toISOString() ?? dates.start?.toISOString() ?? null,
      applicationEnd: row.applicationEnd?.toISOString() ?? dates.end?.toISOString() ?? null,
      kadroCount: kadro,
      cities,
      positions: parsed.positions,
      rawText: null,
      parsed,
      detailUrl,
      applyUrl: applyUrl ?? detailUrl,
      logoUrl: null,
      isDemo: false,
      fetchedAt: now,
    });
  }
  return out;
}

export function importIlanList(content: string, sourceUrl?: string): { jobs: JobRecord[]; rows: number } {
  const rows = extractRows(content);
  const jobs = rowsToJobs(rows, sourceUrl);
  return { jobs, rows: rows.length };
}
