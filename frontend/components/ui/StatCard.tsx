"use client";

/**
 * StatCard (KPI), label, animated serif number, delta badge, optional sparkline.
 *
 *   <StatCard label="Earnings this month" value={184500} unit="DZD"
 *     delta={{ value: 12.4 }} sparkline={[12, 18, 15, 22, 28, 26, 34]} icon={<BrandCashIcon size={18} />} />
 *   <StatCard label="Occupancy" value={78} unit="%" delta={{ value: -3.1 }} hint="vs. last month" />
 *
 * Value tweens with AnimatedNumber (reduced motion → instant) and is formatted with the
 * active locale (Intl, tabular digits) unless you pass `format` (client callers only).
 * Delta: positive = olive, negative = terracotta; set `invertDelta` when "down" is good.
 */

import React, { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandTrendingDownIcon, BrandTrendingUpIcon } from "@/components/icons";
import AnimatedNumber from "./AnimatedNumber";
import { Badge } from "./Badge";
import { cn } from "./cn";

export interface StatCardProps {
  label: string;
  value: number;
  /** Unit printed after the number (DZD, %, nights…). */
  unit?: string;
  format?: (n: number) => string;
  delta?: { value: number; label?: string };
  invertDelta?: boolean;
  hint?: React.ReactNode;
  sparkline?: number[];
  icon?: React.ReactNode;
  className?: string;
}

function Sparkline({ values }: { values: number[] }) {
  const id = useId();
  const w = 120;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map(
    (v, i) =>
      [
        (i / (values.length - 1)) * w,
        h - 4 - ((v - min) / span) * (h - 8),
      ] as const,
  );
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="ms-auto h-10 w-28 shrink-0 overflow-visible rtl:-scale-x-100"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0E6FAD" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0E6FAD" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke="#0E6FAD"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw-in"
      />
      <circle
        cx={lx}
        cy={ly}
        r="2.75"
        fill="#0B57D0"
        stroke="#fff"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  unit,
  format,
  delta,
  invertDelta,
  hint,
  sparkline,
  icon,
  className,
}: StatCardProps) {
  const locale = useLocale();
  const t = useTranslations("ui");
  const fmt =
    format ??
    ((n: number) =>
      new Intl.NumberFormat(
        locale === "ar" ? "ar-DZ-u-nu-latn" : locale,
      ).format(n));
  const up = delta ? delta.value >= 0 : false;
  const good = invertDelta ? !up : up;
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-e1",
        className,
      )}
    >
      <div className="flex min-h-9 items-center justify-between gap-3">
        <p className="text-meta font-medium text-primary-600">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary-50 text-secondary-700"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <p className="flex min-w-0 items-baseline gap-1.5 text-primary-900">
          <AnimatedNumber
            value={value}
            format={fmt}
            className="font-serif text-display-md leading-none"
          />
          {unit && <span className="text-body text-primary-500">{unit}</span>}
        </p>
        {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} />}
      </div>
      {(delta || hint) && (
        <div className="flex flex-wrap items-center gap-2">
          {delta && (
            <Badge
              tone={good ? "success" : "danger"}
              icon={
                up ? (
                  <BrandTrendingUpIcon size={12} />
                ) : (
                  <BrandTrendingDownIcon size={12} />
                )
              }
            >
              <span className="sr-only">
                {up ? t("deltaUp") : t("deltaDown")}{" "}
              </span>
              <bdi dir="ltr">
                {up ? "+" : "−"}
                {Math.abs(delta.value).toLocaleString(
                  locale === "ar" ? "ar-DZ-u-nu-latn" : locale,
                  { maximumFractionDigits: 1 },
                )}
                %
              </bdi>
            </Badge>
          )}
          {(hint || delta?.label) && (
            <span className="text-meta text-primary-500">
              {hint ?? delta?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default StatCard;
