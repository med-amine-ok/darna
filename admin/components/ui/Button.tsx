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
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-primary text-white hover:bg-[#232C24] active:bg-[#1A221B] shadow-xs focus-visible:ring-primary",
      secondary:
        "bg-secondary-700 text-white hover:bg-secondary-800 active:bg-secondary-900 shadow-xs focus-visible:ring-secondary-700",
      outline:
        "border border-tertiary/80 text-primary bg-white hover:bg-darnaBg/80 active:bg-darnaBg shadow-2xs focus-visible:ring-primary",
      ghost:
        "text-primary hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-primary",
      danger:
        "bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800 shadow-xs focus-visible:ring-accent-600",
      dangerOutline:
        "border border-accent text-accent-700 bg-transparent hover:bg-accent/10 active:bg-accent/20 shadow-2xs focus-visible:ring-accent-600",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 min-h-[44px] sm:min-h-[34px] gap-1.5",
      md: "text-sm px-4 py-2 min-h-[44px] sm:min-h-[40px] gap-2",
      lg: "text-base px-5 py-2.5 min-h-[44px] sm:min-h-[46px] gap-2.5",
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
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
