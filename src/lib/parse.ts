import { extractCities } from "./cities";
import type { EducationLevel, KpssRequirement, ParsedRequirements } from "./types";

const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr.filter((x) => x !== undefined && x !== null && x !== "")));

/** HTML'i düz metne çevirir. */
export function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const TR_MONTHS: Record<string, number> = {
  ocak: 1, subat: 2, şubat: 2, mart: 3, nisan: 4, mayis: 5, mayıs: 5,
  haziran: 6, temmuz: 7, agustos: 8, ağustos: 8, eylul: 9, eylül: 9,
  ekim: 10, kasim: 11, kasım: 11, aralik: 12, aralık: 12,
};

function toDate(day: number, month: number, year: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day, 21, 0, 0));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

type DateHit = { date: Date; context: string };

export function parseDates(text: string): { start: Date | null; end: Date | null } {
  const hits: DateHit[] = [];
  const push = (d: Date | null, ctx: string) => {
    if (d) hits.push({ date: d, context: ctx.toLocaleLowerCase("tr") });
  };

  const numeric = /(\d{1,2})[./](\d{1,2})[./](20\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = numeric.exec(text))) {
    const ctx = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40);
    push(toDate(+m[1], +m[2], +m[3]), ctx);
  }

  const written = /(\d{1,2})\s+(Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik)\s+(20\d{2})/gi;
  while ((m = written.exec(text))) {
    const month = TR_MONTHS[m[2].toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c] ?? c)];
    const ctx = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40);
    push(toDate(+m[1], month, +m[3]), ctx);
  }

  if (!hits.length) return { start: null, end: null };

  const endHint = /(son|bitiş|bitis|kadar|en geç|son başvuru|tamamlanmas|sone erme|erme)/;
  const startHint = /(başlangıç|baslangic|başvuruların başlad|basvuru basla|itibaren|başlayacak)/;

  const ends = hits.filter((h) => endHint.test(h.context));
  const starts = hits.filter((h) => startHint.test(h.context));

  const sorted = [...hits].sort((a, b) => a.date.getTime() - b.date.getTime());
  const end = ends.length ? ends[ends.length - 1].date : sorted[sorted.length - 1].date;
  const start = starts.length ? starts[0].date : sorted.find((h) => h.date.getTime() < end.getTime())?.date ?? null;
  return { start, end };
}

const TR_MONTH_MAP: Record<string, number> = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7,
  agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
};

function monthNumber(raw: string): number | null {
  const key = raw
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  return TR_MONTH_MAP[key] ?? null;
}

export type TurkishDateRange = { start: Date | null; end: Date | null; matched: string };

/**
 * "14 Ekim - 28 Ekim", "21 Ekim - 1 Kasım", "5 Kasım" gibi yıl içermeyen
 * Türkçe tarih ifadelerini çözer (SBB liste satırlarında bu biçim kullanılır).
 */
