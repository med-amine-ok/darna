"use client";

import React from "react";
import { cn, useIsRtl } from "@/components/ui";

export const BINS = 28;
export const STEP = 500;

/** Dual-handle price slider (two native range inputs) with an optional histogram. */
export default function PriceRange({
  floor,
  ceil,
  low,
  high,
  onChange,
  histogram,
  minLabel,
  maxLabel,
}: {
  floor: number;
  ceil: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  histogram: number[] | null;
  minLabel: string;
  maxLabel: string;
}) {
  const isRtl = useIsRtl();
  const span = Math.max(1, ceil - floor);
  const startPct = ((low - floor) / span) * 100;
  const endPct = ((high - floor) / span) * 100;
  const peak = histogram ? Math.max(1, ...histogram) : 1;

  // Both inputs span the full track; only their thumbs take pointer events.
  const thumb =
    "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent " +
    "[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-grab " +
    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-e3 [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-primary/10 " +
    "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-fast active:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:cursor-grabbing " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-e3 " +
    "[&::-moz-range-track]:bg-transparent " +
    "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-accent-600";

  return (
    <div className="px-1">
      {histogram && (
        <div aria-hidden="true" className="flex h-16 items-end gap-[3px]">
          {histogram.map((count, i) => {
            const binStart = (i / histogram.length) * 100;
            const binEnd = ((i + 1) / histogram.length) * 100;
            const inside = binEnd > startPct && binStart < endPct;
            return (
              <span
                key={i}
                className={cn("flex-1 origin-bottom rounded-t-sm transition-colors duration-fast", inside ? "bg-primary-800" : "bg-tertiary-300")}
                style={{ height: `${count === 0 ? 4 : 12 + (count / peak) * 88}%` }}
              />
            );
          })}
        </div>
      )}
      <div className="relative h-7" dir="ltr">
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/[0.12]" />
        <span
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary-800"
          style={isRtl ? { right: `${startPct}%`, left: `${100 - endPct}%` } : { left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
        <input
          type="range"
          aria-label={minLabel}
          min={floor}
          max={ceil}
          step={STEP}
          value={low}
          onChange={(e) => onChange(Math.min(Number(e.target.value), high - STEP), high)}
          className={thumb}
          style={isRtl ? { direction: "rtl" } : undefined}
        />
        <input
          type="range"
          aria-label={maxLabel}
          min={floor}
          max={ceil}
          step={STEP}
          value={high}
          onChange={(e) => onChange(low, Math.max(Number(e.target.value), low + STEP))}
          className={thumb}
          style={isRtl ? { direction: "rtl" } : undefined}
        />
      </div>
    </div>
  );
}


/** Slider bounds (rounded to STEP) and a histogram for a set of prices; null histogram below 2 prices. */
export function priceStats(values: number[]): { floor: number; ceil: number; histogram: number[] | null } {
  const prices = values.filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length < 2) return { floor: 0, ceil: 60000, histogram: null };
  const lo = Math.floor(Math.min(...prices) / STEP) * STEP;
  const hi = Math.max(lo + STEP * 4, Math.ceil(Math.max(...prices) / STEP) * STEP);
  const bins = new Array(BINS).fill(0) as number[];
  for (const p of prices) bins[Math.min(BINS - 1, Math.floor(((p - lo) / (hi - lo)) * BINS))] += 1;
  return { floor: lo, ceil: hi, histogram: bins };
}
