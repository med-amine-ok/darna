"use client";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = "",
      id,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const describedBy =
      [ariaDescribedBy, error ? errorId : helperText ? helperId : undefined].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="block text-meta font-semibold text-primary-800">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div aria-hidden="true" className="absolute start-3 pointer-events-none text-neutral-500 shrink-0 flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={ariaInvalid ?? (error ? true : undefined)}
            aria-describedby={describedBy}
            className={`w-full rounded-xl bg-white border text-base sm:text-sm min-h-[44px] sm:min-h-[40px] text-primary-900 placeholder:text-neutral-500 transition-[border-color,box-shadow] duration-fast ease-standard shadow-2xs focus:outline-none focus:ring-4 disabled:bg-neutral-50 disabled:text-neutral-500 ${
              error
                ? "border-accent-600 focus:ring-accent/15 focus:border-accent-600"
                : "border-primary/[0.12] hover:border-primary/25 focus:border-primary-600 focus:ring-primary/[0.08]"
            } ${leftIcon ? "ps-9" : "ps-3.5"} ${rightIcon ? "pe-9" : "pe-3.5"} py-2 ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute end-3 text-neutral-500 shrink-0 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-meta text-accent-700 font-medium">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-meta text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
