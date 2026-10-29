"use client";

import React, { useCallback } from "react";
import { useTranslations } from "next-intl";
import { BrandMinusIcon, BrandPlusIcon } from "@/components/icons";

interface CounterProps {
  title: string;
  subtitle?: string;
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  /** Upper bound (inclusive); the + button is disabled at the max. */
  maxValue?: number;
}

export default function Counter({
  title,
  subtitle,
  value,
  onChange,
  minValue = 1,
  maxValue,
}: CounterProps) {
  const t = useTranslations("common");
  const atMax = maxValue !== undefined && value >= maxValue;
  const onAdd = useCallback(() => {
    if (maxValue !== undefined && value >= maxValue) return;
    onChange(value + 1);
  }, [onChange, value, maxValue]);

  const onReduce = useCallback(() => {
    if (value <= minValue) {
      return;
    }
    onChange(value - 1);
  }, [value, onChange, minValue]);

  return (
    <div className="flex flex-row items-center justify-between py-2">
      <div className="flex flex-col text-start">
        <div className="font-semibold text-sm text-primary">{title}</div>
        {subtitle && <div className="text-xs text-neutral-600">{subtitle}</div>}
      </div>
      <div className="flex flex-row items-center gap-3">
        <button
          type="button"
          aria-label={t("decreaseValue", { field: title })}
          onClick={onReduce}
          disabled={value <= minValue}
          className="w-9 h-9 rounded-full border border-tertiary flex items-center justify-center text-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer select-none btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <BrandMinusIcon size={14} strokeWidth={2} />
        </button>
        <div aria-live="polite" className="font-bold text-sm text-primary min-w-[20px] text-center select-none font-mono">
          {value}
        </div>
        <button
          type="button"
          aria-label={t("increaseValue", { field: title })}
          onClick={onAdd}
          disabled={atMax}
          className="w-9 h-9 rounded-full border border-tertiary flex items-center justify-center text-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer select-none btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <BrandPlusIcon size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
