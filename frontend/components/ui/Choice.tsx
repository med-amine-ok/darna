"use client";

/**
 * Selection controls, Checkbox, Radio, RadioGroup, Switch.
 *
 *   <Checkbox label="Pets allowed" description="Up to 2" {...register("pets")} />
 *   <RadioGroup legend="Cancellation" name="cancel" value={v} onChange={setV}
 *     options={[{ value: "flexible", label: "Flexible", description: "Full refund 1 day before" }]} />
 *   <Switch label="Instant booking" checked={on} onCheckedChange={setOn} />
 *
 * Checkbox/Radio are real <input>s (form + react-hook-form friendly) laid over a custom box;
 * the check mark draws in with CSS (no JS needed). Switch is a role="switch" button whose
 * thumb slides with `spring.press` and mirrors in RTL through flex alignment.
 * Selected colour is ink (primary-800); terracotta stays reserved for CTAs.
 */

import React, {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { m } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "./cn";
import { FieldMessages } from "./Field";

const peerFocus =
  "peer-focus-visible:ring-2 peer-focus-visible:ring-accent-600 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-darnaBg";

interface ChoiceBaseProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
}

/* ------------------------------------------------------------------ Checkbox */

export interface CheckboxProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
    ChoiceBaseProps {
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      label,
      description,
      error,
      containerClassName,
      indeterminate,
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    useEffect(() => {
      if (innerRef.current)
        innerRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);
    const descId = `${inputId}-desc`;
    const errorId = `${inputId}-error`;

    return (
      <div className={cn("w-full", containerClassName)}>
        <label
          htmlFor={inputId}
          className={cn(
            "group flex items-start gap-3 py-1",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          )}
        >
          <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
            <input
              ref={innerRef}
              id={inputId}
              type="checkbox"
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={
                [description ? descId : null, error ? errorId : null]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              className={cn(
                "peer absolute -inset-3 z-[1] m-0 h-11 w-11 cursor-[inherit] opacity-0",
                className,
              )}
              {...rest}
            />
            <span
              aria-hidden="true"
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md bg-white text-white shadow-[0_0_0_1.5px_rgba(30,38,31,0.28)]",
                "transition-[background-color,box-shadow,transform] duration-fast ease-standard",
                "group-hover:shadow-[0_0_0_1.5px_rgba(30,38,31,0.5)] group-active:scale-90",
                "peer-checked:bg-primary-800 peer-checked:shadow-none",
                "peer-checked:[&_.check]:[stroke-dashoffset:0]",
                indeterminate && "bg-primary-800 shadow-none",
                error && "shadow-[0_0_0_1.5px_#0846AB]",
                peerFocus,
              )}
            >
              {indeterminate ? (
                <span className="h-0.5 w-2.5 rounded-full bg-white" />
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                  <path
                    className="check transition-[stroke-dashoffset] duration-base ease-out"
                    d="M5 12.5l4.2 4.2L19 7"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1}
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium text-primary-900">
              {label}
            </span>
            {description && (
              <span id={descId} className="block text-meta text-primary-500">
                {description}
              </span>
            )}
          </span>
        </label>
        <FieldMessages helperId={descId} errorId={errorId} error={error} />
      </div>
    );
  },
);

/* ------------------------------------------------------------------ Radio */

export interface RadioProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
    Omit<ChoiceBaseProps, "error"> {}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, description, containerClassName, id, className, disabled, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group flex items-start gap-3 py-1",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        containerClassName,
      )}
    >
      <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
        <input
          ref={ref}
          id={inputId}
          type="radio"
          disabled={disabled}
          aria-describedby={description ? descId : undefined}
          className={cn(
            "peer absolute -inset-3 z-[1] m-0 h-11 w-11 cursor-[inherit] opacity-0",
            className,
          )}
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_0_0_1.5px_rgba(30,38,31,0.28)]",
            "transition-[box-shadow,transform] duration-fast ease-standard group-hover:shadow-[0_0_0_1.5px_rgba(30,38,31,0.5)] group-active:scale-90",
            "peer-checked:shadow-[0_0_0_1.5px_#152C52] peer-checked:[&>span]:scale-100",
            peerFocus,
          )}
        >
          <span className="h-2.5 w-2.5 scale-0 rounded-full bg-primary-800 transition-transform duration-fast ease-out" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-primary-900">
          {label}
        </span>
        {description && (
          <span id={descId} className="block text-meta text-primary-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
});

