"use client";

import React from "react";
import { formatDzd } from "@/lib/utils/format";

export interface RangeSliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
  histogramBars?: number[]; // Heights 0-100 for distribution preview
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
  className = "",
}) => {
  const [minVal, maxVal] = value;

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

  return (
    <div className={`space-y-2 text-start ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-primary">
          <span>{label}</span>
          <span className="text-[11px] text-neutral-500 font-mono">
            {formatDzd(minVal)} – {formatDzd(maxVal)}
          </span>
        </div>
      )}

      {/* Mini histogram preview */}
      {histogramBars && histogramBars.length > 0 && (
        <div className="flex items-end gap-1 h-8 px-1 pt-1">
          {histogramBars.map((height, idx) => {
            const barPercent = (idx / (histogramBars.length - 1)) * 100;
            const isInRange = barPercent >= minPercent && barPercent <= maxPercent;
            return (
              <div
                key={idx}
                className={`flex-1 rounded-t-xs transition-colors duration-150 ${
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
        <div className="absolute w-full h-1.5 bg-neutral-200 rounded-full" />

        {/* Selected Active Track Range */}
        <div
          className="absolute h-1.5 bg-secondary rounded-full"
          style={{
            left: `${minPercent}%`,
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
          className="absolute w-full h-1.5 opacity-0 cursor-pointer pointer-events-auto z-20"
          aria-label="Minimum price"
        />

        {/* Max Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={handleMaxChange}
          className="absolute w-full h-1.5 opacity-0 cursor-pointer pointer-events-auto z-20"
          aria-label="Maximum price"
        />

        {/* Visual Knobs */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-secondary rounded-full shadow-xs pointer-events-none -translate-x-1/2 z-10"
          style={{ left: `${minPercent}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-secondary rounded-full shadow-xs pointer-events-none -translate-x-1/2 z-10"
          style={{ left: `${maxPercent}%` }}
        />
      </div>

      {/* Numerical inputs */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1">
          <span className="text-[11px] text-neutral-500 font-medium">Min</span>
          <input
            type="number"
            min={min}
            max={maxVal - step}
            step={step}
            value={minVal}
            onChange={(e) => onChange([Number(e.target.value), maxVal])}
            className="w-full text-xs font-mono rounded-lg border border-tertiary/70 px-2 py-1 bg-white focus:outline-none focus:border-secondary"
          />
        </div>
        <span className="text-neutral-400 text-xs mt-3">–</span>
        <div className="flex-1">
          <span className="text-[11px] text-neutral-500 font-medium">Max</span>
          <input
            type="number"
            min={minVal + step}
            max={max}
            step={step}
            value={maxVal}
            onChange={(e) => onChange([minVal, Number(e.target.value)])}
            className="w-full text-xs font-mono rounded-lg border border-tertiary/70 px-2 py-1 bg-white focus:outline-none focus:border-secondary"
          />
        </div>
      </div>
    </div>
  );
};
