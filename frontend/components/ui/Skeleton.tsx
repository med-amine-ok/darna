/**
 * Skeleton, content-shaped loading placeholders using the `.skeleton` shimmer
 * (styles/globals.css; mirrored in RTL, still under reduced motion).
 *
 *   <Skeleton className="h-6 w-40" />                     // any box
 *   <Skeleton shape="text" lines={3} />                   // paragraph, last line shorter
 *   <Skeleton shape="circle" className="h-10 w-10" />
 *   <SkeletonListingCard />                               // matches ListingCarouselCard geometry
 *   <SkeletonRow />                                       // avatar + two lines (lists, messages)
 *
 * Match the final geometry exactly (aspect ratios, radii) so nothing shifts on load.
 * Server-component safe. Wrap groups in an element with aria-busy="true" + sr-only label.
 */

import React from "react";
import { cn } from "./cn";

export interface SkeletonProps {
  shape?: "rect" | "text" | "circle" | "pill";
  /** Number of text lines (shape="text"). */
  lines?: number;
  className?: string;
}

export function Skeleton({
  shape = "rect",
  lines = 3,
  className,
}: SkeletonProps) {
  if (shape === "text") {
    return (
      <span aria-hidden="true" className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={cn(
              "skeleton block h-3.5 rounded-md",
              i === lines - 1 && lines > 1 ? "w-3/5" : "w-full",
            )}
          />
        ))}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "skeleton block",
        shape === "circle" || shape === "pill" ? "rounded-full" : "rounded-xl",
        className,
      )}
    />
  );
}

/** Placeholder with the geometry of the home/search listing card (20:19 image, 3 text lines). */
export function SkeletonListingCard({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("w-full", className)}>
      <span className="skeleton block aspect-[20/19] w-full rounded-2xl" />
      <span className="mt-3 flex items-center justify-between gap-4">
        <span className="skeleton block h-4 w-3/5 rounded-md" />
        <span className="skeleton block h-4 w-10 rounded-md" />
      </span>
      <span className="skeleton mt-2 block h-3.5 w-2/5 rounded-md" />
      <span className="skeleton mt-2.5 block h-4 w-1/3 rounded-md" />
    </div>
  );
}

/** Avatar + two lines (lists, inbox rows, reviews). */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-3", className)}
    >
      <span className="skeleton block h-10 w-10 shrink-0 rounded-full" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="skeleton block h-3.5 w-2/5 rounded-md" />
        <span className="skeleton block h-3 w-4/5 rounded-md" />
      </span>
    </div>
  );
}

export default Skeleton;
