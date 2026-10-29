"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface InputProps {
  id: string;
  label: string;
  type?: string;
  disabled?: boolean;
  formatPrice?: boolean;
  required?: boolean;
  autoComplete?: string;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
}

export default function Input({
  id,
  label,
  type = "text",
  disabled,
  formatPrice,
  register,
  required,
  autoComplete,
  errors,
}: InputProps) {
  const t = useTranslations("common");
  const error = errors[id];
  const errorId = `${id}-error`;
  const errorText = error
    ? typeof error.message === "string" && error.message
      ? error.message
      : t("fieldRequired", { field: label })
    : null;

  return (
    <div className="w-full">
      <div className="relative">
        {formatPrice && (
          <span
            aria-hidden="true"
            className="text-xs font-bold text-neutral-600 bg-neutral-100 border border-tertiary px-1.5 py-0.5 rounded absolute top-5 start-3 pointer-events-none select-none"
          >
            {t("currencySymbol")}
          </span>
        )}
        <input
          id={id}
          disabled={disabled}
          {...register(id, { required })}
          placeholder=" "
          type={type}
          autoComplete={autoComplete}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`peer w-full p-4 pt-6 font-normal text-primary bg-white border rounded-xl outline-none transition disabled:opacity-70 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
            formatPrice ? "ps-14 pe-4" : "px-4"
          } ${
            error
              ? "border-status-error focus:border-status-error"
              : "border-tertiary focus:border-primary"
          } text-start`}
        />
        <label
          htmlFor={id}
          className={`absolute text-md duration-150 transform -translate-y-3 top-5 z-10 origin-[top_left] rtl:origin-[top_right] ${
            formatPrice ? "start-14" : "start-4"
          } peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 ${
            error ? "text-status-error" : "text-neutral-600 peer-focus:text-primary"
          }`}
        >
          {label}
        </label>
      </div>
      {errorText && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-status-error">
          {errorText}
        </p>
      )}
    </div>
  );
}
