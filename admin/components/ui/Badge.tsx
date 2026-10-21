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
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    accent: "bg-accent text-white",
    tertiary: "bg-tertiary text-primary",
    outline: "border border-tertiary text-primary bg-transparent",
    danger: "bg-accent/15 text-accent border border-accent/25",
    success: "bg-secondary/15 text-secondary border border-secondary/25",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
