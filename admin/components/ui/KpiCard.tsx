"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";

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
  const t = useTranslations("uiKit.kpi");
  const tooltipId = useId();
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

  // Colour semantics (IHM T10): olive = good, terracotta only for alert/bad, ink tint = neutral.
  const badgeClasses =
    effectiveVariant === "good"
      ? "bg-secondary-100 text-secondary-900"
      : effectiveVariant === "bad"
      ? "bg-accent-100 text-accent-800"
      : "bg-neutral-100 text-neutral-700";

  const sparklineTone = effectiveVariant === "good" ? "olive" : effectiveVariant === "bad" ? "terracotta" : "ink";

  return (
    <div
      className={`relative p-5 rounded-2xl bg-white shadow-e1 hover:shadow-e2 flex flex-col justify-between text-start transition-shadow duration-fast ease-standard ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          {/* Sentence Case, no uppercase */}
          <div className="flex items-center gap-1.5">
            <span className="text-meta font-medium text-primary-600 block">
              {title}
            </span>

            {/* Help tooltip (?) button */}
            {helpTooltip && (
              <div className="relative inline-block">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowTooltip(false);
                  }}
                  onClick={() => setShowTooltip(!showTooltip)}
                  className="text-neutral-500 hover:text-neutral-700 p-0.5 rounded transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  aria-label={t("help", { title })}
                  aria-expanded={showTooltip}
                  aria-describedby={showTooltip ? tooltipId : undefined}
                >
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                {showTooltip && (
                  <div id={tooltipId} role="tooltip" className="absolute start-0 bottom-full mb-2 w-64 p-3 rounded-xl bg-primary-900 text-white text-xs shadow-e4 z-50 animate-in fade-in zoom-in-95 pointer-events-none">
                    <p className="font-medium leading-relaxed">
                      {helpTooltip.definition}
                    </p>
                    {helpTooltip.howItIsCounted && (
                      <p className="mt-1.5 pt-1.5 border-t border-primary-700 text-neutral-300 text-[11px]">
                        <span className="font-bold text-tertiary">{t("howCounted")} </span>
                        {helpTooltip.howItIsCounted}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {icon && (
            <div aria-hidden="true" className="w-9 h-9 rounded-xl bg-darnaBg-300/70 flex items-center justify-center text-primary-700 shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px]">
              {icon}
            </div>
          )}
        </div>

        {/* Big number: Fraunces numerals, counts up on arrival */}
        <div className="text-[1.75rem] sm:text-[2rem] leading-tight font-serif text-primary-900 mt-2">
          <AnimatedNumber value={value} />
        </div>
      </div>

      {/* Comparison Sentence with Icon AND Text (Never Color Alone) */}
      <div className="mt-4 pt-3 border-t border-primary/[0.06] flex items-end justify-between gap-3">
        {effectiveSentence && (
          <span
            className={`inline-flex items-start gap-1.5 px-2 py-1 rounded-lg text-xs leading-snug font-medium min-w-0 ${badgeClasses}`}
          >
            {effectiveDirection === "up" ? (
              <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            ) : effectiveDirection === "down" ? (
              <TrendingDown className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <Minus className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <span>{effectiveSentence}</span>
          </span>
        )}

        {/* Minimal sparkline */}
        {sparklineData.length > 1 && (
          <Sparkline data={sparklineData} tone={sparklineTone} className="w-20 h-7 shrink-0" />
        )}
      </div>
    </div>
  );
};
