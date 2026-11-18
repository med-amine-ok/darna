import type { Listing } from "@/lib/types";

/**
 * Extra listing fields the API mappers put in `Listing.specs` (lib/api/listings.ts,
 * lib/api/trips.ts), read by the list detail panels. Client-safe. Every field is
 * optional: a missing value is shown as NOT_SET, never invented.
 */
export interface ListingPanelSpecs {
  cleaningFeeDzd?: number | null;
  weeklyDiscountBp?: number | null;
  monthlyDiscountBp?: number | null;
  minNights?: number | null;
  cancellationPolicy?: { code: string; name_en: string; name_fr: string; name_ar: string } | null;
  houseRules?: string[];
  // vehicle_detail
  make?: string;
  model?: string;
  year?: number;
  seats?: number;
  transmission?: string;
  fuel?: string;
  daily_km_limit?: number | null;
  security_deposit?: { amount_minor: number } | null;
  // experience_detail
  duration_minutes?: number;
  max_group?: number;
  languages?: string[];
  includes?: string[];
  meeting_point_text?: string;
  // trips
  durationDays?: number;
  groupMax?: number;
  nextDeparture?: string | null;
  inclusions?: string[];
}

export const NOT_SET = "-";

export const panelSpecs = (listing: Listing): ListingPanelSpecs => (listing.specs ?? {}) as ListingPanelSpecs;

/** Basis points (1250) to a percent number (12.5). */
export const bpToPercent = (bp: number) => bp / 100;

export function policyName(policy: ListingPanelSpecs["cancellationPolicy"], locale: string): string {
  if (!policy) return NOT_SET;
  if (locale === "ar") return policy.name_ar || policy.code;
  if (locale === "fr") return policy.name_fr || policy.code;
  return policy.name_en || policy.code;
}
