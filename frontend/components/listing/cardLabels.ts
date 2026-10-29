import type { Listing } from "@/types";

/** Key in the `listing` namespace for the price suffix shown after a listing's price. */
export type PriceSuffixKey =
  | "priceSuffix.night"
  | "priceSuffix.day"
  | "priceSuffix.person"
  | "priceSuffix.fromNight"
  | "priceSuffix.fromBed";

export function priceSuffixKey(listing: Listing): PriceSuffixKey {
  if (listing.roomTypes && listing.roomTypes.length > 0) {
    const perBed = listing.businessCategory === "hostel" || listing.roomTypes.some((r) => r.bookingUnit === "bed");
    return perBed ? "priceSuffix.fromBed" : "priceSuffix.fromNight";
  }
  if (listing.category === "vehicle") return "priceSuffix.day";
  if (listing.category === "experience") return "priceSuffix.person";
  return "priceSuffix.night";
}

/** Default listing href: from search results go to the detail page, elsewhere open the split map view. */
export function listingHref(
  listing: Listing,
  opts: { onSearchPage: boolean; query?: string }
): string {
  const q = opts.query ? opts.query : "";
  if (opts.onSearchPage) return `/listings/${listing.id}${q ? `?${q}` : ""}`;
  const params = new URLSearchParams(q);
  params.set("selectedId", listing.id);
  if (listing.city) params.set("destination", listing.city);
  if (listing.category) params.set("vertical", listing.category);
  return `/search?${params.toString()}`;
}