export interface RadioGroupOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  legend: React.ReactNode;
  hideLegend?: boolean;
  name: string;
  options: RadioGroupOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: React.ReactNode;
  helper?: React.ReactNode;
  /** "card" renders each option as a white selectable tile. */
  appearance?: "plain" | "card";
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function RadioGroup({
  legend,
  hideLegend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  error,
  helper,
  appearance = "plain",
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  const id = useId();
  return (
    <fieldset
      className={cn("min-w-0", className)}
      aria-invalid={error ? true : undefined}
      aria-describedby={
        error ? `${id}-error` : helper ? `${id}-helper` : undefined
      }
    >
      <legend
        className={cn(
          "mb-2 text-sm font-semibold text-primary-900",
          hideLegend && "sr-only",
        )}
      >
        {legend}
      </legend>
      <div
        className={cn(
          "flex gap-2",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        )}
      >
        {options.map((o) => (
          <Radio
            key={o.value}
            name={name}
            value={o.value}
            label={o.label}
            description={o.description}
            disabled={o.disabled}
            checked={value !== undefined ? value === o.value : undefined}
            defaultChecked={
              value === undefined ? defaultValue === o.value : undefined
            }
            onChange={(e) => e.target.checked && onChange?.(o.value)}
            containerClassName={
              appearance === "card"
                ? "rounded-2xl bg-white p-4 shadow-e1 transition-shadow duration-fast hover:shadow-e2 has-[:checked]:shadow-[0_0_0_1.5px_#152C52]"
                : undefined
            }
          />
        ))}
      </div>
      <FieldMessages
        helperId={`${id}-helper`}
        errorId={`${id}-error`}
        helper={helper}
        error={error}
      />
    </fieldset>
  );
}

/* ------------------------------------------------------------------ Switch */

export interface SwitchProps {
  label?: React.ReactNode;
  /** Required when there is no visible label. */
  ariaLabel?: string;
  description?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  id?: string;
  name?: string;
  className?: string;
}

export function Switch({
  label,
  ariaLabel,
  description,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  size = "md",
  id,
  name,
  className,
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const [internal, setInternal] = useState(defaultChecked);
  const isOn = checked ?? internal;
  const toggle = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) setInternal(next);
    onCheckedChange?.(next);
  };
  const track = size === "sm" ? "h-6 w-10 p-0.5" : "h-7 w-12 p-0.5";
  const thumb = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  const control = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label ? undefined : ariaLabel}
      aria-describedby={description ? `${switchId}-desc` : undefined}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full cursor-pointer",
        "transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg",
        // Hit area ≥ 44px.
        "before:absolute before:-inset-2 before:content-['']",
        isOn
          ? "justify-end bg-primary-800"
          : "justify-start bg-primary/20 hover:bg-primary/30",
        track,
      )}
    >
      <m.span
        layout
        transition={spring.press}
        aria-hidden="true"
        className={cn("block rounded-full bg-white shadow-e2", thumb)}
      />
      {name && <input type="hidden" name={name} value={isOn ? "on" : "off"} />}
    </button>
  );

  if (!label) return <span className={className}>{control}</span>;

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <span className="min-w-0">
        <label
          htmlFor={switchId}
          className={cn(
            "block text-body font-medium text-primary-900",
            disabled ? "opacity-50" : "cursor-pointer",
          )}
        >
          {label}
        </label>
        {description && (
          <span
            id={`${switchId}-desc`}
            className="block text-meta text-primary-500"
          >
            {description}
          </span>
        )}
      </span>
      {control}
    </div>
  );
}
