import { EDUCATION_LABELS, EDUCATION_RANK } from "./types";
import type {
  EducationLevel,
  JobRecord,
  MatchFlag,
  MatchResult,
  Preferences,
  Profile,
} from "./types";

const tr = (s: string) => s.toLocaleLowerCase("tr");

function stripTurkish(s: string): string {
  return tr(s)
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

export function ageFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function deadlineDays(job: JobRecord): number | null {
  if (!job.applicationEnd) return null;
  const end = new Date(job.applicationEnd).getTime();
  if (Number.isNaN(end)) return null;
  return Math.floor((end - Date.now()) / 86_400_000);
}

function textHas(haystack: string, needle: string): boolean {
  return stripTurkish(haystack).includes(stripTurkish(needle));
}

function departmentsMatch(jobDepartments: string[], profileDepartments: string[], fieldOfStudy: string): boolean {
  if (!jobDepartments.length) return true;
  const profilePool = [...profileDepartments, fieldOfStudy].filter(Boolean).map(stripTurkish);
  if (!profilePool.length) return false;
  return jobDepartments.some((dept) => {
    const d = stripTurkish(dept);
    const tokens = d.split(/\s+/).filter((t) => t.length > 3);
    return profilePool.some((p) => {
      if (p.includes(d) || d.includes(p)) return true;
      return tokens.some((t) => p.includes(t));
    });
  });
}

function kpssCheck(job: JobRecord, profile: Profile): { flags: MatchFlag[]; penalty: number; bonus: number } {
  const flags: MatchFlag[] = [];
  let penalty = 0;
  let bonus = 0;
  const reqs = job.parsed?.kpss ?? [];
  if (!reqs.length) {
    flags.push({ kind: "unknown", label: "KPSS şartı belirtilmemiş", detail: "İlanda KPSS puan şartı bulunamadı; kurum duyurusunu kontrol edin." });
    return { flags, penalty, bonus };
  }

  const profileScores = [
    { type: profile.kpssType, score: profile.kpssScore },
    { type: profile.kpssTypeSecondary, score: profile.kpssScoreSecondary },
  ].filter((s) => s.score != null && s.score > 0);

  if (!profileScores.length) {
    flags.push({ kind: "unknown", label: "KPSS puanınız girilmemiş", detail: "Profilinize KPSS puanı ekleyin, uygunluk netleşsin." });
    return { flags, penalty: penalty + 8, bonus };
  }

  for (const req of reqs) {
    const best = profileScores
      .filter((s) => !req.type || !s.type || stripTurkish(s.type).includes(stripTurkish(req.type)) || stripTurkish(req.type).includes(stripTurkish(s.type)))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ??
      [...profileScores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

    const label = req.type ? `KPSS ${req.type}` : "KPSS";
    if (req.min == null) {
      flags.push({ kind: "unknown", label: `${label}: taban puan belirtilmemiş` });
      continue;
    }
    if ((best.score ?? 0) >= req.min) {
      bonus += 12;
      flags.push({
        kind: "match",
        label: `${label} şartını sağlıyorsunuz`,
        detail: `İstenen en az ${req.min}, sizin puanınız ${best.score}${best.type ? ` (${best.type})` : ""}.`,
      });
    } else {
      penalty += 45;
      flags.push({
        kind: "block",
        label: `${label} puanınız yetmiyor`,
        detail: `İstenen en az ${req.min}, sizin puanınız ${best.score ?? "-"}${best.type ? ` (${best.type})` : ""}.`,
      });
    }
  }

  const accepted = job.parsed?.kpssExamYears ?? [];
  if (accepted.length && profile.kpssYear && !accepted.includes(profile.kpssYear)) {
    penalty += 30;
    flags.push({
      kind: "block",
      label: "KPSS sınav yılınız uymuyor",
      detail: `İlan ${accepted.join(", ")} puanını istiyor, sizin sınav yılınız ${profile.kpssYear}.`,
    });
  }
  return { flags, penalty, bonus };
}

export type MatchedJob = {
  job: JobRecord;
  match: MatchResult;
  excluded: boolean;
  excludeReason?: string;
};

export function matchJob(job: JobRecord, profile: Profile, prefs: Preferences): MatchedJob {
  const flags: MatchFlag[] = [];
  let score = 50;
  let blocked = false;
  let excludeReason: string | undefined;

  const parsed = job.parsed;
  const bodyText = `${job.title} ${job.institution ?? ""} ${job.rawText ?? ""}`;

  // ---- Hariç tutulan anahtar kelimeler ----
  for (const keyword of prefs.excludeKeywords ?? []) {
    if (keyword && textHas(bodyText, keyword)) {
      excludeReason = `"${keyword}" içeren ilanlar gizlendi`;
      blocked = true;
      flags.push({ kind: "block", label: `Hariç tutulan kelime: ${keyword}` });
    }
  }

  // ---- Eğitim seviyesi ----
  const requiredEducation = parsed?.education ?? [];
  if (requiredEducation.length && profile.educationLevel) {
    const level = profile.educationLevel as EducationLevel;
    const allowed = requiredEducation.some((r) => EDUCATION_RANK[r] <= EDUCATION_RANK[level]);
    if (allowed) {
      score += 14;
      flags.push({ kind: "match", label: `Eğitim seviyeniz uygun (${EDUCATION_LABELS[level]})` });
    } else {
      score -= 55;
      blocked = true;
      flags.push({
        kind: "block",
        label: "Eğitim seviyeniz ilan şartını karşılamıyor",
        detail: `İlan ${requiredEducation.map((r) => EDUCATION_LABELS[r]).join(" / ")} istiyor, siz ${EDUCATION_LABELS[level]} mezunusunuz.`,
      });
    }
  } else if (requiredEducation.length && !profile.educationLevel) {
    flags.push({ kind: "unknown", label: "Eğitim seviyeniz girilmemiş", detail: `İlan ${requiredEducation.map((r) => EDUCATION_LABELS[r]).join(" / ")} istiyor.` });
  }

  // ---- Bölüm / program ----
  const departments = parsed?.departments ?? [];
  if (departments.length) {
    const pool = [...(profile.departments ?? []), profile.fieldOfStudy].filter(Boolean);
    if (!pool.length) {
      score -= 6;
      flags.push({ kind: "unknown", label: "Bölümünüz girilmemiş", detail: `İlan şu bölümleri istiyor: ${departments.slice(0, 4).join(", ")}` });
    } else if (departmentsMatch(departments, profile.departments ?? [], profile.fieldOfStudy)) {
      score += 16;
      flags.push({ kind: "match", label: "Mezun olduğunuz bölüm ilanla uyumlu", detail: departments.slice(0, 4).join(", ") });
    } else {
      score -= 45;
      blocked = true;
      flags.push({ kind: "block", label: "Bölümünüz ilan şartlarına uymuyor", detail: `İstenen: ${departments.slice(0, 4).join(", ")}` });
    }
  }

  // ---- KPSS ----
  const kpss = kpssCheck(job, profile);
  flags.push(...kpss.flags);
  score += kpss.bonus - kpss.penalty;
  if (kpss.flags.some((f) => f.kind === "block")) blocked = true;

  // ---- Yaş ----
  const age = ageFromBirthDate(profile.birthDate);
  if (parsed?.ageMax) {
    if (age == null) {
      flags.push({ kind: "unknown", label: `Yaş sınırı ${parsed.ageMax}`, detail: "Doğum tarihinizi girin, kontrol edelim." });
    } else if (age > parsed.ageMax) {
      score -= 50;
      blocked = true;
      flags.push({ kind: "block", label: "Yaş sınırını aşıyorsunuz", detail: `İlan ${parsed.ageMax} yaşını doldurmamış olmayı şart koşuyor, siz ${age} yaşındasınız.` });
    } else {
      score += 8;
      flags.push({ kind: "match", label: "Yaş şartını sağlıyorsunuz", detail: `Sınır ${parsed.ageMax}, yaşınız ${age}.` });
    }
  }
  if (parsed?.ageMin && age != null && age < parsed.ageMin) {
    score -= 40;
    blocked = true;
    flags.push({ kind: "block", label: "Alt yaş sınırının altındasınız", detail: `En az ${parsed.ageMin} yaş, siz ${age} yaşındasınız.` });
  }

  // ---- Cinsiyet ----
  if (parsed?.gender && profile.gender) {
    if (parsed.gender !== profile.gender) {
      score -= 50;
      blocked = true;
      flags.push({ kind: "block", label: "Cinsiyet şartı uyuşmuyor", detail: `İlan ${parsed.gender === "kadin" ? "kadın" : "erkek"} aday istiyor.` });
    } else {
      score += 8;
      flags.push({ kind: "match", label: "Cinsiyet şartını sağlıyorsunuz" });
    }
  }

  // ---- Ehliyet ----
  const licenses = parsed?.driverLicense ?? [];
  if (licenses.length) {
    if (!profile.driverLicense) {
      score -= 6;
      flags.push({ kind: "unknown", label: `Ehliyet isteniyor: ${licenses.join(", ")}`, detail: "Profilinize ehliyet bilginizi ekleyin." });
    } else if (textHas(profile.driverLicense, licenses[0].split(" ")[0]) || licenses.some((l) => textHas(profile.driverLicense, l.split(" ")[0]))) {
      score += 6;
      flags.push({ kind: "match", label: "Ehliyet şartını sağlıyorsunuz", detail: `İstenen: ${licenses.join(", ")}` });
    } else {
      score -= 25;
      blocked = true;
      flags.push({ kind: "block", label: "Ehliyet şartını karşılamıyorsunuz", detail: `İstenen: ${licenses.join(", ")}. Sizin: ${profile.driverLicense}` });
    }
  }

  // ---- Deneyim ----
  if (parsed?.experienceYears) {
    const years = profile.experienceYears ?? 0;
    if (years >= parsed.experienceYears) {
      score += 6;
      flags.push({ kind: "match", label: "Deneyim şartını sağlıyorsunuz", detail: `En az ${parsed.experienceYears} yıl isteniyor, sizin ${years} yılınız var.` });
    } else {
      score -= 30;
      blocked = true;
      flags.push({ kind: "block", label: "Deneyim şartı", detail: `En az ${parsed.experienceYears} yıl isteniyor, profilinizde ${years} yıl.` });
    }
  }

  // ---- Sertifika ----
  const certs = parsed?.certificates ?? [];
  if (certs.length) {
    const owned = (profile.certificates ?? []).map(stripTurkish).join(" ");
    const matched = certs.filter((c) => owned && textHas(owned, c.split(" ").slice(-1)[0] ?? ""));
    if (matched.length === certs.length) {
      score += 6;
      flags.push({ kind: "match", label: "İstenen belgeler/sertifikalar sizde var" });
    } else {
      score -= 8;
      flags.push({ kind: "unknown", label: "Belge/sertifika isteniyor", detail: certs.slice(0, 3).join(", ") });
    }
  }

  // ---- Askerlik ----
  if (parsed?.military && profile.gender === "erkek") {
    if (/yapmış|bitirmiş|muaf|tecil/i.test(profile.militaryStatus ?? "")) {
      score += 4;
      flags.push({ kind: "match", label: "Askerlik şartını sağlıyorsunuz" });
    } else if (profile.militaryStatus) {
      score -= 10;
      flags.push({ kind: "unknown", label: "Askerlik şartını kontrol edin", detail: parsed.military });
    } else {
      flags.push({ kind: "unknown", label: "Askerlik durumu girilmemiş", detail: parsed.military });
    }
  }

  // ---- Güvenlik soruşturması ----
  if (parsed?.securityCheck) {
    flags.push({ kind: "unknown", label: "Güvenlik soruşturması / arşiv araştırması yapılacak" });
  }

  // ---- Şehir (kriter) ----
  const jobCities = job.cities ?? [];
  const wanted = (prefs.cities ?? []).map(stripTurkish);
  if (prefs.cityMode === "strict" && wanted.length) {
    if (!jobCities.length) {
      score -= 12;
      flags.push({ kind: "unknown", label: "İlan şehir bilgisi yok", detail: `Sadece şu şehirler isteniyor: ${prefs.cities.join(", ")}` });
    } else if (!jobCities.some((c) => wanted.includes(stripTurkish(c)))) {
      excludeReason = "Şehir kriterine uymuyor";
      blocked = true;
      flags.push({ kind: "block", label: "İstediğiniz şehirlerde kontenjan yok", detail: jobCities.slice(0, 6).join(", ") });
    } else {
      score += 18;
      const hits = jobCities.filter((c) => wanted.includes(stripTurkish(c)));
      flags.push({ kind: "match", label: "İstediğiniz şehirde kontenjan var", detail: hits.slice(0, 6).join(", ") });
    }
  } else if (jobCities.length && wanted.length) {
    const hits = jobCities.filter((c) => wanted.includes(stripTurkish(c)));
    if (hits.length) {
      score += 14;
      flags.push({ kind: "match", label: "Tercih ettiğiniz şehirde kontenjan var", detail: hits.slice(0, 6).join(", ") });
    } else {
      score -= 14;
      flags.push({ kind: "unknown", label: "Tercih ettiğiniz şehirlerde kontenjan görünmüyor", detail: jobCities.slice(0, 6).join(", ") });
    }
  } else if (jobCities.length) {
    flags.push({ kind: "unknown", label: "Kontenjan şehirleri", detail: jobCities.slice(0, 8).join(", ") });
  } else {
    flags.push({ kind: "unknown", label: "Şehir bilgisi çıkarılamadı", detail: "İlan detayını yapıştırarak şehir bilgisini netleştirebilirsiniz." });
  }

  if (profile.homeCity && jobCities.length && jobCities.some((c) => stripTurkish(c) === stripTurkish(profile.homeCity))) {
    score += 6;
    flags.push({ kind: "match", label: `İkamet ettiğiniz ilde (${profile.homeCity}) kontenjan var` });
  }

  // ---- İlan türü / kurum türü ----
  if ((prefs.ilanTypes ?? []).length) {
    if (job.ilanType && prefs.ilanTypes.includes(job.ilanType)) {
      score += 10;
      flags.push({ kind: "match", label: "Aradığınız ilan türünde" });
    } else if (job.ilanType) {
      score -= 8;
      flags.push({ kind: "unknown", label: "İlan türü tercihiniz dışında" });
    }
  }
  if ((prefs.institutionTypes ?? []).length) {
    if (job.institutionType && prefs.institutionTypes.includes(job.institutionType)) {
      score += 6;
      flags.push({ kind: "match", label: "Aradığınız kurum türünde" });
    } else if (job.institutionType) {
      score -= 5;
    }
  }

  // ---- Başlık anahtar kelimeleri ----
  for (const keyword of prefs.titleKeywords ?? []) {
    if (keyword && textHas(`${job.title} ${job.institution ?? ""} ${bodyText.slice(0, 4000)}`, keyword)) {
      score += 7;
      flags.push({ kind: "match", label: `Aradığınız kelime ilanda geçiyor: "${keyword}"` });
    }
  }

  // ---- Kadro sayısı ----
  if (prefs.minPositions && (job.kadroCount ?? 0) < prefs.minPositions && job.kadroCount != null) {
    score -= 8;
    flags.push({ kind: "unknown", label: `Kadro sayısı (${job.kadroCount}) tercihinizin altında` });
  } else if (job.kadroCount && job.kadroCount >= 20) {
    score += 4;
  }

  // ---- Son başvuru tarihi ----
  const days = deadlineDays(job);
  if (days != null && days < 0) {
    excludeReason = "Başvuru süresi doldu";
    blocked = true;
    flags.push({ kind: "block", label: "Başvuru süresi doldu" });
  } else if (days != null && prefs.maxDeadlineDays != null && days > prefs.maxDeadlineDays) {
    excludeReason = `Son başvuru ${days} gün sonra (tercih: ${prefs.maxDeadlineDays} gün)`;
    flags.push({ kind: "unknown", label: `Başvuru için ${days} gün var` });
  } else if (days != null) {
    score += days <= 7 ? 10 : days <= 20 ? 6 : 3;
    flags.push({ kind: "match", label: `Başvuru açık: ${days} gün kaldı` });
  }

  // ---- Bilgi güveni ----
  if ((parsed?.confidence ?? 0) < 35) {
    score -= 5;
    flags.push({ kind: "unknown", label: "İlan detayı tam okunamadı", detail: "İlan metnini yapıştırarak tüm şartları otomatik çıkartabilirsiniz." });
  }

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const blocks = flags.filter((f) => f.kind === "block");
  const unknowns = flags.filter((f) => f.kind === "unknown");

  let status: MatchResult["status"];
  if (blocked && blocks.length >= 2) status = "uygun-degil";
  else if (blocked) status = "riskli";
  else if (unknowns.length >= 4) status = "kismi";
  else if (normalized >= 80) status = "tam-uygun";
  else if (normalized >= 60) status = "uygun";
  else status = "kismi";

  if (prefs.minMatchScore && normalized < prefs.minMatchScore) {
    excludeReason = `Uyum skoru ${normalized} (en az ${prefs.minMatchScore})`;
  }
  if (prefs.hideUnknownRequirements && status === "kismi") {
    excludeReason = "Şartları belirsiz ilanlar gizlendi";
  }

  const urgency: MatchResult["urgency"] =
    days == null ? "bilinmiyor" : days < 0 ? "kapanmis" : days <= 2 ? "bugun" : days <= 7 ? "acil" : days <= 21 ? "yaklasiyor" : "rahat";

  return {
    job,
    excluded: Boolean(excludeReason),
    excludeReason,
    match: {
      score: normalized,
      status,
      flags,
      deadlineDays: days,
      urgency,
    },
  };
}

export function matchJobs(jobs: JobRecord[], profile: Profile, prefs: Preferences, options?: { includeExcluded?: boolean }) {
  const results = jobs.map((job) => matchJob(job, profile, prefs));
  const visible = options?.includeExcluded ? results : results.filter((r) => !r.excluded);
  const sorted = [...visible].sort((a, b) => {
    if (prefs.sortBy === "deadline") {
      const ad = a.match.deadlineDays ?? 9999;
      const bd = b.match.deadlineDays ?? 9999;
      return ad - bd;
    }
    if (prefs.sortBy === "newest") {
      const at = a.job.publishedAt ? new Date(a.job.publishedAt).getTime() : 0;
      const bt = b.job.publishedAt ? new Date(b.job.publishedAt).getTime() : 0;
      return bt - at;
    }
    if (prefs.sortBy === "positions") return (b.job.kadroCount ?? 0) - (a.job.kadroCount ?? 0);
    return b.match.score - a.match.score || (a.match.deadlineDays ?? 9999) - (b.match.deadlineDays ?? 9999);
  });
  return { matched: sorted, excluded: results.filter((r) => r.excluded) };
}
