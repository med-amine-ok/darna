"use client";

import React, { useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";

export interface RichTextFieldProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  maxChars?: number;
  maxLength?: number;
  className?: string;
  /** id of the <textarea>; lets external <label htmlFor> target it. */
  id?: string;
  name?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-label"?: string;
}

type InlineStyle = "bold" | "italic" | "underline";

const toolButton = (pressed: boolean) =>
  `p-1.5 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
    pressed ? "bg-neutral-200 text-primary" : "hover:bg-neutral-200/70 hover:text-primary"
  }`;

export const RichTextField: React.FC<RichTextFieldProps> = ({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  maxChars,
  maxLength,
  className = "",
  id,
  name,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}) => {
  const t = useTranslations("uiKit.richText");
  const locale = useLocale();
  const generatedId = useId();
  const textareaId = id || generatedId;
  const counterId = `${textareaId}-counter`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [styles, setStyles] = useState<Record<InlineStyle, boolean>>({ bold: false, italic: false, underline: false });
  const [align, setAlign] = useState<"start" | "center">("start");

  const charLimit = maxLength || maxChars || 2000;
  const currentLength = value?.length || 0;
  const describedBy = [ariaDescribedBy, counterId].filter(Boolean).join(" ");

  const toggleStyle = (key: InlineStyle) => setStyles((s) => ({ ...s, [key]: !s[key] }));

  /** Prefixes the line under the caret with a list marker. */
  const insertListMarker = (ordered: boolean) => {
    const el = textareaRef.current;
    const text = value || "";
    const caret = el ? el.selectionStart : text.length;
    const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
    const marker = ordered ? "1. " : "• ";
    const next = text.slice(0, lineStart) + marker + text.slice(lineStart);
    if (next.length > charLimit) return;
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret + marker.length, caret + marker.length);
    });
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-neutral-700">
          {label}{" "}
          {required && (
            <span className="text-accent-700" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="rounded-2xl border border-tertiary-300 bg-white overflow-hidden shadow-2xs focus-within:border-primary transition">
        {/* Formatting Toolbar */}
        <div
          role="toolbar"
          aria-label={t("toolbar")}
          aria-controls={textareaId}
          className="flex items-center gap-1 p-1.5 border-b border-neutral-100 bg-neutral-50/70 text-neutral-600"
        >
          {(
            [
              ["bold", Bold],
              ["italic", Italic],
              ["underline", Underline],
            ] as const
          ).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleStyle(key)}
              aria-pressed={styles[key]}
              className={toolButton(styles[key])}
              title={t(key)}
              aria-label={t(key)}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ))}
          <div className="w-[1px] h-4 bg-neutral-200 mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={() => insertListMarker(false)}
            className={toolButton(false)}
            title={t("bulletList")}
            aria-label={t("bulletList")}
          >
            <List className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => insertListMarker(true)}
            className={toolButton(false)}
            title={t("numberedList")}
            aria-label={t("numberedList")}
          >
            <ListOrdered className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <div className="w-[1px] h-4 bg-neutral-200 mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setAlign("start")}
            aria-pressed={align === "start"}
            className={toolButton(align === "start")}
            title={t("alignStart")}
            aria-label={t("alignStart")}
          >
            <AlignLeft className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setAlign("center")}
            aria-pressed={align === "center"}
            className={toolButton(align === "center")}
            title={t("alignCenter")}
            aria-label={t("alignCenter")}
          >
            <AlignCenter className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id={textareaId}
          name={name}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("placeholder")}
          maxLength={maxLength || maxChars}
          aria-required={required || undefined}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={describedBy}
          className={`w-full p-3 text-xs text-neutral-800 placeholder-neutral-500 focus:outline-none resize-y leading-relaxed bg-transparent ${
            align === "center" ? "text-center" : "text-start"
          } ${styles.bold ? "font-bold" : ""} ${styles.italic ? "italic" : ""} ${styles.underline ? "underline" : ""}`}
        />

        {/* Bottom Counter */}
        <div className="px-3 py-1.5 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-end">
          <span
            id={counterId}
            className={`text-[10px] tabular-nums font-semibold ${
              currentLength > charLimit * 0.9 ? "text-accent-700" : "text-neutral-500"
            }`}
          >
            <span aria-hidden="true">
              {formatNumber(currentLength, locale)}/{formatNumber(charLimit, locale)}
            </span>
            <span className="sr-only">
              {t("charCount", { count: formatNumber(currentLength, locale), max: formatNumber(charLimit, locale) })}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
