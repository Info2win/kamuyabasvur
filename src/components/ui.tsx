"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { scoreRingColor } from "@/lib/format";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,35,60,0.04)] ${className}`}>{children}</div>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "success" | "dark";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", icon, className = "", children, ...rest }: ButtonProps) {
  const base =
    "focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55";
  // Mobilde en az 44px dokunma yüksekliği (Apple HIG / Material)
  const sizes = {
    sm: "min-h-9 px-3 py-1.5 text-xs sm:min-h-8",
    md: "min-h-11 px-4 py-2.5 text-sm sm:min-h-10",
    lg: "min-h-12 px-5 py-3 text-[15px]",
  };
  const variants = {
    primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
    dark: "bg-ink-900 text-white hover:bg-ink-700",
    ghost: "text-slate-600 hover:bg-slate-100",
    outline: "border border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return (
    <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function Badge({ children, className = "", tone = "slate" }: { children: ReactNode; className?: string; tone?: "slate" | "brand" | "emerald" | "amber" | "rose" | "ink" | "teal" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    ink: "bg-ink-900 text-white ring-ink-900",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink-700">{label}</span>
        {hint ? <span className="text-[11px] font-normal text-slate-400">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

/** Mobilde 16px: iOS Safari'nin odaklanınca otomatik yakınlaştırmasını engeller. */
const inputClass =
  "focus-ring w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base leading-snug text-ink-900 placeholder:text-slate-400 focus:border-brand-400 sm:py-2.5 sm:text-sm";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} leading-relaxed ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  // Yerel ok işareti korunur: iOS/Android'de seçici daha iyi çalışır.
  return <select {...props} className={`${inputClass} bg-white pr-8 ${props.className ?? ""}`} />;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="focus-ring flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-brand-300"
    >
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "bg-brand-600" : "bg-slate-300"}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </span>
      <span>
        <span className="block text-[13px] font-semibold text-ink-900">{label}</span>
        {description ? <span className="mt-0.5 block text-[11.5px] leading-relaxed text-slate-500">{description}</span> : null}
      </span>
    </button>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring inline-flex shrink-0 items-center rounded-full px-3.5 py-2.5 text-[13px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
        active ? "bg-brand-600 text-white shadow-sm" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
      }`}
    >
      {children}
    </button>
  );
}

export function TagInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const add = (raw: string) => {
    const items = raw
      .split(/[,\n;]/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (!items.length) return;
    onChange([...new Set([...value, ...items])]);
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-2">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
            {tag}
            <button type="button" className="focus-ring text-brand-400 hover:text-rose-600" onClick={() => onChange(value.filter((v) => v !== tag))} aria-label={`${tag} kaldır`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value=""
          placeholder={value.length ? "Ekle…" : placeholder}
          onChange={(e) => {
            if (e.target.value.endsWith(",") || e.target.value.endsWith(";")) add(e.target.value);
          }}
          onKeyDown={(e) => {
            const target = e.target as HTMLInputElement;
            if (e.key === "Enter" || e.key === "Tab") {
              if (!target.value.trim()) return;
              e.preventDefault();
              add(target.value);
              target.value = "";
            } else if (e.key === "Backspace" && !target.value && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          className="min-w-[8rem] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      {suggestions.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !value.includes(s)).slice(0, 10).map((s) => (
            <button key={s} type="button" onClick={() => onChange([...value, s])} className="focus-ring rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600">
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e6eaf2" strokeWidth="5" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreRingColor(score)}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="absolute text-[13px] font-bold tabular-nums" style={{ color: scoreRingColor(score) }}>
        {score}
      </span>
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export function StatTile({ label, value, hint, tone = "brand", icon }: { label: string; value: ReactNode; hint?: string; tone?: "brand" | "emerald" | "amber" | "rose" | "ink"; icon?: ReactNode }) {
  const tones = {
    brand: "from-brand-600 to-brand-800",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-rose-700",
    ink: "from-ink-700 to-ink-950",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone]}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon ? <span className="text-slate-300">{icon}</span> : null}
      </div>
      <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-ink-900">{value}</p>
      {hint ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="animate-rise flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
