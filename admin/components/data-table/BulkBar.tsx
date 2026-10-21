"use client";

import React from "react";
import { X, CheckCircle, Ban, Trash2, Download } from "lucide-react";
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
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-40 bg-[#1E261F] text-white rounded-2xl shadow-darna-modal border border-[#3A493B] px-4 py-2.5 flex items-center gap-4 select-none ${className}`}
        >
          {/* Selected count info */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-6 h-6 rounded-lg bg-secondary text-white font-bold flex items-center justify-center tabular-nums">
              {selectedCount}
            </span>
            <span className="font-semibold">Selected</span>

            {totalFilteredCount && totalFilteredCount > selectedCount && !isAllFilteredSelected && onSelectAllFiltered && (
              <button
                type="button"
                onClick={onSelectAllFiltered}
                className="text-xs font-bold text-tertiary hover:text-white underline ps-2 border-s border-neutral-700 transition"
              >
                Select all {totalFilteredCount} matching filters
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
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
