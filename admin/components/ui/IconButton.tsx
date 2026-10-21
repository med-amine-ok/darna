"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      icon,
      variant = "ghost",
      size = "md",
      isLoading = false,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variantStyles = {
      primary: "bg-primary text-white hover:bg-[#232C24] shadow-xs focus-visible:ring-primary",
      secondary: "bg-secondary text-white hover:bg-[#5C6E4E] shadow-xs focus-visible:ring-secondary",
      outline: "border border-tertiary/80 text-primary bg-white hover:bg-darnaBg/80 shadow-2xs focus-visible:ring-primary",
      ghost: "text-neutral-600 hover:text-primary hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-primary",
      danger: "text-accent hover:bg-accent/10 focus-visible:ring-accent",
    };

    const sizeStyles = {
      sm: "w-8 h-8 p-1.5",
      md: "w-9 h-9 p-2",
      lg: "w-11 h-11 p-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : (children || icon)}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
