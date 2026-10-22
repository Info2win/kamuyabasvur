import type { NextConfig } from "next";

/**
 * İki çalışma modu:
 *  1) Varsayılan (dinamik): Next.js sunucusu + API uçları + PostgreSQL.
 *  Her iki modda da veriler tarayıcıda (localStorage) tutulur — PostgreSQL kurulumu gerekmez.
 *  2) GitHub Pages (statik): DEPLOY_TARGET=github-pages ile `output: "export"`.
 *     Bu modda API uçları derlemeye dahil edilmez (scripts/build-pages.sh geçici olarak
 *     src/app/api dizinini taşır).
 */
const isPages = process.env.DEPLOY_TARGET === "github-pages";
/** Örn. "/kpss-ilan-radari" — depo adı ile aynı olmalı. Kullanıcı sayfası (*.github.io) için boş bırakın. */
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = isPages
  ? {
      output: "export",
      basePath: basePath || undefined,
      trailingSlash: true,
      images: { unoptimized: true },
      env: {
        NEXT_PUBLIC_STATIC: "1",
        NEXT_PUBLIC_BASE_PATH: basePath,
      },
    }
  : {
      env: {
        // Veritabanı kullanılmıyor: veri her zaman tarayıcıda (localStorage) tutulur.
        NEXT_PUBLIC_STATIC: "1",
        NEXT_PUBLIC_BASE_PATH: "",
      },
    };

export default nextConfig;
