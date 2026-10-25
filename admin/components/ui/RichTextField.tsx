"use client";

import React from "react";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter } from "lucide-react";

export interface RichTextFieldProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  maxChars?: number;
  maxLength?: number;
  className?: string;
}

export const RichTextField: React.FC<RichTextFieldProps> = ({
  label,
  required = false,
  value,
  onChange,
  placeholder = "Rédigez une description détaillée...",
  maxChars,
  maxLength,
  className = "",
}) => {
  const charLimit = maxLength || maxChars || 2000;
  const currentLength = value?.length || 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-neutral-700">
          {label} {required && <span className="text-accent">*</span>}
        </label>
      )}

      <div className="rounded-2xl border border-tertiary-300 bg-white overflow-hidden shadow-2xs focus-within:border-primary transition">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 p-1.5 border-b border-neutral-100 bg-neutral-50/70 text-neutral-600">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-neutral-200/70 hover:text-primary transition"
            title="Gras"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-neutral-200/70 hover:text-primary transition"
            title="Italique"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-neutral-200/70 hover:text-primary transition"
            title="Souligné"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
          <button
            type="button"
            className="p-1.5 rounded hover:bg-neutral-200/70 hover:text-primary transition"
            title="Liste à puces"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-neutral-200/70 hover:text-primary transition"
            title="Liste numérotée"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
          <button
            type="button"
            className="p-1.5 rounded hover:bg-neutral-200/70 hover:text-primary transition"
            title="Aligner à gauche"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-neutral-200/70 hover:text-primary transition"
            title="Centrer"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxChars}
          className="w-full p-3 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none resize-y leading-relaxed bg-transparent"
        />

        {/* Bottom Counter */}
        <div className="px-3 py-1.5 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-end">
          <span
            className={`text-[10px] tabular-nums font-semibold ${
              currentLength > charLimit * 0.9 ? "text-accent" : "text-neutral-400"
            }`}
          >
            {currentLength}/{charLimit}
          </span>
        </div>
      </div>
    </div>
  );
};
