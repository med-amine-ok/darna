"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, SlidersHorizontal, RotateCcw, X } from "lucide-react";
import { Dialog } from "./Dialog";
import { formatNumber } from "@/lib/utils/format";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (val: string) => void;
}

export interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  searchQuery?: string;
  searchValue?: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  onOpenDrawer?: () => void;
  onOpenAdvanced?: () => void;
  drawerButtonLabel?: string;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  activeChips?: ActiveChip[];
  children?: React.ReactNode;
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  selects = [],
  onOpenDrawer,
  onOpenAdvanced,
  drawerButtonLabel,
  hasActiveFilters = false,
  onReset,
  activeChips = [],
  children,
}) => {
  const t = useTranslations("uiKit.filterBar");
  const tUi = useTranslations("ui");
  const locale = useLocale();
  const uid = useId();
  const query = searchValue !== undefined ? searchValue : (searchQuery || "");
  const openDrawerAction = onOpenAdvanced || onOpenDrawer;
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const placeholder = searchPlaceholder ?? t("searchPlaceholder");

  // Count active non-"all" selects
  const activeSelectsCount = selects.filter(
    (s) => s.value && s.value !== "all" && s.value !== ""
  ).length;
  const totalActiveCount = activeSelectsCount + (hasActiveFilters ? 1 : 0);
  const activeCountLabel = tUi("activeFilterCount", { count: totalActiveCount });

  const handleOpenMobileFilters = () => {
    if (openDrawerAction) {
      openDrawerAction();
    } else {
      setIsMobileFiltersOpen(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-e1 mb-4 space-y-3">
      {/* Top Filter Controls Row */}
      <div className="flex flex-col md:flex-row md:items-end gap-2.5 sm:gap-3">
        {/* Search Input Row with Mobile Filter Button */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 flex items-center">
            <Search className="w-4 h-4 text-primary-600 absolute start-3 pointer-events-none shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder || t("searchLabel")}
              className="w-full ps-9 pe-3 py-2 bg-white shadow-2xs hover:border-primary/25 border border-primary/[0.12] rounded-xl text-base sm:text-xs text-primary-900 placeholder:text-primary-500 focus:outline-none focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary/[0.08] transition min-h-[44px] sm:min-h-[38px]"
            />
          </div>

          {/* Mobile "Filters" trigger button (< md) */}
          <button
            type="button"
            onClick={handleOpenMobileFilters}
            aria-haspopup="dialog"
            className={`md:hidden inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white shadow-e1 text-xs font-semibold text-primary-900 min-h-[44px] shrink-0 active:scale-95 transition duration-fast ${focusRing}`}
          >
            <SlidersHorizontal className="w-4 h-4 text-secondary" aria-hidden="true" />
            <span>{t("filters")}</span>
            {totalActiveCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-secondary-700 text-white text-[11px] font-semibold flex items-center justify-center">
                <span aria-hidden="true">{formatNumber(totalActiveCount, locale)}</span>
                <span className="sr-only">{activeCountLabel}</span>
              </span>
            )}
          </button>
        </div>

        {/* Labeled Selects (Desktop: inline md:flex, Mobile: inside sheet) */}
        {selects.map((sel) => {
          const selectId = `${uid}-${sel.id}`;
          return (
            <div key={sel.id} className="hidden md:flex flex-col min-w-[150px]">
              <label htmlFor={selectId} className="text-[11px] font-semibold text-primary-600 mb-1 leading-none ps-0.5">
                {sel.label}
              </label>
              <select
                id={selectId}
                value={sel.value}
                onChange={(e) => sel.onChange(e.target.value)}
                className="w-full px-3 py-2 bg-white shadow-2xs hover:border-primary/25 border border-primary/[0.12] rounded-xl text-xs text-primary-900 font-medium focus:outline-none focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary/[0.08] transition cursor-pointer min-h-[38px]"
              >
                {sel.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        {/* Custom Actions / Slots */}
        {children && <div className="hidden md:flex items-center gap-2">{children}</div>}

        {/* Desktop More Filters Button */}
        {openDrawerAction && (
          <button
            type="button"
            onClick={openDrawerAction}
            aria-haspopup="dialog"
            className={`hidden md:inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white shadow-e1 hover:shadow-e2 text-xs font-semibold text-primary-800 transition duration-fast ease-standard cursor-pointer shrink-0 min-h-[38px] ${focusRing}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" />
            <span>{drawerButtonLabel ?? t("moreFilters")}</span>
            {totalActiveCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-secondary-700 text-white text-[11px] font-semibold flex items-center justify-center">
                <span aria-hidden="true">{formatNumber(totalActiveCount, locale)}</span>
                <span className="sr-only">{activeCountLabel}</span>
              </span>
            )}
          </button>
        )}

        {/* Reset Button (Desktop) */}
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-accent-700 hover:text-accent-800 hover:bg-accent-50 rounded-xl transition cursor-pointer shrink-0 min-h-[38px] ${focusRing}`}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{tUi("reset")}</span>
          </button>
        )}
      </div>

      {/* Active Chips Row (Horizontal Scroll on mobile) */}
      {(activeChips.length > 0 || (hasActiveFilters && onReset)) && (
        <div
          role="group"
          aria-label={t("activeFiltersLabel")}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-primary/[0.08] pb-0.5"
        >
          <span className="text-[11px] font-medium text-primary-600 shrink-0" aria-hidden="true">
            {t("activeFilters")}
          </span>

          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/[0.05] text-primary-800 text-[11px] font-medium shrink-0"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-primary-900 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                title={t("removeFilter", { label: chip.label })}
                aria-label={t("removeFilter", { label: chip.label })}
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="md:hidden inline-flex items-center gap-1 text-[11px] font-semibold text-accent-700 hover:underline ms-auto shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>{t("clearAll")}</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile Filter Modal Sheet (Fallback if no external Drawer passed) */}
      {isMobileFiltersOpen && (
        <Dialog
          isOpen={isMobileFiltersOpen}
          onClose={() => setIsMobileFiltersOpen(false)}
          title={t("dialogTitle")}
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              {onReset && (
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setIsMobileFiltersOpen(false);
                  }}
                  className={`px-3 py-2 text-xs font-semibold text-accent-700 hover:underline rounded-lg ${focusRing}`}
                >
                  {tUi("reset")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className={`px-5 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-xs shadow-e1 ${focusRing}`}
              >
                {t("apply")}
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            {selects.map((sel) => {
              const selectId = `${uid}-m-${sel.id}`;
              return (
                <div key={sel.id} className="space-y-1.5">
                  <label htmlFor={selectId} className="block text-xs font-semibold text-primary-900">
                    {sel.label}
                  </label>
                  <select
                    id={selectId}
                    value={sel.value}
                    onChange={(e) => sel.onChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-darnaBg-100 border border-primary/[0.12] rounded-xl text-base text-primary-900 font-medium focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] hover:border-primary/25"
                  >
                    {sel.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </Dialog>
      )}
    </div>
  );
};
