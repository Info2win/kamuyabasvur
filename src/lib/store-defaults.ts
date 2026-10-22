import type { Preferences, Profile } from "./types";

/**
 * Varsayılan profil ve kriterler. Sunucu (PostgreSQL) ve tarayıcı (localStorage)
 * katmanlarının ikisi de bu saf modülü kullanır.
 */
export const DEFAULT_PROFILE: Profile = {
  fullName: "",
  birthDate: "1998-04-12",
  gender: "kadin",
  homeCity: "Ankara",
  educationLevel: "lisans",
  departments: ["Kamu Yönetimi"],
  fieldOfStudy: "Kamu Yönetimi",
  kpssScore: 81,
  kpssType: "KPSSP3",
  kpssYear: 2024,
  kpssScoreSecondary: 76,
  kpssTypeSecondary: "P93",
  driverLicense: "B sınıfı",
  militaryStatus: "muaf",
  disability: false,
  experienceYears: 1,
  certificates: [],
  languages: ["İngilizce"],
  maritalStatus: "",
  phone: "",
  email: "",
  notes: "",
};

export const DEFAULT_PREFERENCES: Preferences = {
  cities: ["Ankara", "İstanbul", "İzmir"],
  cityMode: "prefer",
  ilanTypes: [],
  institutionTypes: [],
  titleKeywords: [],
  excludeKeywords: [],
  acceptedKpssTypes: [],
  minPositions: 0,
  maxDeadlineDays: null,
  minMatchScore: 0,
  hideUnknownRequirements: false,
  includeDemoData: true,
  sortBy: "score",
};
