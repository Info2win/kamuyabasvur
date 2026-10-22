const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCDate()} ${TR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

export function deadlineLabel(value?: string | null): string {
  const days = daysUntil(value);
  if (days == null) return "Tarih belirtilmemiş";
  if (days < 0) return `${Math.abs(days)} gün önce kapandı`;
  if (days === 0) return "Bugün son gün!";
  if (days === 1) return "Yarın son gün";
  return `${days} gün kaldı`;
}

export function relativeTime(value?: string | null): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return formatDate(value);
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-brand-600";
  if (score >= 40) return "text-amber-600";
  return "text-rose-600";
}

export function scoreRingColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#1f4bc9";
  if (score >= 40) return "#d97706";
  return "#e11d48";
}

export const STATUS_LABEL: Record<string, string> = {
  "tam-uygun": "Tam uygun",
  uygun: "Uygun",
  kismi: "Kısmen uygun",
  riskli: "Riskli",
  "uygun-degil": "Uygun değil",
};

export const STATUS_STYLE: Record<string, string> = {
  "tam-uygun": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  uygun: "bg-brand-50 text-brand-700 ring-brand-200",
  kismi: "bg-amber-50 text-amber-700 ring-amber-200",
  riskli: "bg-orange-50 text-orange-700 ring-orange-200",
  "uygun-degil": "bg-rose-50 text-rose-700 ring-rose-200",
};

export const URGENCY_STYLE: Record<string, string> = {
  kapanmis: "bg-slate-100 text-slate-500 ring-slate-200",
  bugun: "bg-rose-600 text-white ring-rose-600",
  acil: "bg-rose-50 text-rose-700 ring-rose-200",
  yaklasiyor: "bg-amber-50 text-amber-700 ring-amber-200",
  rahat: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  bilinmiyor: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function splitList(value: string): string[] {
  return value
    .split(/[,\n;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}
