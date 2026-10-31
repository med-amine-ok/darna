"use client";

import React, { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDzd, formatNumber } from "@/lib/utils/format";

export interface RangeSliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
  histogramBars?: number[]; // Heights 0-100 for distribution preview
  /** "DZD" (default) formats values as money; pass "" for plain numbers. */
  currency?: string;
  className?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  step = 1000,
  value,
  onChange,
  histogramBars = [15, 30, 65, 80, 100, 90, 75, 45, 30, 20, 10, 5],
  currency = "DZD",
  className = "",
}) => {
  const t = useTranslations("uiKit.range");
  const locale = useLocale();
  const uid = useId();
  const labelId = `${uid}-label`;
  const minInputId = `${uid}-min`;
  const maxInputId = `${uid}-max`;
  const [minVal, maxVal] = value;
  const isMoney = /^(dzd|da|dinar)$/i.test(currency);
  const fmt = (v: number) => (isMoney ? formatDzd(v, locale) : formatNumber(v, locale));

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMin = Math.min(Number(e.target.value), maxVal - step);
    onChange([nextMin, maxVal]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMax = Math.max(Number(e.target.value), minVal + step);
    onChange([minVal, nextMax]);
  };

  const minPercent = Math.max(0, Math.min(100, ((minVal - min) / (max - min)) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxVal - min) / (max - min)) * 100));
  const minAria = label ? `${label} – ${t("minimum")}` : t("minimum");
  const maxAria = label ? `${label} – ${t("maximum")}` : t("maximum");

  return (
    <div role="group" aria-labelledby={label ? labelId : undefined} className={`space-y-2 text-start ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-primary-900">
          <span id={labelId}>{label}</span>
          <span className="text-[11px] text-primary-600 font-mono" dir="ltr">
            {fmt(minVal)} – {fmt(maxVal)}
          </span>
        </div>
      )}

      {/* Mini histogram preview (decorative) */}
      {histogramBars && histogramBars.length > 0 && (
        <div className="flex items-end gap-1 h-8 px-1 pt-1" aria-hidden="true">
          {histogramBars.map((height, idx) => {
            const barPercent = (idx / (histogramBars.length - 1)) * 100;
            const isInRange = barPercent >= minPercent && barPercent <= maxPercent;
            return (
              <div
                key={idx}
                className={`flex-1 rounded-t-xs transition-colors duration-fast ${
                  isInRange ? "bg-secondary" : "bg-tertiary/50"
                }`}
                style={{ height: `${Math.max(12, height)}%` }}
              />
            );
          })}
        </div>
      )}

      {/* Track & Handles */}
      <div className="relative h-6 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1.5 bg-primary/[0.08] rounded-full" aria-hidden="true" />

        {/* Selected Active Track Range */}
        <div
          aria-hidden="true"
          className="absolute h-1.5 bg-secondary-600 rounded-full"
          style={{
            insetInlineStart: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={handleMinChange}
          className="peer/min absolute w-full h-1.5 opacity-0 cursor-pointer pointer-events-auto z-20"
          aria-label={minAria}
          aria-valuetext={fmt(minVal)}
        />

        {/* Max Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={handleMaxChange}
          className="peer/max absolute w-full h-1.5 opacity-0 cursor-pointer pointer-events-auto z-20"
          aria-label={maxAria}
          aria-valuetext={fmt(maxVal)}
        />

        {/* Visual Knobs (show focus of the hidden native sliders) */}
        <div
          aria-hidden="true"
          className="absolute w-[18px] h-[18px] bg-white border-2 border-secondary-600 rounded-full shadow-e2 pointer-events-none -translate-x-1/2 rtl:translate-x-1/2 z-10 peer-focus-visible/min:ring-2 peer-focus-visible/min:ring-accent-600 peer-focus-visible/min:ring-offset-1"
          style={{ insetInlineStart: `${minPercent}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute w-[18px] h-[18px] bg-white border-2 border-secondary-600 rounded-full shadow-e2 pointer-events-none -translate-x-1/2 rtl:translate-x-1/2 z-10 peer-focus-visible/max:ring-2 peer-focus-visible/max:ring-accent-600 peer-focus-visible/max:ring-offset-1"
          style={{ insetInlineStart: `${maxPercent}%` }}
        />
      </div>

      {/* Numerical inputs */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1">
          <label htmlFor={minInputId} className="text-[11px] text-primary-600 font-medium">
            {t("min")}
          </label>
          <input
            id={minInputId}
            type="number"
            min={min}
            max={maxVal - step}
            step={step}
            value={minVal}
            onChange={(e) => onChange([Number(e.target.value), maxVal])}
            className="w-full text-xs font-mono rounded-lg border border-primary/[0.12] px-2 py-1 bg-white focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] hover:border-primary/25"
          />
        </div>
        <span className="text-primary-600 text-xs mt-3" aria-hidden="true">
          –
        </span>
        <div className="flex-1">
          <label htmlFor={maxInputId} className="text-[11px] text-primary-600 font-medium">
            {t("max")}
          </label>
          <input
            id={maxInputId}
            type="number"
            min={minVal + step}
            max={max}
            step={step}
            value={maxVal}
            onChange={(e) => onChange([minVal, Number(e.target.value)])}
            className="w-full text-xs font-mono rounded-lg border border-primary/[0.12] px-2 py-1 bg-white focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] hover:border-primary/25"
          />
        </div>
      </div>
    </div>
  );
};
