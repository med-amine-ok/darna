"use client";

/**
 * Loading indicators, BrandLoader (full page / section) and TopProgressBar (route changes).
 *
 *   <BrandLoader />                    // arch outline that draws itself on a loop + "Loading…"
 *   <BrandLoader fullPage label="Preparing your trip" />
 *   <TopProgressBar />                 // mounted once in app/[locale]/layout.tsx
 *
 * BrandLoader uses CSS stroke-dashoffset (`.loader-arch` in globals.css): runs from server
 * HTML, shows a static drawn arch under reduced motion. It has role="status" + sr label.
 *
 * TopProgressBar listens to same-origin link clicks (capture phase) and pathname/search
 * changes: on click it trickles a thin terracotta bar to ~85%, and completes + fades when
 * the new route renders. No timers run while idle; ignores modified clicks, new tabs, hash
 * links and downloads.
 */

import React, { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "./cn";

const ARCH =
  "M6 58V28.4C6 18.6 12.3 12.2 19.5 9.1C23.1 7.5 26.2 6.4 28.5 5C30.8 6.4 33.9 7.5 37.5 9.1C44.7 12.2 51 18.6 51 28.4V58";

export function BrandLoader({
  label,
  fullPage,
  size = 56,
  className,
}: {
  label?: string;
  fullPage?: boolean;
  size?: number;
  className?: string;
}) {
  const t = useTranslations("ui");
  const text = label ?? t("loading");
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullPage && "min-h-[60vh] w-full",
        className,
      )}
    >
      <svg
        width={size}
        height={(size * 64) / 57}
        viewBox="0 0 57 64"
        fill="none"
        aria-hidden="true"
      >
        <path d={`${ARCH}Z`} fill="#F1F5F9" />
        <path
          d={ARCH}
          stroke="#E4EAF2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={ARCH}
          pathLength={1}
          className="loader-arch"
          stroke="#0B57D0"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 60h53"
          stroke="#152C52"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M28.5 26l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z"
          fill="#0E6FAD"
          className="loader-rosette"
        />
      </svg>
      <span
        className={cn(
          "text-meta font-medium text-primary-600",
          !fullPage && "sr-only",
        )}
      >
        {text}
      </span>
    </div>
  );
}

/** Thin route-change bar. Wrapped in Suspense because it reads useSearchParams. */
export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <TopProgressBarInner />
    </Suspense>
  );
}

function TopProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const trickle = useRef<ReturnType<typeof setInterval>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const first = useRef(true);

  // Route rendered → complete.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    clearInterval(trickle.current);
    setProgress(1);
    setState("done");
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 420);
  }, [pathname, searchParams]);

  // Same-origin navigations → start.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download"))
        return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;
      clearTimeout(hideTimer.current);
      clearInterval(trickle.current);
      setState("loading");
      setProgress(0.12);
      trickle.current = setInterval(() => {
        setProgress((p) => (p < 0.85 ? p + (0.85 - p) * 0.12 : p));
      }, 220);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearInterval(trickle.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]"
    >
      <div
        className={cn(
          "h-full origin-left rtl:origin-right bg-cta shadow-glow transition-[transform,opacity] ease-out",
          state === "idle"
            ? "opacity-0 duration-0"
            : state === "done"
              ? "opacity-0 duration-slow delay-150"
              : "opacity-100 duration-base",
        )}
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
