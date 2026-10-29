/**
 * Cancellation policies — the single source of truth for refund rules (pure,
 * client-safe). The cancel dialog previews with these functions and the
 * server applies them again when the cancellation is recorded.
 *
 * Guest cancellations (only before check-in time on the arrival day):
 *  - flexible  100% of the accommodation subtotal up to 1 day before check-in,
 *              50% on the arrival day.
 *  - moderate  100% up to 5 days before, 50% from 4 to 1 day(s) before,
 *              0% on the arrival day.
 *  - strict    100% up to 14 days before, 50% from 13 to 7 days before,
 *              0% within 6 days.
 * "Days before" = calendar days in Algeria between today and the check-in date.
 * The cleaning fee and the matching share of taxes are always refunded (the
 * stay hasn't started); DARNA's service fee is refunded only on a 100% refund.
 *
 * Host cancellations and declines always refund the guest in full. Pending
 * requests were never charged, so cancelling one voids the payment.
 */
import type { CancellationPolicy, PaymentStatus, Reservation } from "@/types";
import { STAY_RULE_DEFAULTS } from "./config";
import { dateKeyInBusinessZone, nightsBetween, BUSINESS_TIME_ZONE, type DateKey } from "./dates";
import { roundDzd } from "./pricing";
import type { ActionErrorCode } from "@/lib/action-result";

export interface CancellationTier {
  /** Applies when cancelling at least this many days before check-in. */
  minDaysBefore: number;
  refundPercent: number;
}

export interface CancellationPolicyDefinition {
  id: CancellationPolicy;
  // Label and summary are translated: listing.policies.<id>.label / .summary
  // (trips: trips.policy.<id>.*).
  /** Sorted from the most generous tier to the least. */
  tiers: CancellationTier[];
}

export const CANCELLATION_POLICIES: Record<CancellationPolicy, CancellationPolicyDefinition> = {
  flexible: {
    id: "flexible",
    tiers: [
      { minDaysBefore: 1, refundPercent: 100 },
      { minDaysBefore: 0, refundPercent: 50 },
    ],
  },
  moderate: {
    id: "moderate",
    tiers: [
      { minDaysBefore: 5, refundPercent: 100 },
      { minDaysBefore: 1, refundPercent: 50 },
      { minDaysBefore: 0, refundPercent: 0 },
    ],
  },
  strict: {
    id: "strict",
    tiers: [
      { minDaysBefore: 14, refundPercent: 100 },
      { minDaysBefore: 7, refundPercent: 50 },
      { minDaysBefore: 0, refundPercent: 0 },
    ],
  },
};

export function getCancellationPolicy(policy?: CancellationPolicy | null): CancellationPolicyDefinition {
  return CANCELLATION_POLICIES[policy ?? "flexible"] ?? CANCELLATION_POLICIES.flexible;
}

/** Current "HH:mm" in Algeria. */
function timeInBusinessZone(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

/** True once the check-in time on the arrival day has passed (Algeria time). */
export function hasCheckInPassed(startDate: DateKey, checkInTime: string | undefined, now: Date = new Date()): boolean {
  const today = dateKeyInBusinessZone(now);
  if (today !== startDate) return today > startDate;
  return timeInBusinessZone(now) >= (checkInTime || STAY_RULE_DEFAULTS.checkInTime);
}

export interface RefundBreakdown {
  allowed: boolean;
  /** Why cancelling is not allowed (translated client-side: errors.codes.*). */
  reason?: ActionErrorCode;
  daysBeforeCheckIn: number;
  refundPercent: number;
  refundAmount: number;
  nonRefundableAmount: number;
  paymentStatus: PaymentStatus;
}

type RefundableReservation = Pick<
  Reservation,
  "status" | "startDate" | "totalPrice" | "subtotal" | "cleaningFee" | "serviceFee" | "taxes" | "paymentStatus"
>;

function moneyParts(res: RefundableReservation) {
  const cleaningFee = res.cleaningFee ?? 0;
  const serviceFee = res.serviceFee ?? 0;
  const taxes = res.taxes ?? 0;
  const subtotal = res.subtotal ?? Math.max(0, res.totalPrice - cleaningFee - serviceFee - taxes);
  return { subtotal, cleaningFee, serviceFee, taxes };
}

function statusFor(total: number, refund: number): PaymentStatus {
  if (refund >= total) return "refunded";
  if (refund > 0) return "partially_refunded";
  return "paid";
}

/** Refund a guest gets for cancelling now. */
export function computeGuestRefund(params: {
  reservation: RefundableReservation;
  policy?: CancellationPolicy | null;
  checkInTime?: string;
  now?: Date;
}): RefundBreakdown {
  const { reservation: res } = params;
  const now = params.now ?? new Date();
  const daysBeforeCheckIn = nightsBetween(dateKeyInBusinessZone(now), res.startDate);

  if (res.status === "pending") {
    // Never charged: nothing to refund, the authorization is voided.
    return { allowed: true, daysBeforeCheckIn, refundPercent: 100, refundAmount: 0, nonRefundableAmount: 0, paymentStatus: "voided" };
  }
  if (res.status !== "confirmed") {
    return {
      allowed: false,
      reason: "RESERVATION_NOT_CANCELLABLE",
      daysBeforeCheckIn,
      refundPercent: 0,
      refundAmount: 0,
      nonRefundableAmount: 0,
      paymentStatus: res.paymentStatus ?? "paid",
    };
  }
  if (hasCheckInPassed(res.startDate, params.checkInTime, now)) {
    return {
      allowed: false,
      reason: "CHECK_IN_PASSED",
      daysBeforeCheckIn,
      refundPercent: 0,
      refundAmount: 0,
      nonRefundableAmount: res.totalPrice,
      paymentStatus: res.paymentStatus ?? "paid",
    };
  }

  const policy = getCancellationPolicy(params.policy);
  const tier = policy.tiers.find((t) => daysBeforeCheckIn >= t.minDaysBefore) ?? { minDaysBefore: 0, refundPercent: 0 };
  const pct = tier.refundPercent;
  const { subtotal, cleaningFee, serviceFee, taxes } = moneyParts(res);
  const refundAmount = Math.min(
    res.totalPrice,
    roundDzd((subtotal * pct) / 100) + cleaningFee + roundDzd((taxes * pct) / 100) + (pct === 100 ? serviceFee : 0)
  );
  return {
    allowed: true,
    daysBeforeCheckIn,
    refundPercent: pct,
    refundAmount,
    nonRefundableAmount: res.totalPrice - refundAmount,
    paymentStatus: statusFor(res.totalPrice, refundAmount),
  };
}

/** Host cancellations / declines: the guest is refunded in full. */
export function computeHostRefund(reservation: RefundableReservation): RefundBreakdown {
  const daysBeforeCheckIn = 0;
  if (reservation.status === "pending") {
    return { allowed: true, daysBeforeCheckIn, refundPercent: 100, refundAmount: 0, nonRefundableAmount: 0, paymentStatus: "voided" };
  }
  return {
    allowed: true,
    daysBeforeCheckIn,
    refundPercent: 100,
    refundAmount: reservation.totalPrice,
    nonRefundableAmount: 0,
    paymentStatus: "refunded",
  };
}
