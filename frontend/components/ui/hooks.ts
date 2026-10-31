"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

/** True when the active locale is right-to-left (Arabic). */
export function useIsRtl(): boolean {
  return useLocale() === "ar";
}

/**
 * Matches a media query on the client. Returns `fallback` during SSR and the first
 * render so markup stays stable; only overlays (closed on first paint) depend on it.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState(fallback);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Phones (< 640px): overlays become bottom sheets. */
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 639px)");
}
