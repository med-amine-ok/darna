"use client";

import React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, checked, indeterminate, onChange, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    // Native "mixed" state so assistive tech announces partially-selected groups.
    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = Boolean(indeterminate && !checked);
    }, [indeterminate, checked]);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref]
    );

    return (
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-center gap-2 cursor-pointer select-none text-xs text-primary ${className}`}
      >
        <div className="relative flex items-center justify-center">
          <input
            id={checkboxId}
            ref={setRefs}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div
            aria-hidden="true"
            className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center shadow-2xs peer-focus-visible:ring-2 peer-focus-visible:ring-accent-600 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 ${
              checked || indeterminate
                ? "bg-primary border-primary text-white"
                : "border-tertiary/90 bg-white hover:border-secondary"
            }`}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
            {indeterminate && !checked && (
              <div className="w-2 h-0.5 bg-white rounded-full" />
            )}
          </div>
        </div>
        {label && <span className="font-medium">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export interface SwitchProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = "",
}) => {
  return (
    <label
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none text-xs ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
          checked ? "bg-secondary-700" : "bg-neutral-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4 rtl:-translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      {label && <span className="font-medium text-primary">{label}</span>}
    </label>
  );
};
