/** Türkiye'nin 81 ili (plaka kodu sırasıyla). */
export const CITIES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir",
  "Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli",
  "Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari",
  "Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir",
  "Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir",
  "Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat",
  "Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman",
  "Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce",
] as const;

export type City = (typeof CITIES)[number];

export const REGIONS: Record<string, string[]> = {
  Marmara: ["İstanbul","Bursa","Kocaeli","Sakarya","Tekirdağ","Edirne","Kırklareli","Yalova","Balıkesir","Çanakkale","Bilecik","Düzce","Bolu"],
  Ege: ["İzmir","Aydın","Denizli","Muğla","Manisa","Afyonkarahisar","Kütahya","Uşak"],
  Akdeniz: ["Antalya","Adana","Mersin","Hatay","Kahramanmaraş","Osmaniye","Isparta","Burdur"],
  "İç Anadolu": ["Ankara","Konya","Kayseri","Eskişehir","Sivas","Yozgat","Kırşehir","Nevşehir","Aksaray","Karaman","Kırıkkale","Çankırı","Kastamonu","Niğde"],
  "Karadeniz": ["Samsun","Trabzon","Ordu","Giresun","Rize","Artvin","Amasya","Tokat","Çorum","Sinop","Kastamonu","Bartın","Karabük","Zonguldak","Bayburt","Gümüşhane"],
  "Doğu Anadolu": ["Erzurum","Malatya","Van","Elazığ","Erzincan","Kars","Ağrı","Muş","Bitlis","Hakkari","Tunceli","Bingöl","Iğdır","Ardahan","Şırnak"],
  "Güneydoğu Anadolu": ["Gaziantep","Şanlıurfa","Diyarbakır","Mardin","Batman","Adıyaman","Siirt","Kilis"],
};

const NORMALIZE_MAP: [RegExp, string][] = [
  [/afyon/gi, "Afyonkarahisar"],
  [/icel|mersin/gi, "Mersin"],
  [/kahramanmaras|maras/gi, "Kahramanmaraş"],
  [/sanliurfa|urfa/gi, "Şanlıurfa"],
  [/kirklareli/gi, "Kırklareli"],
  [/mus\b/gi, "Muş"],
];

/** Serbest metinden il adlarını bulur. */
export function extractCities(text: string): string[] {
  if (!text) return [];
  let normalized = text.toLocaleLowerCase("tr");
  for (const [pattern, replacement] of NORMALIZE_MAP) {
    normalized = normalized.replace(pattern, (m) => m);
    void replacement;
  }
  const found = new Set<string>();
  for (const city of CITIES) {
    const lower = city.toLocaleLowerCase("tr");
    const plain = lower
      .replaceAll("ı", "i")
      .replaceAll("ş", "s")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c");
    const haystackPlain = normalized
      .replaceAll("ı", "i")
      .replaceAll("ş", "s")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c");
    const re = new RegExp(`(^|[^a-zçğıöşü])${plain}([^a-zçğıöşü]|$)`, "i");
    if (re.test(haystackPlain)) found.add(city);
  }
  // "Muş" gibi kısa illerin yanlış pozitiflerini azalt
  if (found.has("Muş") && !/muş(\s|,|\.|\n)/i.test(text)) found.delete("Muş");
  if (found.has("Van") && !/\bvan\b/i.test(text)) found.delete("Van");
  return [...found];
}

export function normalizeCityName(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const plain = value
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
  for (const city of CITIES) {
    const cityPlain = city
      .toLocaleLowerCase("tr")
      .replaceAll("ı", "i")
      .replaceAll("ş", "s")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c");
    if (cityPlain === plain || cityPlain.includes(plain) || plain.includes(cityPlain)) return city;
  }
  return null;
}
