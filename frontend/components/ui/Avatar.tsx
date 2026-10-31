"use client";

/**
 * Avatar + AvatarStack.
 *
 *   <Avatar name="Amina Benali" src={host.image} size="lg" verified />
 *   <Avatar name="Karim" />                         // initials on a palette tint
 *   <AvatarStack people={[{ name, src }, ...]} max={3} size="sm" />
 *
 * Falls back to initials when there is no src or the image fails. Pass `decorative` when
 * the person's name is already printed next to it. Verified = small olive check dot.
 */

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "./cn";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const px: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
const text: Record<AvatarSize, string> = {
  xs: "text-[0.625rem]",
  sm: "text-[0.6875rem]",
  md: "text-meta",
  lg: "text-body",
  xl: "text-heading",
};
const tints = [
  "bg-secondary-100 text-secondary-800",
  "bg-tertiary-200 text-tertiary-900",
  "bg-accent-100 text-accent-800",
  "bg-primary-100 text-primary-800",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return tints[h % tints.length];
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  verified?: boolean;
  /** Hide from assistive tech (the name is printed next to it). */
  decorative?: boolean;
  /** White ring (stacks, on photos). */
  ring?: boolean;
  className?: string;
}

export function Avatar({ name, src, size = "md", verified, decorative, ring, className }: AvatarProps) {
  const t = useTranslations("ui");
  const [failed, setFailed] = useState(false);
  const dim = px[size];
  const showImage = Boolean(src) && !failed;
  const big = dim >= 56;
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: dim, height: dim }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : verified ? t("avatarVerified", { name }) : name}
      aria-hidden={decorative || undefined}
    >
      <span
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden rounded-full font-semibold",
          ring ? "ring-2 ring-white" : "ring-1 ring-primary/10",
          !showImage && tintFor(name),
          text[size]
        )}
      >
        {showImage ? (
          <Image
            src={src as string}
            alt=""
            width={dim}
            height={dim}
            sizes={`${dim}px`}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{initials(name)}</span>
        )}
      </span>
      {verified && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-0.5 -end-0.5 flex items-center justify-center rounded-full bg-secondary-600 text-white ring-2 ring-white",
            big ? "h-5 w-5" : "h-3.5 w-3.5"
          )}
        >
          <svg viewBox="0 0 24 24" width={big ? 12 : 8} height={big ? 12 : 8} fill="none">
            <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </span>
  );
}

export interface AvatarStackProps {
  people: Array<{ name: string; src?: string | null }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarStack({ people, max = 4, size = "sm", className }: AvatarStackProps) {
  const t = useTranslations("ui");
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const dim = px[size];
  return (
    <span className={cn("inline-flex items-center", className)} role="group" aria-label={t("peopleCount", { count: people.length })}>
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} src={p.src} size={size} ring className={i > 0 ? "-ms-2" : undefined} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "-ms-2 inline-flex items-center justify-center rounded-full bg-primary-800 font-semibold text-white ring-2 ring-white tabular-nums",
            text[size]
          )}
          style={{ width: dim, height: dim }}
          role="img"
          aria-label={t("morePeople", { count: extra })}
        >
          <span aria-hidden="true">+{extra}</span>
        </span>
      )}
    </span>
  );
}

export default Avatar;
