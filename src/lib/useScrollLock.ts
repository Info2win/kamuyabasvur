"use client";

import { useEffect } from "react";

/**
 * Panel/menü açıkken arka plan kaydırmasını kilitler.
 * iOS Safari'de `position: fixed` + telafi kaydırması kullanılır; böylece
 * sayfa konumu kaybolmaz ve lastik efekti arka plana sızmaz.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const body = document.body;
    if (body.classList.contains("scroll-locked")) return;

    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    body.style.setProperty("--scroll-lock-offset", `${-scrollY}px`);
    body.classList.add("scroll-locked");
    body.style.overflow = previousOverflow;

    const restore = () => {
      body.classList.remove("scroll-locked");
      body.style.removeProperty("--scroll-lock-offset");
      window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
    };

    return restore;
  }, [active]);
}

/** Escape tuşu ile kapatma (masaüstü/klavye erişilebilirliği). */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}
