"use client";

import React, { useCallback } from "react";
import { BrandMinusIcon, BrandPlusIcon } from "@/components/icons";

interface CounterProps {
  title: string;
  subtitle?: string;
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
}

export default function Counter({
  title,
  subtitle,
  value,
  onChange,
  minValue = 1,
}: CounterProps) {
  const onAdd = useCallback(() => {
    onChange(value + 1);
  }, [onChange, value]);

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
        {subtitle && <div className="text-xs text-neutral-500">{subtitle}</div>}
      </div>
      <div className="flex flex-row items-center gap-3">
        <button
          type="button"
          aria-label="Decrease"
          onClick={onReduce}
          disabled={value <= minValue}
          className="w-9 h-9 rounded-full border border-tertiary flex items-center justify-center text-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer select-none btn-press"
        >
          <BrandMinusIcon size={14} strokeWidth={2} />
        </button>
        <div className="font-bold text-sm text-primary min-w-[20px] text-center select-none font-mono">
          {value}
        </div>
        <button
          type="button"
          aria-label="Increase"
          onClick={onAdd}
          className="w-9 h-9 rounded-full border border-tertiary flex items-center justify-center text-primary hover:border-primary transition cursor-pointer select-none btn-press"
        >
          <BrandPlusIcon size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
