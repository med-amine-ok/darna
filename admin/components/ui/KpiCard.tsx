"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  comparisonSentence?: string;
  comparisonDirection?: "up" | "down" | "flat";
  comparisonVariant?: "good" | "bad" | "neutral";
  helpTooltip?: {
    definition: string;
    howItIsCounted?: string;
  };
  icon?: React.ReactNode;
  sparklineData?: number[];
  className?: string;
  // Legacy backward-compatibility props
  delta?: string;
  deltaType?: "increase" | "decrease" | string;
  isPositiveDelta?: boolean;
  subtitle?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  comparisonSentence,
  comparisonDirection,
  comparisonVariant,
  helpTooltip,
  icon,
  sparklineData = [20, 32, 28, 45, 40, 58, 65, 80],
  className = "",
  delta,
  deltaType,
  isPositiveDelta,
  subtitle,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Compute effective comparison values (backward compatible with delta/subtitle)
  const effectiveSentence = comparisonSentence || delta || subtitle;
  const effectiveDirection =
    comparisonDirection ||
    (deltaType === "increase" ? "up" : deltaType === "decrease" ? "down" : "flat");
  const effectiveVariant =
    comparisonVariant ||
    (isPositiveDelta !== undefined
      ? isPositiveDelta ? "good" : "bad"
      : deltaType === "increase" ? "good" : deltaType === "decrease" ? "bad" : "neutral");

  // Sparkline coordinates
  const width = 100;
  const height = 30;
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;

  const points = sparklineData
    .map((val, index) => {
      const x = (index / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  // Color semantics according to IHM T10: Green for good, Terracotta ONLY for alert/bad, Neutral ink for neutral
  const badgeClasses =
    effectiveVariant === "good"
      ? "bg-secondary/15 text-[#2E3A2F] border-secondary/30"
      : effectiveVariant === "bad"
      ? "bg-[#C96F4F]/15 text-[#C96F4F] border-[#C96F4F]/30"
      : "bg-neutral-100 text-neutral-700 border-neutral-200";

  const sparklineStroke =
    effectiveVariant === "good"
      ? "#6B7F5B"
      : effectiveVariant === "bad"
      ? "#C96F4F"
      : "#8C9B88";

  return (
    <div
      className={`relative p-5 rounded-3xl bg-white border border-tertiary/70 shadow-2xs flex flex-col justify-between text-start hover:shadow-md transition-all duration-200 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          {/* Sentence Case, no uppercase */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-600 block">
              {title}
            </span>

            {/* Help tooltip (?) button */}
            {helpTooltip && (
              <div className="relative inline-block">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={() => setShowTooltip(!showTooltip)}
                  className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded transition cursor-pointer"
                  aria-label={`Help about ${title}`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>

                {showTooltip && (
                  <div className="absolute start-0 bottom-full mb-2 w-64 p-3 rounded-2xl bg-[#1C241D] text-white text-[11px] shadow-2xl border border-[#3A493B] z-50 animate-in fade-in zoom-in-95 pointer-events-none">
                    <p className="font-medium leading-relaxed">
                      {helpTooltip.definition}
                    </p>
                    {helpTooltip.howItIsCounted && (
                      <p className="mt-1.5 pt-1.5 border-t border-[#3A493B] text-neutral-300 text-[10px]">
                        <span className="font-bold text-tertiary">Calcul : </span>
                        {helpTooltip.howItIsCounted}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {icon && (
            <div className="w-8 h-8 rounded-xl bg-darnaBg border border-tertiary/70 flex items-center justify-center text-primary shrink-0">
              {icon}
            </div>
          )}
        </div>

        {/* Big Number (Miller Card) */}
        <div className="text-2xl sm:text-3xl font-serif font-black text-primary mt-2 tabular-nums tracking-tight">
          {value}
        </div>
      </div>

      {/* Comparison Sentence with Icon AND Text (Never Color Alone) */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
        {effectiveSentence && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeClasses}`}
          >
            {effectiveDirection === "up" ? (
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            ) : effectiveDirection === "down" ? (
              <TrendingDown className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{effectiveSentence}</span>
          </span>
        )}

        {/* Minimal Sparkline */}
        {sparklineData.length > 1 && (
          <div className="w-16 h-6 shrink-0 opacity-80">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full overflow-visible"
            >
              <polyline
                fill="none"
                stroke={sparklineStroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
