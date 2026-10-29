"use client";

import React, { useId } from "react";
import { useTranslations } from "next-intl";

export interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  /** id of the <input>; lets external <label htmlFor> target it. */
  id?: string;
  name?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-label"?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  placeholder = "555 12 34 56",
  className = "",
  id,
  name,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}) => {
  const t = useTranslations("uiKit");
  const generatedId = useId();
  const inputId = id || generatedId;
  const prefixId = `${inputId}-prefix`;
  const describedBy = [prefixId, ariaDescribedBy].filter(Boolean).join(" ");
  const invalid = ariaInvalid === true || ariaInvalid === "true";

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-neutral-700">
          {label}{" "}
          {required && (
            <span className="text-accent-700" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div
        dir="ltr"
        className={`flex items-center rounded-xl border bg-white overflow-hidden shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-accent-600/40 transition ${
          invalid ? "border-accent-600" : "border-tertiary-300"
        }`}
      >
        {/* Algerian dialling prefix */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border-e border-neutral-200 shrink-0 select-none">
          <span className="text-base leading-none" aria-hidden="true">
            🇩🇿
          </span>
          <span className="text-xs font-bold text-neutral-700" aria-hidden="true">
            +213
          </span>
          <span id={prefixId} className="sr-only">
            {t("phone.countryCode")}
          </span>
        </div>
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-required={required || undefined}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={describedBy}
          className="flex-1 px-3 py-2 text-xs text-neutral-800 placeholder-neutral-500 focus:outline-none bg-transparent"
        />
      </div>
    </div>
  );
};
