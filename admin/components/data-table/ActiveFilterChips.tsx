"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("uiKit.filterBar");
  if (filters.length === 0) return null;

  return (
    <div role="group" aria-label={t("activeFiltersLabel")} className={`flex flex-wrap items-center gap-1.5 py-1 ${className}`}>
      <span className="text-xs font-semibold text-primary-600 me-1" aria-hidden="true">
        {t("activeFilters")}
      </span>
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 ps-2.5 pe-1 py-1 rounded-full bg-white text-xs text-primary-900 shadow-e1 animate-in fade-in zoom-in-95"
        >
          <span className="text-primary-600 font-normal">{f.label}</span>
          <span className="font-semibold">{f.valueDisplay}</span>
          <button
            type="button"
            onClick={() => onRemove(f.key)}
            className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-primary/[0.08] text-primary-600 hover:text-primary-900 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            aria-label={t("removeFilter", { label: `${f.label} ${f.valueDisplay}` })}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-secondary-700 hover:text-secondary-800 underline px-2 py-1 transition cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
      >
        {t("clearAll")}
      </button>
    </div>
  );
};
