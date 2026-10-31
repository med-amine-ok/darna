"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerOutline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-[background-color,box-shadow,color,transform] duration-fast ease-standard active:scale-[0.98] active:duration-micro focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    // DARNA kit (docs/design/ROLLOUT-GUIDE.md §2): ink solid primary, olive positive,
    // white e1 tertiary, terracotta only for destructive/alert.
    const variantStyles = {
      primary:
        "bg-primary-800 text-white hover:bg-primary-900 shadow-e1 shadow-highlight focus-visible:ring-primary-700",
      secondary:
        "bg-secondary-700 text-white hover:bg-secondary-800 shadow-e1 focus-visible:ring-secondary-700",
      outline:
        "bg-white text-primary-800 shadow-e1 hover:shadow-e2 hover:bg-darnaBg-50 focus-visible:ring-primary-700",
      ghost:
        "text-primary-800 hover:bg-primary/[0.06] active:bg-primary/10 focus-visible:ring-primary-700",
      danger:
        "bg-accent-600 text-white hover:bg-accent-700 shadow-e1 focus-visible:ring-accent-600",
      dangerOutline:
        "bg-white text-accent-700 ring-1 ring-inset ring-accent/40 hover:bg-accent-50 focus-visible:ring-accent-600",
    };

    const sizeStyles = {
      sm: "text-meta px-3 py-1.5 min-h-[44px] sm:min-h-[34px] gap-1.5",
      md: "text-meta px-4 py-2 min-h-[44px] sm:min-h-[40px] gap-2",
      lg: "text-body px-5 py-2.5 min-h-[44px] sm:min-h-[46px] gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span className="inline-flex items-center gap-[inherit] min-w-0">{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
