"use client";

import Image from "next/image";
import { useRouter } from "@/navigation";
import React from "react";

export type LogoVariant = "horizontal" | "vertical" | "icon" | "auto";

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  height?: number;
  width?: number;
}

export default function Logo({
  variant = "auto",
  className = "",
  imageClassName = "",
  priority = false,
  interactive = true,
  onClick,
  height,
  width,
}: LogoProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (interactive) {
      router.push("/");
    }
  };

  const cursorClass = interactive || onClick ? "cursor-pointer" : "";

  // Fixed LTR orientation so wordmark reads correctly across all locales
  if (variant === "horizontal") {
    return (
      <div
        dir="ltr"
        onClick={handleClick}
        className={`inline-flex items-center select-none ${cursorClass} ${className}`}
      >
        <Image
          alt="DARNA"
          src="/assets/logo-horizontal.png"
          width={width || 135}
          height={height || 36}
          priority={priority}
          className={`object-contain ${imageClassName}`}
        />
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div
        dir="ltr"
        onClick={handleClick}
        className={`inline-flex flex-col items-center select-none ${cursorClass} ${className}`}
      >
        <Image
          alt="DARNA"
          src="/assets/logo-vertical.png"
          width={width || 120}
          height={height || 90}
          priority={priority}
          className={`object-contain ${imageClassName}`}
        />
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <div
        dir="ltr"
        onClick={handleClick}
        className={`inline-flex items-center justify-center select-none ${cursorClass} ${className}`}
      >
        <Image
          alt="DARNA"
          src="/assets/logo.png"
          width={width || 36}
          height={height || 36}
          priority={priority}
          className={`object-contain ${imageClassName}`}
        />
      </div>
    );
  }

  // "auto": horizontal on desktop, compact horizontal on mobile
  return (
    <div
      dir="ltr"
      onClick={handleClick}
      className={`inline-flex items-center select-none ${cursorClass} ${className}`}
    >
      <div className="hidden md:block">
        <Image
          alt="DARNA"
          src="/assets/logo-horizontal.png"
          width={width || 135}
          height={height || 36}
          priority={priority}
          className={`object-contain ${imageClassName}`}
        />
      </div>
      <div className="block md:hidden">
        <Image
          alt="DARNA"
          src="/assets/logo-horizontal.png"
          width={width || 110}
          height={height || 30}
          priority={priority}
          className={`object-contain ${imageClassName}`}
        />
      </div>
    </div>
  );
}