export function parseTurkishDateRange(text: string, now = new Date()): TurkishDateRange {
  const months = "Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik";
  const rangeRe = new RegExp(`(\\d{1,2})\\s+(${months})\\s*[-–—]\\s*(\\d{1,2})\\s+(${months})`, "iu");
  const singleRe = new RegExp(`(\\d{1,2})\\s+(${months})\\b`, "iu");

  const build = (day: number, month: number, year: number) => {
    const d = new Date(Date.UTC(year, month - 1, day, 21, 0, 0));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const currentYear = now.getUTCFullYear();
  const range = text.match(rangeRe);
  if (range) {
    const m1 = monthNumber(range[2]);
    const m2 = monthNumber(range[4]);
    if (m1 && m2) {
      let startYear = currentYear;
      // Geçmişte kalan bir aralık muhtemelen gelecek yıla aittir
      const candidateStart = build(+range[1], m1, startYear);
      if (candidateStart && candidateStart.getTime() < now.getTime() - 120 * 86_400_000) startYear += 1;
      const start = build(+range[1], m1, startYear);
      const endYear = m2 < m1 ? startYear + 1 : startYear;
      const end = build(+range[3], m2, endYear);
      return { start, end, matched: range[0] };
    }
  }

  const single = text.match(singleRe);
  if (single) {
    const m = monthNumber(single[2]);
    if (m) {
      let year = currentYear;
      const candidate = build(+single[1], m, year);
      if (candidate && candidate.getTime() < now.getTime() - 120 * 86_400_000) year += 1;
      const end = build(+single[1], m, year);
      return { start: null, end, matched: single[0] };
    }
  }

  return { start: null, end: null, matched: "" };
}

/** Başlıktaki tarih ifadelerini temizler ("14 Ekim - 28 Ekim", "12.10.2026"). */
export function stripDateExpressions(text: string): string {
  const months = "Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik";
  return text
    .replace(new RegExp(`(\\d{1,2})\\s+(?:${months})\\s*[-–—]\\s*(\\d{1,2})\\s+(?:${months})`, "giu"), " ")
    .replace(new RegExp(`(\\d{1,2})\\s+(?:${months})\\b`, "giu"), " ")
    .replace(/\d{1,2}[./]\d{1,2}[./]20\d{2}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** "DÜZCE ÜNİVERSİTESİ 153 SÖZLEŞMELİ PERSONEL ALACAK" → kurum + kalan başlık */
export const INSTITUTION_SUFFIX =
  /(BAŞKANLIĞI|BASKANLIGI|BAKANLIĞI|BAKANLIGI|ÜNİVERSİTESİ|UNIVERSITESI|REKTÖRLÜĞÜ|REKTORLUGU|BELEDİYESİ|BELEDIYESI|GENEL MÜDÜRLÜĞÜ|GENEL MUDURLUGU|MÜDÜRLÜĞÜ|MUDURLUGU|AJANSI|KURUMU|KOMUTANLIĞI|KOMUTANLIGI|ENSTİTÜSÜ|ENSTITUSU|BANKASI|A\.Ş\.|OFİSİ|OFISI|SEKRETERLİĞİ|SEKRETERLIGI|İDARESİ|IDARESI|TEŞKİLATI|TESKILATI|BAŞSAVCILIĞI|BASSAVCILIGI|HASTANESİ|HASTANESI)/i;

export function splitInstitution(title: string): { institution: string; rest: string } {
  if (title.includes(" - ")) {
    const index = title.indexOf(" - ");
    return { institution: title.slice(0, index).trim(), rest: title.slice(index + 3).trim() };
  }
  // "ANKARA ÜNİVERSİTESİ REKTÖRLÜĞÜ" gibi çok ekli adlarda en sağdaki ek esas alınır.
  const global = new RegExp(INSTITUTION_SUFFIX.source, "gi");
  let last: RegExpExecArray | null = null;
  let found: RegExpExecArray | null;
  while ((found = global.exec(title)) !== null) {
    last = found;
    if (found.index === global.lastIndex) global.lastIndex += 1;
  }
  if (last) {
    const end = last.index + last[0].length;
    const institution = title.slice(0, end).trim();
    const rest = title.slice(end).trim();
    if (institution.length >= 6 && rest.length >= 4) return { institution, rest };
  }
  return { institution: "", rest: title };
}

export function parseKpss(text: string): { requirements: KpssRequirement[]; years: number[] } {
  const requirements: KpssRequirement[] = [];
  const years = new Set<number>();
  const re = /kpss/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const window = text.slice(m.index, m.index + 140);
    const typeMatch =
      window.match(/kpss\s*-?\s*p\s?(\d{1,3})/i) ??
      window.match(/\bp\s?(\d{1,3})\b/i) ??
      window.match(/kpss\s*-?\s*(\d{1,3})\b/i);
    const scoreMatch =
      window.match(/(?:en az|asgari|minimum|min\.?|:|\s)\s*(\d{2})\s*(?:puan|ve üzeri|üstü|üzerinde)?/i) ??
      window.match(/(\d{2})\s*puan/i);
    // Yıl yalnızca "KPSS" kelimesine bitişikse alınır (tarihlerle karışmasın).
    const near = `${text.slice(Math.max(0, m.index - 22), m.index)} ${window.slice(0, 26)}`;
    const yearMatch =
      near.match(/(20\d{2})\s*(?:yılı\s*)?kpss/i) ??
      near.match(/kpss\s*[-–/]?\s*(20\d{2})/i) ??
      near.match(/\b(20\d{2})\b/);
    if (yearMatch) years.add(+yearMatch[1]);

    const type = typeMatch ? `P${typeMatch[1]}` : undefined;
    const score = scoreMatch ? +scoreMatch[1] : undefined;
    const validScore = score && score >= 40 && score <= 100 ? score : undefined;
    if (type || validScore) {
      const exists = requirements.find((r) => r.type === type && r.min === validScore);
      if (!exists) requirements.push({ type, min: validScore, year: yearMatch ? +yearMatch[1] : undefined });
    }
    if (requirements.length > 8) break;
  }

  // "KPSS puanı aranmamaktadır" gibi durumlar
  if (/kpss\s*(puanı\s*)?(aranma|şartı\s*yok|gerekli\s*değil)/i.test(text)) return { requirements: [], years: [...years] };

  return { requirements, years: [...years] };
}

export function parseEducation(text: string): EducationLevel[] {
  const lower = text.toLocaleLowerCase("tr");
  const levels = new Set<EducationLevel>();
  if (/\blise\b|ortaöğretim|ortaogretim|\bmyo\b(?!.)/i.test(lower) && /\blise\b|ortaöğretim|ortaogretim/i.test(lower)) levels.add("lise");
  if (/ön\s?lisans|onlisans|önlisans|ön lisans|meslek yüksekokul|meslek yuksekokul|\bmyo\b/i.test(lower)) levels.add("onlisans");
  if (/yüksek\s?lisans|yuksek\s?lisans|tezli|master/i.test(lower)) levels.add("yuksek_lisans");
  if (/doktora|ph\.?\s?d\b/i.test(lower)) levels.add("doktora");

  // "lisans" — ön/yüksek lisans olmayan geçişler
  const lisansRe = /lisans/g;
  let m: RegExpExecArray | null;
  while ((m = lisansRe.exec(lower))) {
    const before = lower.slice(Math.max(0, m.index - 8), m.index);
    if (/ön|on\s?$|yüksek|yuksek|önlisans|onlisans/i.test(before)) continue;
    levels.add("lisans");
  }
  return [...levels];
}

export function parseAge(text: string): { ageMax?: number; ageMin?: number } {
  const patterns: { re: RegExp; key: "max" | "min" }[] = [
    { re: /(\d{2})\s*yaş(?:ını|ini)?\s*(?:doldurmamış|bitirmemiş|tamamlamamış|geçmemiş|aşmamış)/i, key: "max" },
    { re: /(\d{2})\s*yaşından\s*gün\s*almamış/i, key: "max" },
    { re: /(\d{2})\s*yaş(?:ından)?\s*(?:küçük|genç)\s*(?:olmak|olmamak)?/i, key: "max" },
    { re: /yaş\s*(?:şartı|sınırı|siniri)?\s*[:\-]?\s*(?:en fazla|azami|max\.?)?\s*(\d{2})/i, key: "max" },
    { re: /(\d{2})\s*yaş(?:ını)?\s*(?:tamamlamış|doldurmuş|bitirmiş)\s*(?:olmak)?/i, key: "min" },
    { re: /(\d{2})\s*yaşından\s*gün\s*almış/i, key: "min" },
  ];
  let ageMax: number | undefined;
  let ageMin: number | undefined;
  for (const { re, key } of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const value = +m[1];
    if (value < 15 || value > 70) continue;
    if (key === "max" && ageMax === undefined) ageMax = value;
    if (key === "min" && ageMin === undefined) ageMin = value;
  }
  const range = text.match(/(\d{2})\s*[-–]\s*(\d{2})\s*yaş/i);
  if (range) {
    ageMin = ageMin ?? +range[1];
    ageMax = ageMax ?? +range[2];
  }
  return { ageMax, ageMin };
}

export function parseGender(text: string): "kadin" | "erkek" | undefined {
  const strong = [
    /(sadece|yalnızca|yalnizca|özellikle)\s+(kadın|bayan|erkek|bay)\b/i,
    /\b(kadın|bayan)\s+(aday|personel|olmak)\b/i,
    /\b(erkek|bay)\s+(aday|personel|olmak)\b/i,
    /\((kadın|erkek)\)/i,
    /cinsiyet\s*[:\-]?\s*(kadın|erkek|bayan|bay)\b/i,
    /\b(erkek)\s+olmak\b/i,
    /\b(kadın)\s+olmak\b/i,
  ];
  for (const re of strong) {
    const m = text.match(re);
    if (!m) continue;
    const value = m[2] ?? m[1];
    if (!value) continue;
    const lower = value.toLocaleLowerCase("tr");
    if (lower === "kadın" || lower === "bayan") return "kadin";
    if (lower === "erkek" || lower === "bay") return "erkek";
  }
  return undefined;
}

const NOISE_DEPARTMENTS = [
  "herhangi bir", "fakültelerin", "yukarıda", "ilanda", "belirtilen", "mezunu olmak", "bölüm", "program",
  "üniversitelerin", "universitelerin", "en az", "tercihen", "diğer", "diger",
];

/** Tek başına öğrenim seviyesi bildiren kelimeler bölüm sayılmaz. */
const BARE_EDUCATION_WORDS = /^(ön\s?lisans|onlisans|lisans|lise|ortaöğretim|ortaogretim|ön lisans|yüksek lisans|doktora|mezunu|mezun|bölümü|programı)$/i;

export function parseDepartments(text: string): string[] {
  const found = new Set<string>();
  const suffixRe =
    /([A-ZÇĞİÖŞÜa-zçğıöşü][A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,40}?\s*(?:Mühendisliği|Mühendislik|Bölümü|Bölüm|Programı|Program|Anabilim Dalı|Yüksekokulu|Fakültesi|Hizmetleri|Yönetimi|Teknolojisi|Bilimleri))/g;
  let m: RegExpExecArray | null;
  while ((m = suffixRe.exec(text))) {
    const raw = m[1].replace(/\s+/g, " ").trim();
    if (raw.length < 4 || raw.length > 60) continue;
    if (NOISE_DEPARTMENTS.some((n) => raw.toLocaleLowerCase("tr").includes(n))) continue;
    found.add(raw.split(" ").slice(-4).join(" "));
  }

  // Satır sonunu aşmayacak şekilde (boşluk dahil, \n hariç) yakala.
  const mezunRe = /([A-Za-zçğıöşüÇĞİÖŞÜ ,/().-]{4,90}?)\s+(?:bölüm(?:ü|lerinden|lerinden birinden)?|program(?:ı|larından)?|mezun(?:u|ları))/gi;
  while ((m = mezunRe.exec(text))) {
    const chunk = m[1];
    for (const part of chunk.split(/[,/;]/)) {
      const raw = part.replace(/\s+/g, " ").replace(/^(?:ve|veya|ile|ya da|fakültelerin|üniversitelerin|okulların|herhangi bir)\s+/gi, "").trim();
      if (raw.length < 3 || raw.length > 50) continue;
      if (NOISE_DEPARTMENTS.some((n) => raw.toLocaleLowerCase("tr").includes(n))) continue;
      if (!/[A-Za-zçğıöşü]/.test(raw)) continue;
      found.add(raw);
    }
  }

  return unique([...found])
    .map((d) =>
      d
        .replace(/\s+/g, " ")
        .replace(/[().]/g, " ")
        .replace(/\s+(lisans|ön\s?lisans|onlisans|lise|ortaöğretim|mezunu|mezun|düzeyinde|bölümü|bölüm|programı|program|anabilim dalı)$/gi, " ")
        .trim(),
    )
    .filter((d) => d.length > 2 && !BARE_EDUCATION_WORDS.test(d))
    .slice(0, 14);
}

export function parseDriverLicense(text: string): string[] {
  const found = new Set<string>();
  const re = /\b([ABCED]\d?)\s*(?:sınıfı|sinifi)\s*(?:sürücü|surucu|ehliyet)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) found.add(`${m[1].toLocaleUpperCase("tr")} sınıfı`);
  if (!found.size && /(ehliyet|sürücü belgesi|surucu belgesi)/i.test(text)) found.add("Ehliyet (sınıf belirtilmemiş)");
  return [...found];
}

export function parsePositions(text: string): ParsedRequirements["positions"] {
  const positions: ParsedRequirements["positions"] = [];
  const lines = text.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length > 120) continue;
    const m = line.match(/^[\-•*\d.)\s]*([A-ZÇĞİÖŞÜ][A-Za-zçğıöşüÇĞİÖŞÜ()/.,\s-]{3,60}?)\s+(\d{1,4})(?:\s+(P\d{1,3}))?\s*(?:\||$|\s)/);
    if (!m) continue;
    const title = m[1].trim();
    if (/\b(KPSS|BAŞVURU|BASVURU|İLAN|TOPLAM|GENEL|ŞARTLAR|AÇIKLAMA|TARİH|ADET|KONTENJAN|SIRA|NO)\b/i.test(title)) continue;
    if (title.split(" ").length > 7) continue;
    positions.push({ title, count: +m[2], kpssType: m[3] });
    if (positions.length >= 24) break;
  }
  return positions;
}

