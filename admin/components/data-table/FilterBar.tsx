"use client";

import React, { useEffect, useRef } from "react";
import { Search, SlidersHorizontal, Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  inlineFilters?: React.ReactNode;
  onOpenFilterDrawer?: () => void;
  activeFilterCount?: number;
  totalResults?: number;
  resultsLabel?: string;
  onExport?: () => void;
  rightActions?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  inlineFilters,
  onOpenFilterDrawer,
  activeFilterCount = 0,
  totalResults,
  resultsLabel,
  onExport,
  rightActions,
  className = "",
}) => {
  const t = useTranslations("common");
  const tKit = useTranslations("uiKit.filterBar");
  const tUi = useTranslations("ui");
  const locale = useLocale();
  const placeholder = searchPlaceholder || t("search");
  const labelResults = resultsLabel;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Side: Search + Inline Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[240px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              aria-keyshortcuts="/"
              className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-[38px] bg-white rounded-xl ps-9 pe-8 py-2 border border-tertiary/70 text-primary placeholder:text-neutral-500 shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent-600/40 focus:border-secondary transition"
            />
            {/* Shortcut hint */}
            {!searchQuery && (
              <span className="hidden sm:inline-block absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 font-mono px-1 py-0.5 rounded border border-neutral-200 bg-neutral-50 pointer-events-none"
                aria-hidden="true"
              >
                /
              </span>
            )}
          </div>

          {/* Quick inline filter widgets */}
          {inlineFilters}

          {/* "More Filters" Button */}
          {onOpenFilterDrawer && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={onOpenFilterDrawer}
              className="text-xs font-semibold"
            >
              {t("filters")}
              {activeFilterCount > 0 && (
                <span className="ms-1 px-1.5 py-0.5 rounded-full bg-secondary-700 text-white text-[10px] font-bold tabular-nums">
                  <span aria-hidden="true">{formatNumber(activeFilterCount, locale)}</span>
                  <span className="sr-only">{tUi("activeFilterCount", { count: activeFilterCount })}</span>
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Right Side: Result Count & Actions */}
        <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
          {totalResults !== undefined && (
            <span className="text-xs font-semibold text-neutral-500 tabular-nums" aria-live="polite">
              {resultsLabel ? (
                <>
                  <strong className="text-primary font-bold">{formatNumber(totalResults, locale)}</strong> {labelResults}
                </>
              ) : (
                tKit.rich("results", {
                  count: totalResults,
                  formatted: formatNumber(totalResults, locale),
                  b: (chunks) => <strong className="text-primary font-bold">{chunks}</strong>,
                })
              )}
            </span>
          )}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={onExport}
              className="text-xs"
            >
              {t("export")}
            </Button>
          )}

          {rightActions}
        </div>
      </div>
    </div>
  );
};
