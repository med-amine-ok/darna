import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "accent" | "tertiary" | "outline" | "danger" | "success" | "warning";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  const variants = {
    primary: "bg-primary-800 text-white",
    secondary: "bg-secondary-700 text-white",
    accent: "bg-accent-600 text-white",
    tertiary: "bg-tertiary-100 text-tertiary-900 ring-1 ring-inset ring-tertiary-300/70",
    outline: "ring-1 ring-inset ring-primary/15 text-primary-800 bg-white",
    danger: "bg-accent-100 text-accent-800 ring-1 ring-inset ring-accent-200",
    success: "bg-secondary-100 text-secondary-900 ring-1 ring-inset ring-secondary-200",
    warning: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-0.5 text-meta",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap tabular-nums transition-colors duration-fast ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
