"use client";

import React from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { m, AnimatePresence } from "framer-motion";
import { dur, ease, spring } from "@/lib/motion";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  onClick: () => void;
}

export interface BulkBarProps {
  selectedCount: number;
  totalFilteredCount?: number;
  isAllFilteredSelected?: boolean;
  onSelectAllFiltered?: () => void;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}

export const BulkBar: React.FC<BulkBarProps> = ({
  selectedCount,
  totalFilteredCount,
  isAllFilteredSelected,
  onSelectAllFiltered,
  onClearSelection,
  actions,
  className = "",
}) => {
  const t = useTranslations("uiKit.bulk");
  const locale = useLocale();
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <m.div
          initial={{ opacity: 0, x: "-50%", y: 32 }}
          animate={{ opacity: 1, x: "-50%", y: 0, transition: spring.sheet }}
          exit={{ opacity: 0, x: "-50%", y: 24, transition: { duration: dur.fast, ease: ease.standard } }}
          role="toolbar"
          aria-label={t("toolbar")}
          className={`fixed bottom-20 lg:bottom-6 left-1/2 z-40 max-w-[calc(100vw-1.5rem)] bg-primary-900 text-white rounded-2xl shadow-e5 ring-1 ring-white/10 ps-3 pe-2 py-2 flex items-center gap-3 sm:gap-4 select-none overflow-x-auto scrollbar-none ${className}`}
        >
          {/* Selected count info */}
          <div className="flex items-center gap-2 text-xs">
            <span aria-live="polite" className="flex items-center gap-2">
              <span className="min-w-7 h-7 px-1.5 rounded-lg bg-white/10 text-white font-semibold flex items-center justify-center tabular-nums">
                {formatNumber(selectedCount, locale)}
              </span>
              <span className="font-medium whitespace-nowrap">{t("selected", { count: selectedCount })}</span>
            </span>

            {totalFilteredCount && totalFilteredCount > selectedCount && !isAllFilteredSelected && onSelectAllFiltered && (
              <button
                type="button"
                onClick={onSelectAllFiltered}
                className="text-xs font-semibold text-tertiary-200 hover:text-white underline underline-offset-2 ps-2 whitespace-nowrap border-s border-white/15 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {t("selectAllMatching", { count: formatNumber(totalFilteredCount, locale) })}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ps-3 border-s border-white/15">
            {actions.map((act) => (
              <Button
                key={act.id}
                variant={act.variant || "secondary"}
                size="sm"
                leftIcon={act.icon}
                onClick={act.onClick}
                className="text-xs py-1 px-3"
              >
                {act.label}
              </Button>
            ))}

            {/* Clear Selection */}
            <button
              type="button"
              onClick={onClearSelection}
              className="p-1.5 rounded-lg text-tertiary-200 hover:text-white hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title={t("clearSelection")}
              aria-label={t("clearSelection")}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
