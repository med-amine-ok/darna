/**
 * Platform booking configuration (client-safe constants).
 * TODO: replace with Supabase — move to a platform_settings table editable in admin.
 */
import type { HostTypeCommissionRates, Listing, ListingVertical } from "@/types";

/**
 * Default DARNA commission (% of the accommodation subtotal) by host type.
 * Admins can change the live rates (server-side store in lib/data/wallet.ts).
 */
export const DEFAULT_COMMISSION_RATES: HostTypeCommissionRates = {
  individual: 12.0,
  agency: 15.0,
  hotel: 18.0,
  hostel: 10.0,
};

/** DARNA guest service fee, as a fraction of the accommodation subtotal. */
export const SERVICE_FEE_RATES: Record<ListingVertical, number> = {
  home: 0.1,
  hotel: 0.1,
  vehicle: 0.08,
  experience: 0.08,
  trip: 0, // 0% guest fee promotion on agency trips
};

/**
 * Default cleaning fee per vertical when the listing doesn't set one.
 * Hosts set their own `cleaningFee` (0 is a valid value).
 */
export const DEFAULT_CLEANING_FEES: Record<ListingVertical, number> = {
  home: 0,
  hotel: 0,
  vehicle: 0,
  experience: 0,
  trip: 0,
};

/**
 * Tourist / sales tax rate applied to subtotal + cleaning fee. 0 = no tax line
 * is shown. A listing can override it with `taxRate`.
 */
export const PLATFORM_TAX_RATE = 0;

/** How long a host has to answer a request-to-book. */
export const REQUEST_TO_BOOK_TTL_HOURS = 24;

/** Listing / room / trip price bounds (DZD, integer). */
export const PRICE_MIN_DZD = 100;
export const PRICE_MAX_DZD = 10_000_000;

export function isValidPriceDzd(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= PRICE_MIN_DZD &&
    value <= PRICE_MAX_DZD
  );
}

/** Stay-rule defaults used when a listing doesn't set its own. */
export const STAY_RULE_DEFAULTS = {
  minNights: 1,
  maxNights: 90,
  advanceNoticeDays: 0,
  checkInTime: "15:00",
  checkOutTime: "11:00",
} as const;

export interface StayRules {
  minNights: number;
  maxNights: number;
  advanceNoticeDays: number;
  checkInTime: string;
  checkOutTime: string;
}

export function getStayRules(
  listing: Pick<Listing, "minNights" | "maxNights" | "advanceNoticeDays" | "checkInTime" | "checkOutTime">
): StayRules {
  const minNights = Math.max(1, Math.floor(listing.minNights ?? STAY_RULE_DEFAULTS.minNights));
  const maxNights = Math.max(minNights, Math.floor(listing.maxNights ?? STAY_RULE_DEFAULTS.maxNights));
  return {
    minNights,
    maxNights,
    advanceNoticeDays: Math.max(0, Math.floor(listing.advanceNoticeDays ?? STAY_RULE_DEFAULTS.advanceNoticeDays)),
    checkInTime: listing.checkInTime ?? STAY_RULE_DEFAULTS.checkInTime,
    checkOutTime: listing.checkOutTime ?? STAY_RULE_DEFAULTS.checkOutTime,
  };
}
