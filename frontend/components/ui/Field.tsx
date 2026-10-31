"use client";

/**
 * Form fields, Input, Textarea, Select (native, styled) with floating labels.
 *
 *   <Input label="Email" type="email" helper="We never share it" />
 *   <Input label="Price" prefix="DZD" error={errors.price?.message} {...register("price")} />
 *   <Textarea label="Note to host" maxLength={500} showCount />
 *   <Select label="Wilaya" options={[{ value: "16", label: "Alger" }]} />
 *
 * - Floating label is CSS-only (`placeholder=" "` + peer), so it works in server HTML.
 * - helper / error text are wired through aria-describedby; error sets aria-invalid and
 *   reveals with a short fade/rise. 16px text on phones (no iOS zoom), 15px from `sm`.
 * - All three forward refs and spread native props, so react-hook-form `register()` works.
 * - Visual states live in styles/globals.css (`.field-control`): rest hairline, hover,
 *   focus (terracotta ring), invalid, disabled.
 */

import React, { forwardRef, useId, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { BrandAlertCircleIcon, BrandChevronDownIcon } from "@/components/icons";
import { dur, ease } from "@/lib/motion";
import { cn } from "./cn";

interface FieldBaseProps {
  /** Visible label (floats above the value). */
  label: string;
  /** Visually hide the label (still announced). */
  hideLabel?: boolean;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  /** Leading adornment (icon or unit like "DZD"). */
  prefix?: React.ReactNode;
  /** Trailing adornment (icon, unit or IconButton). */
  suffix?: React.ReactNode;
  /** Classes for the outer wrapper. */
  containerClassName?: string;
}

/** Helper + error lines under a control. Exported for custom fields (Checkbox group, etc.). */
export function FieldMessages({
  helperId,
  errorId,
  helper,
  error,
}: {
  helperId: string;
  errorId: string;
  helper?: React.ReactNode;
  error?: React.ReactNode;
}) {
  return (
    <>
      <AnimatePresence initial={false}>
        {error && (
          <m.p
            key="error"
            id={errorId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: dur.fast, ease: ease.out }}
            className="mt-1.5 flex items-start gap-1.5 text-meta font-medium text-accent-700"
          >
            <BrandAlertCircleIcon size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </m.p>
        )}
      </AnimatePresence>
      {helper && !error && (
        <p id={helperId} className="mt-1.5 text-meta text-primary-500">
          {helper}
        </p>
      )}
    </>
  );
}

function describedBy(
  helperId: string,
  errorId: string,
  helper: unknown,
  error: unknown,
  extra?: string,
) {
  return (
    [error ? errorId : helper ? helperId : null, extra]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

const labelBase =
  "pointer-events-none absolute top-0 z-[1] origin-top-left rtl:origin-top-right text-body text-primary-500 " +
  "transition-transform duration-fast ease-standard truncate max-w-[calc(100%-2rem)]";
// Floated: scaled to ~12px and pinned to the top; resting: centred in the 56px control.
const labelFloat =
  "translate-y-[0.55rem] scale-[0.8] " +
  "peer-placeholder-shown:translate-y-[1.05rem] peer-placeholder-shown:scale-100 " +
  "peer-focus:translate-y-[0.55rem] peer-focus:scale-[0.8] peer-focus:text-accent-700";

const controlText = (hideLabel?: boolean) =>
  cn(
    "text-base sm:text-body text-primary-900",
    hideLabel
      ? "placeholder:text-primary-400"
      : "placeholder:text-transparent focus:placeholder:text-primary-400",
  );

function Adornment({
  side,
  children,
}: {
  side: "start" | "end";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "absolute inset-y-0 z-[2] flex items-center text-primary-500 text-meta font-semibold",
        side === "start" ? "start-0 ps-4" : "end-0 pe-3",
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Input */

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "size">,
    FieldBaseProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hideLabel,
    helper,
    error,
    prefix,
    suffix,
    containerClassName,
    className,
    id,
    placeholder,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn("w-full", containerClassName)}>
      <div className="relative">
        {prefix && <Adornment side="start">{prefix}</Adornment>}
        <input
          ref={ref}
          id={inputId}
          placeholder={placeholder ?? " "}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            helperId,
            errorId,
            helper,
            error,
            rest["aria-describedby"],
          )}
          className={cn(
            "field-control peer block w-full h-14 rounded-xl bg-white pb-1.5 text-start",
            hideLabel ? "pt-1.5" : "pt-5",
            controlText(hideLabel),
            prefix ? "ps-14" : "ps-4",
            suffix ? "pe-12" : "pe-4",
            className,
          )}
          {...rest}
        />
        <label
          htmlFor={inputId}
          className={cn(
            labelBase,
            labelFloat,
            prefix ? "start-14" : "start-4",
            hideLabel && "sr-only",
          )}
        >
          {label}
          {rest.required && (
            <span aria-hidden="true" className="text-accent-700">
              {" "}
              *
            </span>
          )}
        </label>
        {suffix && <Adornment side="end">{suffix}</Adornment>}
      </div>
      <FieldMessages
        helperId={helperId}
        errorId={errorId}
        helper={helper}
        error={error}
      />
    </div>
  );
});

