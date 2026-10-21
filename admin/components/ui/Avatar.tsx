"use client";

import React from "react";
import Image from "next/image";

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
    secondary: "bg-secondary text-white",
    tertiary: "bg-tertiary text-primary",
    accent: "bg-accent text-white",
    outline: "border border-tertiary/70 text-primary bg-white",
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
      className={`relative rounded-xl overflow-hidden bg-tertiary/30 border border-tertiary/50 shrink-0 flex items-center justify-center font-bold text-xs text-primary shadow-2xs ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name || "Avatar"}
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
