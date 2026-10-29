"use client";

import React from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";

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
        <motion.div
          initial={{ opacity: 0, x: "-50%", y: 24, scale: 0.95 }}
          animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
          exit={{ opacity: 0, x: "-50%", y: 24, scale: 0.95 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="toolbar"
          aria-label={t("toolbar")}
          className={`fixed bottom-6 left-1/2 z-40 bg-[#1E261F] text-white rounded-2xl shadow-darna-modal border border-[#3A493B] px-4 py-2.5 flex items-center gap-4 select-none ${className}`}
        >
          {/* Selected count info */}
          <div className="flex items-center gap-2 text-xs">
            <span aria-live="polite" className="flex items-center gap-2">
              <span className="min-w-6 h-6 px-1 rounded-lg bg-secondary-700 text-white font-bold flex items-center justify-center tabular-nums">
                {formatNumber(selectedCount, locale)}
              </span>
              <span className="font-semibold">{t("selected", { count: selectedCount })}</span>
            </span>

            {totalFilteredCount && totalFilteredCount > selectedCount && !isAllFilteredSelected && onSelectAllFiltered && (
              <button
                type="button"
                onClick={onSelectAllFiltered}
                className="text-xs font-bold text-tertiary hover:text-white underline ps-2 border-s border-neutral-700 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {t("selectAllMatching", { count: formatNumber(totalFilteredCount, locale) })}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ps-3 border-s border-neutral-700">
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
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title={t("clearSelection")}
              aria-label={t("clearSelection")}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
