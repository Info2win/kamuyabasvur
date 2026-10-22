import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "KPSS İlan Radarı — Sana Uygun Kamu İlanları",
  description:
    "kamuilan.sbb.gov.tr ve Kariyer Kapısı ilanlarını profilinize göre filtreler, şartları otomatik çıkarır ve hızlı başvuru takibi yapmanızı sağlar.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KPSS Radar",
  },
};

/** iPhone çentiği/Dynamic Island ve Android çentik güvenli alanları + tema rengi. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a1626" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1626" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-[#f6f7fb] text-ink-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
