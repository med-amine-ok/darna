"use server";

import * as data from "@/lib/data/bookings";
import { runAction, id, str, obj, dzd, oneOf, reason, requireAlso } from "@/lib/auth/run-action";
import type { DisputeOutcome } from "@/lib/types";

type ListParams = data.BookingFilterParams;

const DISPUTE_OUTCOMES: readonly DisputeOutcome[] = ["refund_full", "refund_partial", "declined"];

export async function listBookings(params: ListParams = {}) {
  return runAction("bookings.view", () => data.listBookings(params ?? {}));
}

export async function getBookingById(bookingId: string) {
  return runAction("bookings.view", () => data.getBookingById(id(bookingId)));
}

export async function cancelBooking(bookingId: string, cancelReason: string) {
  return runAction("bookings.cancel", (actor) => data.cancelBooking(id(bookingId), reason(cancelReason), actor));
}

/** Amount is integer DZD, 1..total − refundedSoFar (upper bound enforced in lib/data). */
export async function refundBooking(bookingId: string, amount: number, refundReason: string) {
  return runAction("bookings.refund", (actor) =>
    data.refundBooking(id(bookingId), dzd(amount, "amount"), reason(refundReason), actor)
  );
}

export async function resolveDispute(
  bookingId: string,
  outcome: DisputeOutcome,
  note: string,
  amount?: number
) {
  return runAction("bookings.dispute", (actor) => {
    const o = oneOf(outcome, DISPUTE_OUTCOMES, "outcome");
    if (o !== "declined") requireAlso(actor, "bookings.refund");
    return data.resolveDispute(
      id(bookingId),
      o,
      reason(note, "resolution note"),
      actor,
      o === "refund_partial" ? dzd(amount, "amount") : undefined
    );
  });
}

/** Full filtered bookings list as CSV (all pages). Requires reports.export + bookings.view. */
export async function exportBookings(params: ListParams = {}) {
  return runAction("reports.export", (actor) => {
    requireAlso(actor, "bookings.view");
    const p = obj<ListParams>(params ?? {}, "params");
    const opt = (v: unknown, f: string) => (v === undefined || v === null ? undefined : str(v, f, 200));
    return data.exportBookings(
      {
        status: opt(p.status, "status"),
        vertical: opt(p.vertical, "vertical"),
        hostType: opt(p.hostType, "hostType"),
        wilayaCode: opt(p.wilayaCode, "wilayaCode"),
        paymentStatus: opt(p.paymentStatus, "paymentStatus"),
        search: opt(p.search, "search"),
      },
      actor
    );
  });
}
