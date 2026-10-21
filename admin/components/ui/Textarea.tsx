"use client";

import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-primary">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full rounded-xl bg-white border text-sm text-primary placeholder:text-neutral-400 p-3 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary disabled:bg-neutral-50 disabled:text-neutral-400 ${
            error ? "border-accent focus:ring-accent/40 focus:border-accent" : "border-tertiary/70"
          } ${className}`}
          rows={3}
          {...props}
        />
        {error && <p className="text-xs text-accent font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
