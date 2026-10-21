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
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-primary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3 pointer-events-none text-neutral-400 shrink-0 flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-xl bg-white border text-sm text-primary placeholder:text-neutral-400 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary disabled:bg-neutral-50 disabled:text-neutral-400 ${
              error ? "border-accent focus:ring-accent/40 focus:border-accent" : "border-tertiary/70"
            } ${leftIcon ? "ps-9" : "ps-3.5"} ${rightIcon ? "pe-9" : "pe-3.5"} py-2 ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute end-3 text-neutral-400 shrink-0 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-accent font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
