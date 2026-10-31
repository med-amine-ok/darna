"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/motion";
import { hasHydrated } from "@/components/motion/MotionProvider";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// One run of digits (Latin or Arabic-Indic) with grouping separators inside it.
const NUMBER_RUN = /[0-9٠-٩](?:[0-9٠-٩.,٫٬\s  ]*[0-9٠-٩])?/;
const ARABIC_ZERO = 0x0660;

function toLatinDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_ZERO));
}

/** Integer value of a grouped digit run, or null when it may contain a decimal part. */
function parseGrouped(run: string): number | null {
  const latin = toLatinDigits(run);
  const groups = latin.split(/[.,٫٬\s  ]/);
  if (groups.length > 1 && groups.slice(1).some((g) => g.length !== 3)) return null;
  const n = Number(groups.join(""));
  return Number.isFinite(n) ? n : null;
}

/** Re-inserts `n` into the run's shape: same separator, same digit script. */
function formatLike(run: string, n: number) {
  const sep = run.match(/[.,٬\s  ]/)?.[0];
  const arabic = /[٠-٩]/.test(run);
  let digits = String(Math.round(n));
  if (sep) digits = digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return arabic ? digits.replace(/\d/g, (d) => String.fromCharCode(ARABIC_ZERO + Number(d))) : digits;
}

export interface AnimatedNumberProps {
  /** A number, or an already formatted string such as "2,450,000 DZD" / "١٢٨". */
  value: number | string;
  /** Formatter for numeric values (defaults to the run's own grouping). */
  format?: (n: number) => string;
  className?: string;
  /** Seconds. */
  duration?: number;
}

/**
 * KPI numeral that counts up when it mounts on a client navigation and tweens when the
 * value changes. The final text is always the exact formatted value (screen readers and
 * the server HTML get it directly); reduced motion, decimals and the hydration pass
 * render it statically.
 */
export function AnimatedNumber({ value, format, className = "", duration = 0.5 }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const text = typeof value === "number" ? (format ? format(value) : String(value)) : value;
  const run = text.match(NUMBER_RUN)?.[0] ?? null;
  const target = typeof value === "number" ? value : run ? parseGrouped(run) : null;

  const [display, setDisplay] = useState<string>(text);
  const fromRef = useRef<number | null>(null);

  useIsoLayoutEffect(() => {
    const start = fromRef.current ?? (hasHydrated() ? 0 : target);
    fromRef.current = target;
    if (target === null || start === null || reduceMotion || start === target || target < 10) {
      setDisplay(text);
      return;
    }
    const render = (n: number) => {
      if (typeof value === "number") return format ? format(Math.round(n)) : String(Math.round(n));
      return run ? text.replace(run, formatLike(run, n)) : text;
    };
    setDisplay(render(start));
    const controls = animate(start, target, {
      duration,
      ease: ease.out,
      onUpdate: (v) => setDisplay(render(v)),
      onComplete: () => setDisplay(text),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, target, reduceMotion]);

  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

export default AnimatedNumber;
