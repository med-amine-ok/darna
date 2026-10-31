"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
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
  id?: string;
}

export const ChipInput: React.FC<ChipInputProps> = ({
  label,
  required = false,
  chips,
  tags,
  onChange,
  placeholder,
  maxChips,
  className = "",
  id,
}) => {
  const t = useTranslations("uiKit");
  const generatedId = useId();
  const inputId = id || generatedId;
  const countId = `${inputId}-count`;
  const chipList = tags || chips || [];
  const [inputValue, setInputValue] = useState("");
  const isFull = Boolean(maxChips && chipList.length >= maxChips);

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
          <label htmlFor={inputId} className="text-xs font-semibold text-primary-800">
            {label}{" "}
            {required && (
              <span className="text-accent-700" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {maxChips && (
            <span id={countId} className="text-[11px] text-primary-600 tabular-nums">
              <span aria-hidden="true">
                {chipList.length}/{maxChips}
              </span>
              <span className="sr-only">{t("chipInput.count", { count: chipList.length, max: maxChips })}</span>
            </span>
          )}
        </div>
      )}

      {/* Input + Add button */}
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t("chipInput.placeholder")}
          disabled={isFull}
          aria-required={required || undefined}
          aria-describedby={label && maxChips ? countId : undefined}
          className="flex-1 px-3 py-2 text-xs bg-white border border-primary/[0.12] rounded-xl focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary/[0.08] focus-visible:ring-offset-1 transition hover:border-primary/25"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim() || isFull}
          className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-primary/[0.05] border border-primary/[0.12] text-xs font-semibold text-primary-800 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t("chipInput.add")}</span>
        </button>
      </div>

      {/* Render Chips */}
      {chipList.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {chipList.map((chip, idx) => (
            <li
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/[0.05] border border-primary/[0.12] text-xs text-primary-900 font-medium select-none"
            >
              <span>{chip}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="hover:text-accent-700 p-0.5 rounded transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                aria-label={t("chipInput.remove", { value: chip })}
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
