"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";

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
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  placeholder = "Select options...",
  options,
  selectedValues,
  value,
  onChange,
  className = "",
}) => {
  const activeSelected = selectedValues || value || [];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (val: string) => {
    if (activeSelected.includes(val)) {
      onChange(activeSelected.filter((v) => v !== val));
    } else {
      onChange([...activeSelected, val]);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 text-start ${className}`}>
      {label && <label className="block text-xs font-semibold text-primary">{label}</label>}

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[38px] rounded-xl bg-white border border-tertiary/70 ps-3 pe-8 py-1.5 text-xs text-primary shadow-2xs flex flex-wrap items-center gap-1.5 cursor-pointer hover:border-secondary transition-colors"
      >
        {activeSelected.length === 0 ? (
          <span className="text-neutral-400 select-none">{placeholder}</span>
        ) : (
          <>
            <span className="font-semibold text-primary">
              {activeSelected.length} selected
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition"
              title="Clear all"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 absolute end-2.5 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 start-0 mt-1 w-full min-w-[240px] max-w-sm rounded-xl bg-white border border-tertiary/80 shadow-darna-dropdown p-2 animate-in fade-in zoom-in-95">
          {/* Search box inside dropdown */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute start-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs bg-darnaBg/60 rounded-lg ps-8 pe-3 py-1.5 border border-tertiary/50 focus:outline-none focus:ring-1 focus:ring-secondary"
              autoFocus
            />
          </div>

          {/* Quick Select Actions */}
          <div className="flex items-center justify-between px-1 mb-2 text-[10px] text-neutral-500 font-semibold border-b border-neutral-100 pb-1">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="hover:text-primary transition"
            >
              Select All ({options.length})
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="hover:text-accent transition"
            >
              Reset
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 darna-admin-scrollbar">
            {filteredOptions.length === 0 ? (
              <p className="p-2 text-center text-xs text-neutral-400">No matches found</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = activeSelected.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                      isSelected
                        ? "bg-secondary/15 text-primary font-semibold"
                        : "hover:bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-secondary border-secondary text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{opt.label}</span>
                    </div>
                    {opt.count !== undefined && (
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {opt.count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
