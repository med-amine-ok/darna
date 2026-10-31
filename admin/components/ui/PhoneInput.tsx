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
        <label htmlFor={inputId} className="block text-xs font-semibold text-primary-800">
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
        className={`flex items-center rounded-xl border bg-white overflow-hidden shadow-2xs hover:border-primary/25 focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary/[0.08] transition duration-fast ease-standard ${
          invalid ? "border-accent-600" : "border-tertiary-300"
        }`}
      >
        {/* Algerian dialling prefix */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-darnaBg-100 border-e border-primary/[0.12] shrink-0 select-none">
          <span className="text-base leading-none" aria-hidden="true">
            🇩🇿
          </span>
          <span className="text-xs font-semibold text-primary-800" aria-hidden="true">
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
          className="flex-1 px-3 py-2 text-xs text-primary-900 placeholder:text-primary-500 focus:outline-none bg-transparent"
        />
      </div>
    </div>
  );
};
