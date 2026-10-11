"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

interface LogoProps {
  variant?: "horizontal" | "icon" | "vertical";
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
  interactive?: boolean;
}

export default function Logo({
  variant = "horizontal",
  className = "",
  onClick,
  clickable = true,
  interactive,
}: LogoProps) {
  const isClickable = interactive !== undefined ? interactive : clickable;
  const params = useParams();
  const locale = params?.locale || "en";

  let src = "/assets/logo-horizontal.png";
  let width = 140;
  let height = 44;

  if (variant === "icon") {
    src = "/assets/logo.png";
    width = 38;
    height = 38;
  } else if (variant === "vertical") {
    src = "/assets/logo-vertical.png";
    width = 160;
    height = 90;
  }

  const content = (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center select-none ${
        isClickable ? "cursor-pointer transition hover:opacity-95" : ""
      } ${className}`}
    >
      <Image
        src={src}
        alt="DARNA"
        width={width}
        height={height}
        priority
        className="object-contain h-auto max-h-[44px]"
      />
    </div>
  );

  if (!isClickable) return content;

  return <Link href={`/${locale}`}>{content}</Link>;
}
