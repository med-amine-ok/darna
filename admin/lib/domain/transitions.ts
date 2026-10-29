/**
 * Explicit state machines for bookings, hosts and listings. Client-safe: the
 * data layer (lib/data/*) enforces them on the server, and the UI uses the
 * same helpers to decide which actions to show.
 */
import type { Booking, BookingStatus, HostStatus, ListingStatus } from "@/lib/types";

// ---------------------------------------------------------------- bookings

export const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "disputed", "refunded"],
  completed: ["disputed", "refunded"],
  disputed: ["confirmed", "completed", "refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

/** A booking can be cancelled by an admin only before it is completed. */
export function canCancelBooking(b: Pick<Booking, "status">): boolean {
  return canTransitionBooking(b.status, "cancelled");
}

/** Booking statuses that may carry a (partial) refund. */
const REFUNDABLE_STATUSES: readonly BookingStatus[] = ["confirmed", "completed", "cancelled", "disputed"];

export function refundedSoFar(b: Pick<Booking, "refundedAmountDzd">): number {
  return b.refundedAmountDzd ?? 0;
}

/** Remaining refundable amount (integer DZD), 0 when nothing can be refunded. */
export function refundableAmount(
  b: Pick<Booking, "status" | "paymentStatus" | "totalAmountDzd" | "refundedAmountDzd">
): number {
  if (!REFUNDABLE_STATUSES.includes(b.status)) return 0;
  if (b.paymentStatus !== "paid" && b.paymentStatus !== "partially_refunded") return 0;
  return Math.max(0, b.totalAmountDzd - refundedSoFar(b));
}

export function canRefundBooking(
  b: Pick<Booking, "status" | "paymentStatus" | "totalAmountDzd" | "refundedAmountDzd">
): boolean {
  return refundableAmount(b) > 0;
}

// ------------------------------------------------------------------- hosts

export type HostAction = "approve" | "reject" | "suspend" | "unsuspend" | "ban" | "delete" | "restore";

const HOST_ACTION_FROM: Readonly<Record<Exclude<HostAction, "delete" | "restore">, readonly HostStatus[]>> = {
  approve: ["applied", "under_review", "rejected"],
  reject: ["applied", "under_review"],
  suspend: ["approved"],
  unsuspend: ["suspended"],
  ban: ["approved", "suspended", "rejected", "under_review", "applied"],
};

export function canHostAction(status: HostStatus, action: HostAction): boolean {
  if (action === "delete") return status !== "deleted";
  if (action === "restore") return status === "deleted";
  return HOST_ACTION_FROM[action].includes(status);
}

// ---------------------------------------------------------------- listings

/** Canonical listing status (legacy aliases folded in). */
export type CanonicalListingStatus = Exclude<ListingStatus, "pending" | "published" | "refused">;

export function normalizeListingStatus(status: ListingStatus): CanonicalListingStatus {
  if (status === "pending") return "pending_review";
  if (status === "published") return "approved";
  if (status === "refused") return "rejected";
  return status;
}

export const LISTING_TRANSITIONS: Readonly<Record<CanonicalListingStatus, readonly CanonicalListingStatus[]>> = {
  draft: ["pending_review", "deleted"],
  pending_review: ["approved", "changes_requested", "rejected", "deleted"],
  changes_requested: ["pending_review", "approved", "rejected", "deleted"],
  approved: ["suspended", "archived", "changes_requested", "pending_review", "deleted"],
  rejected: ["pending_review", "deleted"],
  suspended: ["approved", "pending_review", "deleted"],
  archived: ["approved", "deleted"],
  // Leaving "deleted" is only possible through restoreListing (→ previous status).
  deleted: [],
};

export function canTransitionListing(from: ListingStatus, to: ListingStatus): boolean {
  const f = normalizeListingStatus(from);
  const t = normalizeListingStatus(to);
  return LISTING_TRANSITIONS[f]?.includes(t) ?? false;
}

/** Target statuses that need a written reason. */
export const LISTING_STATUSES_REQUIRING_REASON: readonly CanonicalListingStatus[] = [
  "rejected",
  "suspended",
  "changes_requested",
];

export const MIN_REASON_LENGTH = 3;

export function isValidReason(reason: unknown): reason is string {
  return typeof reason === "string" && reason.trim().length >= MIN_REASON_LENGTH;
}
