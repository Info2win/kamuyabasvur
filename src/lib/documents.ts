import type { DocumentItem, JobRecord, Profile } from "./types";

const tr = (s: string) => s.toLocaleLowerCase("tr");

/** Genel + ilana özel belge/şart kontrol listesini üretir. */
export function buildDocumentChecklist(job: JobRecord, profile: Profile): DocumentItem[] {
  const parsed = job.parsed;
  const text = `${job.title} ${job.rawText ?? ""}`.toLocaleLowerCase("tr");
  const items: DocumentItem[] = [];
  const add = (item: DocumentItem) => {
    if (!items.some((i) => tr(i.label) === tr(item.label))) items.push(item);
  };

  add({ label: "Kimlik belgesi (nüfus cüzdanı) fotokopisi", source: "genel", done: false, hint: "e-Devlet'ten barkodlu nüfus kayıt örneği de kabul edilir." });
  add({
    label: "Diploma / mezuniyet belgesi (barkodlu)",
    source: "genel",
    done: false,
    hint: `e-Devlet → Öğrenci/Mezuniyet Belgesi Sorgulama. ${profile.educationLevel ? "Profilinizdeki seviye: " + profile.educationLevel : ""}`,
  });
  add({
    label: "KPSS sonuç belgesi",
    source: "genel",
    done: false,
    hint: profile.kpssScore ? `Profilinizde ${profile.kpssType || "KPSS"} ${profile.kpssScore} puan kayıtlı.` : "ÖSYM AİS'ten indirin.",
  });
  add({ label: "Adli sicil kaydı (e-Devlet barkodlu)", source: "genel", done: false });
  add({ label: "Vesikalık fotoğraf (4 adet)", source: "genel", done: false });
  add({ label: "Başvuru formu / dilekçe", source: "genel", done: false, hint: "Kurumun sitesindeki formu doldurup imzalayın." });
  add({ label: "İkametgâh belgesi", source: "genel", done: false, hint: "e-Devlet → Yerleşim Yeri Belgesi." });

  if (profile.gender === "erkek" || /askerlik/.test(text)) {
    add({ label: "Askerlik durum belgesi", source: "genel", done: false, hint: parsed.military ?? "e-Devlet'ten barkodlu alın." });
  }
  if (/sağlık raporu|saglik raporu|sağlık kurulu|görevini devamlı yapmasına engel/.test(text)) {
    add({ label: "Sağlık kurulu raporu", source: "ilana-ozel", done: false, hint: "Tam teşekküllü hastaneden, görev yapmaya engel hali olmadığını gösterir rapor." });
  }
  if (parsed.securityCheck) {
    add({ label: "Güvenlik soruşturması / arşiv araştırması formu", source: "ilana-ozel", done: false });
  }
  if (parsed.driverLicense?.length) {
    add({
      label: `Sürücü belgesi (${parsed.driverLicense.join(", ")})`,
      source: "ilana-ozel",
      done: Boolean(profile.driverLicense),
      hint: profile.driverLicense ? `Profilinizde kayıtlı: ${profile.driverLicense}` : "Ehliyet fotokopisi ve e-Devlet sürücü belgesi çıktısı.",
    });
  }
  if (parsed.certificates?.length) {
    for (const cert of parsed.certificates.slice(0, 4)) {
      add({
        label: cert,
        source: "ilana-ozel",
        done: (profile.certificates ?? []).some((c) => tr(c).includes(tr(cert.split(" ").pop() ?? cert))),
      });
    }
  }
  if (/özel güvenlik|ozel guvenlik|5188/.test(text)) {
    add({ label: "Özel güvenlik görevlisi kimlik kartı", source: "ilana-ozel", done: false, hint: "Geçerlilik süresini kontrol edin; silahlı/silahsız ayrımına dikkat." });
  }
  if (parsed.experienceYears) {
    add({
      label: `En az ${parsed.experienceYears} yıl deneyim belgesi`,
      source: "ilana-ozel",
      done: (profile.experienceYears ?? 0) >= parsed.experienceYears,
      hint: "SGK hizmet dökümü + işyerinden alınmış çalışma/bonservis belgesi.",
    });
  }
  if (/boy|kilo|fiziki/.test(text)) {
    add({ label: "Boy-kilo ölçümü / fiziki yeterlilik hazırlığı", source: "ilana-ozel", done: false });
  }
  if (/yabancı dil|yds|ingilizce/.test(text)) {
    add({ label: "Yabancı dil belgesi (YDS/e-YDS)", source: "ilana-ozel", done: Boolean((profile.languages ?? []).length) });
  }
  if (/şahsen|sahsen/.test(text)) {
    add({ label: "Belgeleri elden teslim için randevu/plan", source: "ilana-ozel", done: false, hint: "Mesai saatleri içinde teslim edilmesi gerekiyor." });
  }

  return items;
}
