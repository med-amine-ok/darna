/**
 * On-brand image placeholders (public/placeholders/*.svg: sand tile, faint rosette, arch line art).
 * The mock data uses generic icons ("/assets/house.png", "/assets/car.png") as listing photos and
 * some screens referenced "/placeholder-*.jpg" files that never existed (400 from /_next/image).
 * UI only: data is untouched, the image is swapped at render time.
 */
export type PlaceholderKind = "stay" | "experience" | "trip" | "car" | "booking";

const GENERIC_ICONS = new Set(["/assets/house.png", "/assets/car.png", "/assets/icon.png"]);

export function placeholderFor(kind: PlaceholderKind): string {
  return `/placeholders/${kind}.svg`;
}

/** True when `src` is missing, a generic icon or a legacy placeholder path. */
export function isPlaceholderSrc(src?: string | null): boolean {
  if (!src) return true;
  return GENERIC_ICONS.has(src) || src.startsWith("/placeholder-") || src.startsWith("/placeholders/");
}

/** Real photo when there is one, otherwise the branded placeholder for that kind. */
export function listingImageSrc(src: string | null | undefined, kind: PlaceholderKind): string {
  if (!src || isPlaceholderSrc(src)) {
    if (src === "/assets/car.png") return placeholderFor("car");
    return placeholderFor(kind);
  }
  return src;
}

/** Same for an image list (carousels, galleries). */
export function listingImages(list: (string | null | undefined)[] | null | undefined, kind: PlaceholderKind): string[] {
  const real = (list ?? []).filter((s): s is string => Boolean(s) && !isPlaceholderSrc(s));
  if (real.length) return real;
  const first = list?.[0];
  return [listingImageSrc(first, kind)];
}