/* ------------------------------------------------------------------ Textarea */

export interface TextareaProps
  extends
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<FieldBaseProps, "prefix" | "suffix"> {
  /** Show "n / maxLength" under the field. */
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      hideLabel,
      helper,
      error,
      containerClassName,
      className,
      id,
      placeholder,
      showCount,
      onChange,
      rows = 4,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const countId = `${inputId}-count`;
    const [count, setCount] = useState(
      () => String(rest.value ?? rest.defaultValue ?? "").length,
    );
    const length = rest.value !== undefined ? String(rest.value).length : count;
    return (
      <div className={cn("w-full", containerClassName)}>
        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            rows={rows}
            placeholder={placeholder ?? " "}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(
              helperId,
              errorId,
              helper,
              error,
              showCount ? countId : undefined,
            )}
            onChange={(e) => {
              setCount(e.target.value.length);
              onChange?.(e);
            }}
            className={cn(
              "field-control peer block w-full rounded-xl bg-white px-4 pb-3 resize-y min-h-[7rem] text-start",
              hideLabel ? "pt-3" : "pt-7",
              controlText(hideLabel),
              className,
            )}
            {...rest}
          />
          <label
            htmlFor={inputId}
            className={cn(
              labelBase,
              labelFloat,
              "start-4",
              hideLabel && "sr-only",
            )}
          >
            {label}
            {rest.required && (
              <span aria-hidden="true" className="text-accent-700">
                {" "}
                *
              </span>
            )}
          </label>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <FieldMessages
              helperId={helperId}
              errorId={errorId}
              helper={helper}
              error={error}
            />
          </div>
          {showCount && rest.maxLength && (
            <p
              id={countId}
              className="mt-1.5 shrink-0 text-meta text-primary-500 tabular-nums"
            >
              {length} / {rest.maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);

/* ------------------------------------------------------------------ Select */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "prefix" | "size">,
    Omit<FieldBaseProps, "suffix"> {
  options?: SelectOption[];
  /** Adds a first empty option with this text. */
  placeholderOption?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      hideLabel,
      helper,
      error,
      prefix,
      containerClassName,
      className,
      id,
      options,
      placeholderOption,
      children,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    return (
      <div className={cn("w-full", containerClassName)}>
        <div className="relative">
          {prefix && <Adornment side="start">{prefix}</Adornment>}
          <select
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(helperId, errorId, helper, error)}
            className={cn(
              "field-control peer block w-full h-14 appearance-none rounded-xl bg-white pb-1.5 pe-11 cursor-pointer text-start",
              hideLabel ? "pt-1.5" : "pt-5",
              "text-base sm:text-body text-primary-900",
              prefix ? "ps-14" : "ps-4",
              className,
            )}
            {...rest}
          >
            {placeholderOption !== undefined && (
              <option value="">{placeholderOption}</option>
            )}
            {options?.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
            {children}
          </select>
          {/* Selects always show a value, so the label stays floated. */}
          <label
            htmlFor={inputId}
            className={cn(
              labelBase,
              "translate-y-[0.55rem] scale-[0.8] peer-focus:text-accent-700",
              prefix ? "start-14" : "start-4",
              hideLabel && "sr-only",
            )}
          >
            {label}
          </label>
          <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-4 text-primary-500 transition-transform duration-fast peer-focus:text-accent-700">
            <BrandChevronDownIcon size={16} />
          </span>
        </div>
        <FieldMessages
          helperId={helperId}
          errorId={errorId}
          helper={helper}
          error={error}
        />
      </div>
    );
  },
);
