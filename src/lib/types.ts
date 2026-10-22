export type EducationLevel =
  | "lise"
  | "onlisans"
  | "lisans"
  | "yuksek_lisans"
  | "doktora";

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  lise: "Lise / Ortaöğretim",
  onlisans: "Ön Lisans",
  lisans: "Lisans",
  yuksek_lisans: "Yüksek Lisans",
  doktora: "Doktora",
};

export const EDUCATION_RANK: Record<EducationLevel, number> = {
  lise: 1,
  onlisans: 2,
  lisans: 3,
  yuksek_lisans: 4,
  doktora: 5,
};

export type KpssRequirement = {
  type?: string;
  min?: number;
  year?: number;
};

export type ParsedRequirements = {
  kpss: KpssRequirement[];
  education: EducationLevel[];
  ageMax?: number;
  ageMin?: number;
  gender?: "kadin" | "erkek";
  departments: string[];
  driverLicense: string[];
  experienceYears?: number;
  certificates: string[];
  military?: string;
  disabilityPreferred?: boolean;
  securityCheck?: boolean;
  travelRequired?: boolean;
  applicationMethods: string[];
  conditions: string[];
  positions: { title: string; count?: number; kpssType?: string; education?: string }[];
  kpssExamYears: number[];
  confidence: number;
  parsedFrom: "detay" | "baslik" | "yapistirilan";
};

export type JobRecord = {
  sourceKey: string;
  source: string;
  title: string;
  institution: string | null;
  unit: string | null;
  ilanNo: string | null;
  category: string | null;
  ilanType: string | null;
  institutionType: string | null;
  publishedAt: string | null;
  applicationStart: string | null;
  applicationEnd: string | null;
  kadroCount: number | null;
  cities: string[];
  positions: ParsedRequirements["positions"];
  rawText: string | null;
  parsed: ParsedRequirements;
  detailUrl: string | null;
  applyUrl: string | null;
  logoUrl: string | null;
  isDemo: boolean;
  fetchedAt: string | null;
};

export type Profile = {
  fullName: string;
  birthDate: string;
  gender: string;
  homeCity: string;
  educationLevel: EducationLevel | "";
  departments: string[];
  fieldOfStudy: string;
  kpssScore: number | null;
  kpssType: string;
  kpssYear: number | null;
  kpssScoreSecondary: number | null;
  kpssTypeSecondary: string;
  driverLicense: string;
  militaryStatus: string;
  disability: boolean;
  experienceYears: number;
  certificates: string[];
  languages: string[];
  maritalStatus: string;
  phone: string;
  email: string;
  notes: string;
};

export type Preferences = {
  cities: string[];
  cityMode: "strict" | "prefer" | "any";
  ilanTypes: string[];
  institutionTypes: string[];
  titleKeywords: string[];
  excludeKeywords: string[];
  acceptedKpssTypes: string[];
  minPositions: number;
  maxDeadlineDays: number | null;
  minMatchScore: number;
  hideUnknownRequirements: boolean;
  includeDemoData: boolean;
  sortBy: "score" | "deadline" | "newest" | "positions";
};

export type MatchFlag = {
  label: string;
  detail?: string;
  kind: "match" | "block" | "unknown";
};

export type MatchResult = {
  score: number;
  status: "tam-uygun" | "uygun" | "kismi" | "riskli" | "uygun-degil";
  flags: MatchFlag[];
  deadlineDays: number | null;
  urgency: "kapanmis" | "bugun" | "acil" | "yaklasiyor" | "rahat" | "bilinmiyor";
};

export type ApplicationStatus =
  | "saved"
  | "reviewed"
  | "documents"
  | "applied"
  | "exam"
  | "result"
  | "rejected";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Kaydedildi",
  reviewed: "İncelendi",
  documents: "Belgeler hazırlanıyor",
  applied: "Başvuruldu",
  exam: "Sınav bekleniyor",
  result: "Sonuçlandı",
  rejected: "Vazgeçildi",
};

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  "saved",
  "reviewed",
  "documents",
  "applied",
  "exam",
  "result",
];

export type DocumentItem = {
  label: string;
  hint?: string;
  done: boolean;
  source: "genel" | "ilana-ozel";
};

export type SyncLogEntry = {
  id: number;
  source: string;
  status: string;
  message: string | null;
  found: number | null;
  inserted: number | null;
  updated: number | null;
  durationMs: number | null;
  createdAt: string | null;
};

export const ILAN_TYPES = [
  { value: "kadro", label: "Kadrolu memur (4/A)" },
  { value: "sozlesmeli", label: "Sözleşmeli personel (4/B)" },
  { value: "isci", label: "Kamu işçisi / sürekli işçi" },
  { value: "kariyer", label: "Kariyer meslek (uzman yrd. vb.)" },
  { value: "askeri", label: "Askeri personel / subay-astsubay" },
  { value: "akademik", label: "Akademik personel" },
  { value: "yargi", label: "Adalet / zabıt kâtibi vb." },
  { value: "diger", label: "Diğer" },
];

export const INSTITUTION_TYPES = [
  { value: "bakanlik", label: "Bakanlık / bağlı kuruluş" },
  { value: "universite", label: "Üniversite" },
  { value: "belediye", label: "Belediye / yerel yönetim" },
  { value: "kit", label: "KİT / kamu şirketi" },
  { value: "yargi", label: "Yargı (Yargıtay, Danıştay, Adalet)" },
  { value: "askeri", label: "Askeri / güvenlik (MSB, Jandarma, Emniyet)" },
  { value: "diger", label: "Diğer kamu kurumu" },
];

export const KPSS_TYPES = ["KPSSP3", "P3", "P93", "P94", "P98", "P99", "P1", "P2"];

/** Takip edilen başvuru kaydı (tarayıcıda localStorage'da tutulur). */
export type ApplicationRecord = {
  id: number;
  jobKey: string;
  jobTitle: string | null;
  institution: string | null;
  status: ApplicationStatus;
  score: number | null;
  note: string | null;
  documents: DocumentItem[];
  deadline: string | null;
  reminderDate: string | null;
  savedAt: string | null;
  appliedAt: string | null;
  examDate: string | null;
  resultNote: string | null;
  lastOpenedAt: string | null;
};

/** Arayüzün ihtiyaç duyduğu tüm veri (tek istekte döner). */
export type DashboardPayload = {
  profile: Profile;
  preferences: Preferences;
  matched: { job: JobRecord; match: MatchResult; excluded: boolean; excludeReason?: string }[];
  excluded: { job: JobRecord; match: MatchResult; excluded: boolean; excludeReason?: string }[];
  applications: Record<string, ApplicationRecord>;
  jobs: JobRecord[];
  logs: SyncLogEntry[];
  stats: {
    total: number;
    visible: number;
    strong: number;
    partial: number;
    risky: number;
    urgent: number;
    applied: number;
    saved: number;
    demoCount: number;
    liveCount: number;
  };
  syncedJustNow: boolean;
};
