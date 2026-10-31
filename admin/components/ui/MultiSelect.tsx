"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Check, X, Search } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

export interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selectedValues?: string[];
  value?: string[];
  onChange: (values: string[]) => void;
  className?: string;
  id?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  placeholder,
  options,
  selectedValues,
  value,
  onChange,
  className = "",
  id,
}) => {
  const t = useTranslations("uiKit.multiSelect");
  const tUi = useTranslations("ui");
  const locale = useLocale();
  const uid = useId();
  const baseId = id || uid;
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (idx: number) => `${baseId}-opt-${idx}`;

  const activeSelected = selectedValues || value || [];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))
  );
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, filteredOptions.length - 1));

  const toggleOption = (val: string) => {
    if (activeSelected.includes(val)) {
      onChange(activeSelected.filter((v) => v !== val));
    } else {
      onChange([...activeSelected, val]);
    }
  };

  const close = (restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(Math.min(safeActiveIndex + 1, filteredOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(Math.max(safeActiveIndex - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(Math.max(0, filteredOptions.length - 1));
        break;
      case "Enter": {
        e.preventDefault();
        const opt = filteredOptions[safeActiveIndex];
        if (opt) toggleOption(opt.value);
        break;
      }
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
    }
  };

  // Keep the keyboard-highlighted option visible.
  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(`${baseId}-opt-${safeActiveIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [isOpen, safeActiveIndex, baseId]);

  const selectedSummary =
    activeSelected.length === 0
      ? placeholder ?? t("placeholder")
      : t("selected", { count: activeSelected.length });

  return (
    <div ref={containerRef} className={`relative space-y-1.5 text-start ${className}`}>
      {label && (
        <label id={labelId} htmlFor={`${baseId}-trigger`} className="block text-xs font-semibold text-primary-900">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div className="relative">
        <button
          ref={triggerRef}
          id={`${baseId}-trigger`}
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && isOpen) {
              e.stopPropagation();
              close();
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-labelledby={label ? `${labelId} ${valueId}` : valueId}
          className="w-full min-h-[38px] rounded-xl bg-white border border-primary/[0.08] ps-3 pe-14 py-1.5 text-xs text-primary-900 shadow-2xs flex flex-wrap items-center gap-1.5 cursor-pointer hover:border-primary/25 transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1"
        >
          <span
            id={valueId}
            className={activeSelected.length === 0 ? "text-primary-600 select-none" : "font-semibold text-primary-900"}
          >
            {selectedSummary}
          </span>
        </button>
        {activeSelected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="absolute end-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-primary/[0.08] text-primary-600 hover:text-primary-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            title={t("clearAll")}
            aria-label={t("clearAll")}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 text-primary-600 absolute end-2.5 top-1/2 -translate-y-1/2 transition-transform duration-fast pointer-events-none ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 start-0 mt-1 w-full min-w-[240px] max-w-sm rounded-xl bg-white shadow-e3 p-2 animate-in fade-in zoom-in-95">
          {/* Search box inside dropdown */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-primary-600 absolute start-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleListKeyDown}
              placeholder={t("search")}
              aria-label={t("searchLabel")}
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={filteredOptions.length > 0 ? optionId(safeActiveIndex) : undefined}
              className="w-full text-xs bg-white rounded-lg ps-8 pe-3 py-1.5 border border-primary/[0.12] focus:outline-none focus:ring-4 focus:ring-primary/[0.08] hover:border-primary/25 focus:border-primary-600"
              autoFocus
            />
          </div>

          {/* Quick Select Actions */}
          <div className="flex items-center justify-between px-1 mb-2 text-[11px] text-primary-600 font-semibold border-b border-primary/[0.08] pb-1">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="hover:text-primary-900 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              {t("selectAll", { count: formatNumber(options.length, locale) })}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="hover:text-accent-700 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              {tUi("reset")}
            </button>
          </div>

          {/* Options List */}
          {filteredOptions.length === 0 ? (
            <p className="p-2 text-center text-xs text-primary-600" role="status">
              {t("noMatches")}
            </p>
          ) : (
            <ul
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : t("searchLabel")}
              className="max-h-56 overflow-y-auto space-y-0.5 darna-admin-scrollbar"
            >
              {filteredOptions.map((opt, idx) => {
                const isSelected = activeSelected.includes(opt.value);
                const isActive = idx === safeActiveIndex;
                return (
                  <li
                    key={opt.value}
                    id={optionId(idx)}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                      isSelected
                        ? "bg-secondary/15 text-primary font-semibold"
                        : "hover:bg-primary/[0.05] text-primary-800"
                    } ${isActive ? "ring-1 ring-inset ring-accent-600/60" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-secondary-700 border-secondary-700 text-white"
                            : "border-primary/30 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span>{opt.label}</span>
                    </span>
                    {opt.count !== undefined && (
                      <span className="text-[11px] text-primary-600 font-medium tabular-nums">
                        {formatNumber(opt.count, locale)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
