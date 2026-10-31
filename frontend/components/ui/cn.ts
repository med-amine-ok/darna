/** Joins class names, skipping falsy values. Tiny local helper (no extra dependency). */
export function cn(...parts: Array<string | boolean | null | undefined | number | bigint>): string {
  return parts.filter((p) => typeof p === "string" && p).join(" ");
}

/** Shared focus ring used by every interactive kit element (ROLLOUT-GUIDE rule 4). */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg";

/** Same ring drawn inside the element (for edge-to-edge rows, list items). */
export const focusRingInset = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600";
