"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

interface LogoProps {
  variant?: "horizontal" | "icon" | "vertical";
  className?: string;
  clickable?: boolean;
  interactive?: boolean;
  /** Preload the image (only for the logo visible above the fold). */
  priority?: boolean;
  /** Visually hidden copies (scroll transitions) must be removed from the tab order. */
  hidden?: boolean;
}

const VARIANTS = {
  horizontal: { src: "/assets/logo-horizontal.png", width: 146, height: 44 },
  icon: { src: "/assets/logo.png", width: 38, height: 38 },
  vertical: { src: "/assets/logo-vertical.png", width: 160, height: 90 },
} as const;

export default function Logo({
  variant = "horizontal",
  className = "",
  clickable = true,
  interactive,
  priority = false,
  hidden = false,
}: LogoProps) {
  const t = useTranslations("nav");
  const isClickable = interactive !== undefined ? interactive : clickable;
  const { src, width, height } = VARIANTS[variant];

  const image = (
    <Image
      src={src}
      alt={isClickable ? "" : t("logoAlt")}
      width={width}
      height={height}
      priority={priority}
      className="object-contain h-auto max-h-[44px]"
    />
  );

  if (!isClickable) {
    return <div className={`relative inline-flex items-center select-none ${className}`}>{image}</div>;
  }

  return (
    <Link
      href="/"
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      aria-label={t("homeLink")}
      className={`relative inline-flex items-center select-none cursor-pointer transition hover:opacity-95 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${className}`}
    >
      {image}
    </Link>
  );
}
