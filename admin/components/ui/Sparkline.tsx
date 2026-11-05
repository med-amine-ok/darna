"use client";

import React, { useId } from "react";

export interface SparklineProps {
  data: number[];
  /** Palette tone of the line. */
  tone?: "olive" | "terracotta" | "ink";
  className?: string;
}

const STROKE = { olive: "#0E6FAD", terracotta: "#0B57D0", ink: "#5F86C0" } as const;

/**
 * Tiny trend line for KPI cards: one palette colour, soft area wash, end-point dot,
 * drawn in once (CSS stroke-dashoffset; reduced motion shows it immediately). Decorative.
 */
export function Sparkline({ data, tone = "olive", className = "" }: SparklineProps) {
  const gradientId = useId().replace(/:/g, "");
  if (data.length < 2) return null;
  const width = 100;
  const height = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - ((v - min) / range) * (height - 8) - 4] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lx, ly] = pts[pts.length - 1];
  const color = STROKE[tone];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`overflow-visible ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} className="animate-in fade-in duration-500" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        className="sparkline-draw"
      />
      <circle cx={lx} cy={ly} r="2.25" fill={color} vectorEffect="non-scaling-stroke" className="animate-in fade-in duration-500" />
    </svg>
  );
}
