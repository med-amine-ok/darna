/**
 * Badge / Pill, small status labels.
 *
 *   <Badge tone="success" dot>Confirmed</Badge>
 *   <Badge tone="warning" icon={<BrandClockIcon size={12} />}>Pending</Badge>
 *   <Pill tone="white">Guest favourite</Pill>      // rounded-full, for labels on cards/photos
 *
 * Tones map onto the five DARNA hues: neutral (ink tint), olive/success, terracotta/danger,
 * ochre/warning, sand, ink (solid). Badges are static text, use Chip for interactive filters.
 * Server-component safe (no hooks).
 */

import React from "react";
import { cn } from "./cn";

export type BadgeTone =
  | "neutral"
  | "olive"
  | "success"
  | "terracotta"
  | "danger"
  | "ochre"
  | "warning"
  | "sand"
  | "ink";

const toneClasses: Record<BadgeTone, { bg: string; dot: string }> = {
  neutral: { bg: "bg-primary/[0.07] text-primary-700", dot: "bg-primary-500" },
  olive: { bg: "bg-secondary-100 text-secondary-800", dot: "bg-secondary-600" },
  success: {
    bg: "bg-secondary-100 text-secondary-800",
    dot: "bg-secondary-600",
  },
  terracotta: { bg: "bg-accent-100 text-accent-800", dot: "bg-accent-600" },
  danger: { bg: "bg-accent-100 text-accent-800", dot: "bg-accent-700" },
  ochre: { bg: "bg-amber-100 text-amber-800", dot: "bg-amber-600" },
  warning: { bg: "bg-amber-100 text-amber-800", dot: "bg-amber-600" },
  sand: { bg: "bg-tertiary-200 text-tertiary-900", dot: "bg-tertiary-600" },
  ink: { bg: "bg-primary-800 text-white", dot: "bg-tertiary-300" },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
  /** Leading status dot. */
  dot?: boolean;
  icon?: React.ReactNode;
}

export function Badge({
  tone = "neutral",
  size = "sm",
  dot,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  const t = toneClasses[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tabular-nums",
        size === "sm"
          ? "h-6 rounded-md px-2 text-[0.6875rem]"
          : "h-7 rounded-lg px-2.5 text-meta",
        t.bg,
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)}
        />
      )}
      {icon && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

/** Rounded-full badge. `tone="white"` / `"glass"` float on cards and photos. */
export function Pill({
  tone = "neutral",
  className,
  ...rest
}: Omit<BadgeProps, "tone" | "size"> & {
  tone?: BadgeTone | "white" | "glass";
}) {
  if (tone === "white" || tone === "glass") {
    return (
      <Badge
        size="md"
        className={cn(
          "rounded-full px-3 text-primary-900",
          tone === "white" ? "bg-white shadow-e1" : "glass-chip shadow-e2",
          className,
        )}
        {...rest}
      />
    );
  }
  return (
    <Badge
      tone={tone}
      size="md"
      className={cn("rounded-full px-3", className)}
      {...rest}
    />
  );
}

export default Badge;
