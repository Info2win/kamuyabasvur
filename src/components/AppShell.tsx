"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { useScrollLock } from "@/lib/useScrollLock";
import {
  ClipboardList,
  Gauge,
  LayoutGrid,
  Menu,
  Radar,
  RefreshCw,
  ScanText,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { StateProvider, Toasts, useAppState } from "./AppState";

const NAV = [
  { href: "/", label: "Ana panel", icon: Gauge },
  { href: "/ilanlar", label: "İlanlar", icon: LayoutGrid },
  { href: "/hizli", label: "Hızlı mod", icon: Zap },
  { href: "/basvurular", label: "Başvurularım", icon: ClipboardList },
  { href: "/tercihler", label: "İş kriterlerim", icon: Target },
  { href: "/profil", label: "Profilim", icon: UserRound },
  { href: "/yapistir", label: "İlan yapıştır", icon: ScanText },
];

/** Telefonlarda alt sekme çubuğunda gösterilecek 4 ana bölüm + menü. */
const TAB_NAV = NAV.slice(0, 4);
const MORE_NAV = NAV.slice(4);

function Sidebar() {
  const pathname = usePathname();
  const { data, syncing, sync } = useAppState();
  const stats = data?.stats;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-900/40 bg-ink-950 text-slate-200 lg:flex xl:w-72">
      <div className="grid-paper flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-900/40">
          <Radar className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">KPSS İlan Radarı</p>
          <p className="truncate text-[11px] text-slate-400">Sana uygun kamu ilanları</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-brand-600 text-white shadow-md shadow-brand-900/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4 text-[11px] text-slate-400">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${stats && stats.liveCount > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
            {stats ? `${stats.liveCount} canlı · ${stats.demoCount} örnek` : "yükleniyor"}
          </span>
          <span className="tabular-nums">{stats ? `${stats.total} toplam` : ""}</span>
        </div>
        <button
          type="button"
          onClick={() => void sync(0)}
          disabled={syncing}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Taranıyor…" : "İlanları güncelle"}
        </button>
        <p className="mt-3 leading-relaxed">
          Kaynak: <span className="text-slate-300">kamuilan.sbb.gov.tr</span> + Kariyer Kapısı
        </p>
      </div>
    </aside>
  );
}

function MobileTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { syncing, sync, data } = useAppState();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 pt-safe backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link href="/" className="focus-ring flex min-w-0 items-center gap-2 rounded-lg">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
            <Radar className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-bold leading-tight text-ink-900">KPSS İlan Radarı</span>
            <span className="block truncate text-[10.5px] leading-tight text-slate-500">
              {data ? `${data.stats.visible} uygun · ${data.stats.urgent} acil ilan` : "yükleniyor…"}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void sync(0)}
            disabled={syncing}
            aria-label="İlanları güncelle"
            className="focus-ring grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-white transition active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Menü"
            className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-ink-900 transition active:scale-95"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileTabBar() {
  const pathname = usePathname();
  const { data } = useAppState();
  const savedCount = data?.stats.saved ?? 0;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {TAB_NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`focus-ring relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10.5px] font-semibold transition ${
                active ? "text-brand-700" : "text-slate-500"
              }`}
            >
              <span className="relative">
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 2} />
                {item.href === "/basvurular" && savedCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[9.5px] font-bold text-white tabular-nums">
                    {savedCount}
                  </span>
                ) : null}
              </span>
              {item.label}
              {active ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-600" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data, syncing, sync } = useAppState();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Menüyü kapat" onClick={onClose} className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" />
      <div className="animate-rise absolute inset-x-0 bottom-0 rounded-t-3xl bg-white pb-safe shadow-2xl">
        <div className="mx-auto max-w-lg px-4 pt-3">
          <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-slate-300" />
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Diğer bölümler</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MORE_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`focus-ring flex min-h-[52px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-[13.5px] font-semibold transition ${
                    active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-ink-900"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] text-slate-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-ink-900">
              <span className={`h-2 w-2 rounded-full ${data && data.stats.liveCount > 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
              Havuzda {data?.stats.total ?? 0} ilan · {data?.stats.liveCount ?? 0} canlı
            </p>
            <button
              type="button"
              onClick={() => void sync(0)}
              disabled={syncing}
              className="focus-ring mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-3 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Taranıyor…" : "İlanları yeniden tara"}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring mt-3 mb-2 min-h-11 w-full rounded-xl border border-slate-300 text-[13px] font-semibold text-slate-600"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useScrollLock(menuOpen);
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 pb-32 pt-3.5 sm:px-5 sm:pb-32 lg:px-8 lg:py-6 xl:px-10">{children}</main>
      </div>
      <MobileTabBar />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Toasts />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StateProvider>
      <ShellInner>{children}</ShellInner>
    </StateProvider>
  );
}
