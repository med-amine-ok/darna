"use client";

/**
 * Legacy full-width button (Modal footers, EmptyState, ListingCard, hotel page…).
 * Props are unchanged; it now renders the kit Button (components/ui/Button.tsx) so every
 * caller gets the new pill, glow, spring press and focus ring:
 *   primary → primary (terracotta glow) · outline → tertiary (white e1) · secondary → secondary (ink)
 *   danger → destructive · ghost → ghost · small → size "sm".
 * Prefer `import Button from "@/components/ui/Button"` in new code.
 */

import KitButton, { type ButtonVariant } from "@/components/ui/Button";

interface ButtonProps {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  small?: boolean;
  icon?: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
  type?: "button" | "submit" | "reset";
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const variantMap: Record<NonNullable<ButtonProps["variant"]>, ButtonVariant> = {
  primary: "primary",
  secondary: "secondary",
  danger: "destructive",
  ghost: "ghost",
};

export default function Button({
  label,
  onClick,
  disabled,
  outline,
  small,
  icon: Icon,
  type = "button",
  className = "",
  variant = "primary",
}: ButtonProps) {
  return (
    <KitButton
      type={type}
      disabled={disabled}
      onClick={onClick}
      variant={outline ? "tertiary" : variantMap[variant]}
      size={small ? "sm" : "lg"}
      fullWidth
      leadingIcon={Icon ? <Icon size={small ? 16 : 18} className="shrink-0" /> : undefined}
      className={className}
    >
      {label}
    </KitButton>
  );
}
