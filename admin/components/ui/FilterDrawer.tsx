"use client";

import React from "react";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";

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

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  title = "Filtres avancés",
  onApply,
  onReset,
  hasActiveFilters = false,
  activeFilterCount,
  children,
}) => {
  if (!isOpen) return null;

  const isActive = hasActiveFilters || (activeFilterCount !== undefined && activeFilterCount > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 end-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-50 border-s border-tertiary-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-bold text-primary">{title}</h2>
            {activeFilterCount !== undefined && activeFilterCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-white font-bold tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filters Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 darna-admin-scrollbar">
          {children}
        </div>

        {/* Footer Actions */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            disabled={!isActive}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-xl transition ${
              isActive
                ? "text-accent hover:bg-accent/10 cursor-pointer"
                : "text-neutral-400 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="px-5 py-2.5 min-h-[44px] bg-primary hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>
    </div>
  );
};