export function parseKadroCount(text: string, title: string, positions: ParsedRequirements["positions"]): number | null {
  // Türkçe büyük/küçük harf (İ/i, I/ı) sorunu yaşamamak için metin tr olarak küçültülür.
  const sources = [title, text.slice(0, 1400)].map((s) => (s ?? "").toLocaleLowerCase("tr"));
  const patterns = [
    /(\d{1,4})\s*(?:adet\s*)?(?:kişilik\s*)?(?:sözleşmeli\s*|sürekli\s*|geçici\s*|kadrolu\s*|açıktan\s*)?(?:personel|memur|işçi|öğretim|uzman|hemşire|destek personeli|kadro|bilişim personeli|mühendis|subay|astsubay|zabıta|şoför|tekniker|büro personeli|güvenlik)/,
    /(\d{1,4})\s+(?:iç denetçi|çözümleyici|programcı|avukat|psikolog|ebe|sağlık|idari|akademik|araştırma)/,
    /\((\d{1,4})\s*(?:kişilik|adet)/,
    /kontenjan\s*[:\-]?\s*(\d{1,4})/,
    /toplam\s*(\d{1,4})\s*(?:kişi|kadrolu|personel|adet)/,
  ];
  for (const src of sources) {
    for (const re of patterns) {
      const m = src.match(re);
      if (m) {
        const value = +m[1];
        if (value > 0 && value < 20000) return value;
      }
    }
  }
  const total = positions.reduce((sum, p) => sum + (p.count ?? 0), 0);
  return total > 0 && total < 20000 ? total : null;
}

export function parseConditions(text: string): string[] {
  const keyTerms = /(olmak|şartı|sartı|aranmakta|istenmekte|tercihen|tercih edilir|belgesi|sertifika|en az|sahip|zorunlu|gerekli|yapmış|edilmiş|meb|onaylı)/i;
  const chunks = text
    .split(/(?:\n|;|(?<=[a-zçğıöşü)]\.)\s+(?=[A-ZÇĞİÖŞÜ(0-9]))/)
    .map((c) => c.replace(/\s+/g, " ").trim())
    .filter((c) => c.length > 12 && c.length < 220 && keyTerms.test(c))
    .filter((c) => !/^(http|www\.)/i.test(c));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of chunks) {
    const key = chunk.toLocaleLowerCase("tr").slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chunk.endsWith(".") ? chunk : `${chunk}.`);
    if (out.length >= 16) break;
  }
  return out;
}

