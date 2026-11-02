/**
 * Pricing & money constants for the admin back-office, defined ONCE here and
 * imported by the seed generator, the mock store, the data layer, server-side
 * validation and client inputs. Client-safe (no server-only imports).
 *
 * All money in the admin is integer DZD (Algerian dinar has no circulating
 * sub-unit). See docs/DATA-MODEL.md for the mapping with ../frontend.
 */
import type { HostType } from "@/lib/types";

/**
 * Guest service fee, as a percentage of the booking base price. BLADUS does not charge
 * travellers (0%): it earns only the host commission below. Kept so stored bookings
 * keep their `serviceFeeDzd` field (always 0).
 */
export const GUEST_SERVICE_FEE_PERCENT = 0;

/** Default platform commission (percent of base price) per host type. */
export const DEFAULT_COMMISSION_RATES: Readonly<Record<HostType, number>> =
  Object.freeze({
    individual: 12,
    agency: 15,
    hotel: 18,
    hostel: 10,
  });

/** Largest single manual wallet recharge an admin may record. */
export const MAX_RECHARGE_DZD = 10_000_000;
/** Generic upper bound for any single admin-entered money amount. */
export const MAX_MONEY_DZD = 10_000_000;

export const COMMISSION_RATE_MIN = 0;
export const COMMISSION_RATE_MAX = 100;
export const COMMISSION_RATE_DECIMALS = 2;

/** Long-stay / group discounts shown on listing detail panels (percent). */
export const DISCOUNTS = Object.freeze({
  weekly: 10,
  biweekly: 15,
  monthly: 25,
  group: 10,
});

/** Price after a percentage discount, rounded to integer DZD. */
export function applyDiscount(
  priceDzd: number,
  discountPercent: number,
  units = 1,
): number {
  return Math.round(priceDzd * units * (1 - discountPercent / 100));
}

/** Integer DZD amount within [min, max]. */
export function isValidDzdAmount(
  value: unknown,
  min = 1,
  max = MAX_MONEY_DZD,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

/** Commission rate: finite, 0..100, at most 2 decimals. */
export function isValidCommissionRate(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < COMMISSION_RATE_MIN || value > COMMISSION_RATE_MAX) return false;
  const scaled = value * 10 ** COMMISSION_RATE_DECIMALS;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** Booking price breakdown from a base price (all integer DZD). */
export function computeBookingAmounts(
  basePriceDzd: number,
  commissionRate: number,
) {
  const serviceFeeDzd = Math.round(
    (basePriceDzd * GUEST_SERVICE_FEE_PERCENT) / 100,
  );
  const commissionAmountDzd = Math.round((basePriceDzd * commissionRate) / 100);
  return {
    basePriceDzd,
    serviceFeeDzd,
    totalAmountDzd: basePriceDzd + serviceFeeDzd,
    commissionAmountDzd,
    hostPayoutDzd: basePriceDzd - commissionAmountDzd,
  };
}
