"use client";

import React from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Drawer } from "./Drawer";

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onApply: () => void;
  onReset: () => void;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
  children: React.ReactNode;
}

/** Advanced-filters side sheet (built on the accessible Drawer). */
export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  title,
  onApply,
  onReset,
  hasActiveFilters = false,
  activeFilterCount,
  children,
}) => {
  const t = useTranslations("ui");
  const isActive = hasActiveFilters || (activeFilterCount !== undefined && activeFilterCount > 0);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2 text-sm font-semibold font-sans">
          <SlidersHorizontal className="w-4 h-4 text-secondary" aria-hidden="true" />
          <span>{title ?? t("advancedFilters")}</span>
          {activeFilterCount !== undefined && activeFilterCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-700 text-white font-semibold tabular-nums">
              {t("activeFilterCount", { count: activeFilterCount })}
            </span>
          )}
        </span>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            disabled={!isActive}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
              isActive ? "text-accent-700 hover:bg-accent/10 cursor-pointer" : "text-primary-600 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("reset")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="px-5 py-2.5 min-h-[44px] bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-semibold transition duration-fast shadow-e1 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            {t("applyFilters")}
          </button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
};
