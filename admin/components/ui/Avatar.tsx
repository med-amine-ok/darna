"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary" | "accent" | "outline";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
}) => {
  const variantStyles = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary-700 text-white",
    tertiary: "bg-tertiary text-primary-900",
    accent: "bg-accent-600 text-white",
    outline: "ring-1 ring-inset ring-primary/15 text-primary-900 bg-white",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold select-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 36,
  className = "",
}) => {
  const t = useTranslations("uiKit");
  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "D";

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-tertiary-100 ring-1 ring-primary/[0.06] shrink-0 flex items-center justify-center font-semibold text-xs text-primary-900 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name || t("avatar")}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