export function parseApplicationMethods(text: string): { methods: string[]; applyUrl?: string } {
  const methods = new Set<string>();
  const lower = text.toLocaleLowerCase("tr");
  if (/kariyer kapısı|kariyerkapisi|kamu işe alım/i.test(lower)) methods.add("Kariyer Kapısı");
  if (/e-devlet|edevlet|turkiye\.gov\.tr/i.test(lower)) methods.add("e-Devlet");
  if (/şahsen|sahsen|elden teslim/i.test(lower)) methods.add("Şahsen başvuru");
  if (/posta|kargo|iadeli taahhütlü|aps ile/i.test(lower)) methods.add("Posta / kargo");
  if (/e-posta|e-mail|eposta|mail yoluyla|@/i.test(lower)) methods.add("E-posta");
  if (/işkur|is kur/i.test(lower)) methods.add("İŞKUR");
  if (/yazılı sınav|sözlü sınav|mulakat|mülakat|giriş sınavı|uygulamalı sınav/i.test(lower)) methods.add("Sınav / mülakat");
  const urlMatch = text.match(/https?:\/\/[^\s"'<>)\]]+/i);
  const applyUrl = urlMatch ? urlMatch[0].replace(/[.,;]+$/, "") : undefined;
  if (applyUrl && !/kamuilan\.sbb\.gov\.tr|kariyerkapisi\.gov\.tr\/IlanDetay/i.test(applyUrl)) methods.add("Kurum internet sitesi");
  if (!methods.size) methods.add("Kurum duyurusunu kontrol edin");
  return { methods: [...methods], applyUrl };
}

export function parseCertificates(text: string): string[] {
  const found = new Set<string>();
  const re = /([A-Za-zçğıöşüÇĞİÖŞÜ0-9\s().,-]{3,45}?\s*(?:sertifika|belgesi|belgesine|ehliyet|bonservis|ustalık belgesi))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[1].replace(/\s+/g, " ").trim();
    const lower = raw.toLocaleLowerCase("tr");
    if (/(sağlık raporu|adli sicil|ikametgah|nüfus|diploma|kpss|askerlik)/.test(lower)) continue;
    if (raw.length < 6) continue;
    found.add(raw.split(" ").slice(-4).join(" "));
    if (found.size >= 8) break;
  }
  return [...found];
}

export function classifyIlanType(title: string, category: string | null, text: string): string {
  const haystack = `${title} ${category ?? ""} ${text.slice(0, 600)}`.toLocaleLowerCase("tr");
  if (/sözleşmeli bilişim|bilişim personeli/.test(haystack)) return "sozlesmeli";
  if (/öğretim üyesi|araştırma görevlisi|akademik|doçent|profesör/.test(haystack)) return "akademik";
  if (/uzman yardımcılığı|müfettiş yardımcılığı|denetmen yardımcılığı|kaymakam|giriş sınavı|kariyer meslek|stajyer kontrolör/.test(haystack)) return "kariyer";
  if (/subay|astsubay|askeri|jandarma|sahil güvenlik|bekçi|polis memuru|uzman erbaş|muhtelif/.test(haystack)) return "askeri";
  if (/zabıt katibi|icra katibi|infaz koruma|adalet komisyonu|mübaşir/.test(haystack)) return "yargi";
  if (/sürekli işçi|kamu işçisi|geçici işçi|işçi alımı|temizlik görevlisi|beden işçisi/.test(haystack)) return "isci";
  if (/sözleşmeli|4\/b|4-b/.test(haystack)) return "sozlesmeli";
  if (/kadrolu|4\/a|4-a|merkezi yerleştirme|atama/.test(haystack)) return "kadro";
  return "diger";
}

export function classifyInstitutionType(institution: string | null, title: string): string {
  const hay = `${institution ?? ""} ${title}`.toLocaleLowerCase("tr");
  if (/üniversite|universite|rektörlü/.test(hay)) return "universite";
  if (/belediye|büyükşehir|buyuksehir/.test(hay)) return "belediye";
  if (/yargıtay|danıştay|adalet|başsavcılık|mahkeme|anayasa/.test(hay)) return "yargi";
  if (/jandarma|emniyet|milli savunma|msb|sahil güvenlik|kara kuvvetleri|hava kuvvetleri|deniz kuvvetleri|genelkurmay/.test(hay)) return "askeri";
  if (/bakanlık|bakanligi|bakanlığı/.test(hay)) return "bakanlik";
  if (/\ba\.?ş\.?\b|tcdd|dhmi|tei̇aş|teias|botaş|tpao|ptt|trt|çaykur|etyemek|tmo|tki|eüaş|ttk|kıyı emniyeti|ziraat bankası|halkbank|vakıfbank|kalkınma ajansı/.test(hay)) return "kit";
  return "diger";
}

export type ParseInput = {
  title?: string;
  text?: string;
  category?: string | null;
  parsedFrom?: ParsedRequirements["parsedFrom"];
};

/** İlan başlığı + metninden yapılandırılmış şartları çıkarır. */
export function parseIlan(input: ParseInput): ParsedRequirements {
  const title = input.title ?? "";
  const rawText = cleanHtml(input.text ?? "");
  const haystack = `${title}\n${rawText}`;
  const hasBody = rawText.length > 120;

  const { requirements, years } = parseKpss(haystack);
  const education = parseEducation(haystack);
  const { ageMax, ageMin } = parseAge(haystack);
  const gender = parseGender(haystack);
  const departments = parseDepartments(haystack);
  const driverLicense = parseDriverLicense(haystack);
  const positions = hasBody ? parsePositions(rawText) : [];
  const certificates = parseCertificates(haystack);

  const experienceMatch = haystack.match(/en az\s+(\d+)\s+yıl[^\n.]{0,50}?(deneyim|tecrübe|tecrube|çalışmış|calismis)/i);
  const experienceYears = experienceMatch ? +experienceMatch[1] : undefined;

  const militaryMatch = haystack.match(/askerlik[^\n.]{0,70}/i);
  const military = militaryMatch ? militaryMatch[0].replace(/\s+/g, " ").trim().slice(0, 120) : undefined;

  const conditions = parseConditions(haystack);

  const signals = [requirements.length, education.length, ageMax ? 1 : 0, departments.length, conditions.length];
  const score = signals.reduce((a, b) => a + b, 0);
  const confidence = Math.max(0, Math.min(100, Math.round((hasBody ? 40 : 10) + score * 6)));

  return {
    kpss: requirements,
    education,
    ageMax,
    ageMin,
    gender,
    departments,
    driverLicense,
    experienceYears,
    certificates,
    military,
    disabilityPreferred: /engelli|özürlü/i.test(haystack),
    securityCheck: /güvenlik soruşturması|guvenlik sorusturmasi|arşiv araştırması|arsiv arastirmasi/i.test(haystack),
    travelRequired: /seyahat engeli|görev yapmaya|şehir dışında görev|farklı illerde görev/i.test(haystack),
    applicationMethods: [],
    conditions,
    positions,
    kpssExamYears: years,
    confidence,
    parsedFrom: input.parsedFrom ?? (hasBody ? "detay" : "baslik"),
  };
}
