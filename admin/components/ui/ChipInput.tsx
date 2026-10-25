"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";

export interface ChipInputProps {
  label?: string;
  required?: boolean;
  chips?: string[];
  tags?: string[];
  onChange: (chips: string[]) => void;
  placeholder?: string;
  maxChips?: number;
  className?: string;
}

export const ChipInput: React.FC<ChipInputProps> = ({
  label,
  required = false,
  chips,
  tags,
  onChange,
  placeholder = "Ajouter...",
  maxChips,
  className = "",
}) => {
  const chipList = tags || chips || [];
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !chipList.includes(trimmed)) {
      if (!maxChips || chipList.length < maxChips) {
        onChange([...chipList, trimmed]);
        setInputValue("");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (idxToRemove: number) => {
    onChange(chipList.filter((_, idx) => idx !== idxToRemove));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-700">
            {label} {required && <span className="text-accent">*</span>}
          </label>
          {maxChips && (
            <span className="text-[10px] text-neutral-400">
              {chipList.length}/{maxChips}
            </span>
          )}
        </div>
      )}

      {/* Input + Add button */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={Boolean(maxChips && chipList.length >= maxChips)}
          className="flex-1 px-3 py-2 text-xs bg-white border border-tertiary-300 rounded-xl focus:border-primary focus:outline-none transition"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim() || Boolean(maxChips && chipList.length >= maxChips)}
          className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-neutral-50 border border-tertiary-300 text-xs font-semibold text-neutral-700 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Render Chips */}
      {chipList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chipList.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 font-medium select-none"
            >
              <span>{chip}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="hover:text-accent p-0.5 rounded transition cursor-pointer"
                aria-label={`Supprimer ${chip}`}
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
