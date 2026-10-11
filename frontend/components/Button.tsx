"use client";

import { IconType } from "react-icons";

interface ButtonProps {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  small?: boolean;
  icon?: IconType | React.ComponentType<{ size?: number; className?: string }>;
  type?: "button" | "submit" | "reset";
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

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
  let styleClasses = "";

  if (outline) {
    styleClasses =
      "bg-white border-2 border-primary text-primary hover:bg-neutral-50";
  } else if (variant === "secondary") {
    styleClasses =
      "bg-secondary text-white hover:bg-secondary/90 border-transparent shadow-sm";
  } else if (variant === "danger") {
    styleClasses =
      "bg-status-red text-white hover:bg-status-red/90 border-transparent shadow-sm";
  } else if (variant === "ghost") {
    styleClasses =
      "bg-transparent text-primary hover:bg-neutral-100 border-transparent";
  } else {
    // primary default = accent terracotta
    styleClasses =
      "bg-accent text-white hover:bg-accent/90 border-transparent shadow-sm";
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        relative
        disabled:opacity-50
        disabled:cursor-not-allowed
        rounded-xl
        hover:opacity-95
        transition
        w-full
        font-medium
        flex
        items-center
        justify-center
        gap-2
        active:scale-[0.98]
        active:-translate-y-[1px]
        min-h-[44px]
        cursor-pointer
        ${styleClasses}
        ${small ? "py-1.5 text-sm font-normal border" : "py-3 text-base font-semibold"}
        ${className}
      `}
    >
      {Icon && <Icon size={small ? 18 : 22} className="shrink-0" />}
      <span>{label}</span>
    </button>
  );
}
