/**
 * Card + Divider, the basic surfaces.
 *
 *   <Card>…</Card>                                  // white, e1, rounded-2xl, p-6
 *   <Card variant="elevated" padding="lg">…</Card>  // e3 (sticky booking card, summaries)
 *   <Card variant="glass">…</Card>                  // floating over imagery / textures
 *   <Card variant="outlined">…</Card>               // hairline only, on white areas
 *   <Card interactive as="article">…</Card>         // hover lift −2px, e1 → e2 (wrap in a link)
 *
 *   <Divider />                                     // hairline
 *   <Divider label="or" />                          // centred label
 *   <Divider ornament />                            // small zellige rosette in the middle (editorial breaks)
 *
 * Server-component safe. Surfaces: white cards on darnaBg paper; prefer shadow over borders.
 */

import React from "react";
import { cn } from "./cn";

export type CardVariant =
  | "surface"
  | "elevated"
  | "glass"
  | "outlined"
  | "sunken";

const variants: Record<CardVariant, string> = {
  surface: "bg-white shadow-e1",
  elevated: "bg-white shadow-e3",
  glass: "glass-light shadow-e2",
  outlined: "bg-white ring-1 ring-primary/10",
  sunken: "bg-darnaBg-300/70",
};

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

type CardTag = "div" | "article" | "section" | "li" | "aside";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: CardTag;
  variant?: CardVariant;
  padding?: keyof typeof paddings;
  /** Hover lift (−2px) and e1→e2. Use when the whole card is clickable. */
  interactive?: boolean;
  /** Large surfaces (sheets, hero panels) use rounded-3xl. */
  radius?: "2xl" | "3xl";
}

export function Card({
  as: Tag = "div",
  variant = "surface",
  padding = "md",
  interactive,
  radius = "2xl",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        "relative",
        radius === "3xl" ? "rounded-3xl" : "rounded-2xl",
        variants[variant],
        paddings[padding],
        interactive &&
          "transition-[transform,box-shadow] duration-base ease-out hover:-translate-y-0.5 hover:shadow-e2 focus-within:shadow-e2 motion-reduce:hover:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  label?: React.ReactNode;
  ornament?: boolean;
  className?: string;
}

export function Divider({
  orientation = "horizontal",
  label,
  ornament,
  className,
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn(
          "inline-block w-px self-stretch bg-primary/[0.1]",
          className,
        )}
      />
    );
  }
  if (!label && !ornament) {
    return <hr className={cn("border-0 h-px bg-primary/[0.08]", className)} />;
  }
  return (
    <div role="separator" className={cn("flex items-center gap-4", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/[0.12] rtl:bg-gradient-to-l" />
      {label ? (
        <span className="text-meta font-medium text-primary-500">{label}</span>
      ) : (
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          className="text-secondary-600"
        >
          <path
            d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="1.6" fill="#0B57D0" />
        </svg>
      )}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/[0.12] rtl:bg-gradient-to-r" />
    </div>
  );
}

export default Card;
