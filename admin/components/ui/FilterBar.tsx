"use client";

import React from "react";
import { Search, SlidersHorizontal, RotateCcw, X } from "lucide-react";

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

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  selects = [],
  onOpenDrawer,
  onOpenAdvanced,
  drawerButtonLabel = "Plus de filtres",
  hasActiveFilters = false,
  onReset,
  activeChips = [],
  children,
}) => {
  const query = searchValue !== undefined ? searchValue : (searchQuery || "");
  const openDrawerAction = onOpenAdvanced || onOpenDrawer;
  return (
    <div className="bg-white rounded-2xl border border-tertiary-200/80 p-3.5 shadow-xs mb-4 space-y-3">
      {/* Top Filter Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute start-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full ps-9 pe-3 py-2 bg-neutral-50/70 hover:bg-neutral-50 border border-tertiary-200 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-primary focus:bg-white transition"
            />
          </div>
        </div>

        {/* Labeled Selects */}
        {selects.map((sel) => (
          <div key={sel.id} className="flex flex-col min-w-[150px]">
            <label className="text-[11px] font-semibold text-neutral-500 mb-1 leading-none ps-0.5">
              {sel.label}
            </label>
            <select
              value={sel.value}
              onChange={(e) => sel.onChange(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50/70 hover:bg-neutral-50 border border-tertiary-200 rounded-xl text-xs text-neutral-800 font-medium focus:outline-none focus:border-primary focus:bg-white transition cursor-pointer"
            >
              {sel.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Custom Actions / Slots */}
        {children}

        {/* More Filters Drawer Button */}
        {openDrawerAction && (
          <button
            type="button"
            onClick={openDrawerAction}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-tertiary-200 hover:border-tertiary-300 rounded-xl bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
            <span>{drawerButtonLabel}</span>
          </button>
        )}

        {/* Reset Button */}
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-accent hover:text-accent-700 hover:bg-accent/10 rounded-xl transition cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
          <span className="text-[11px] text-neutral-400 font-medium">Filtres actifs:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200 text-[11px] font-medium"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-accent p-0.5 rounded-full transition cursor-pointer"
                aria-label={`Supprimer ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
