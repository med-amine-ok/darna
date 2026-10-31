"use client";

/**
 * Legacy react-hook-form input (LoginModal, RegisterModal, host forms). Same props as before;
 * renders the kit `Input` (components/ui/Field.tsx): floating label, hairline field,
 * terracotta focus ring, animated error with aria-describedby, DZD prefix for prices.
 * New code can use the kit Input directly with `{...register("name")}`.
 */

import React from "react";
import { useTranslations } from "next-intl";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { Input as KitInput } from "@/components/ui/Field";

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
  const errorText = error
    ? typeof error.message === "string" && error.message
      ? error.message
      : t("fieldRequired", { field: label })
    : null;

  return (
    <KitInput
      id={id}
      label={label}
      type={type}
      disabled={disabled}
      autoComplete={autoComplete}
      aria-required={required || undefined}
      error={errorText}
      prefix={formatPrice ? <span aria-hidden="true">{t("currencySymbol")}</span> : undefined}
      {...register(id, { required })}
    />
  );
}
