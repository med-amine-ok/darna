"use client";

import React from "react";
import { X } from "lucide-react";

export interface ActiveFilterItem {
  key: string;
  label: string;
  valueDisplay: string;
}

export interface ActiveFilterChipsProps {
  filters: ActiveFilterItem[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onRemove,
  onClearAll,
  className = "",
}) => {
  if (filters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 py-1 ${className}`}>
      <span className="text-xs font-semibold text-neutral-500 me-1">
        Active filters:
      </span>
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-tertiary/70 text-xs text-primary shadow-2xs animate-in fade-in"
        >
          <span className="text-neutral-500 font-normal">{f.label}:</span>
          <span className="font-semibold">{f.valueDisplay}</span>
          <button
            type="button"
            onClick={() => onRemove(f.key)}
            className="p-0.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-primary transition cursor-pointer"
            aria-label={`Remove filter ${f.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-bold text-secondary hover:text-[#526445] underline px-2 py-1 transition cursor-pointer"
      >
        Clear all
      </button>
    </div>
  );
};
