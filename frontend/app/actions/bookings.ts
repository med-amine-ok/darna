"use server";

import { revalidatePath } from "next/cache";
import type { Reservation } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import { getHostContext } from "@/lib/server/host-context";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import { bookingCodeFor, bookingFail, type CancellationPreview, type RefundObligation, type ServerQuote } from "@/lib/api/bookings";
import {
  bookQuote,
  confirmRefundReceived,
  createQuote,
  declareRefundPaid,
  disputeRefund,
  getHostRefunds,
  getMyRefunds,
  getQuote,
  getTripDepartures,
  guestCancel,
  guestCancellationPreview,
  guestConfirmStay,
  hostAccept,
  hostCancel,
  hostCancellationPreview,
  hostConfirmStay,
  hostDecline,
  openDispute,
  type QuoteRequest,
} from "@/lib/data/reservations";
import type { PricingModel } from "@/lib/booking/pricing";
import { isDateKey } from "@/lib/booking/dates";

/**
 * Booking server actions. Prices, availability, status changes and
 * permissions are decided by the Django API; these actions only check the
 * session, clean the input and translate API errors into action codes.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

const PRICING_MODELS: PricingModel[] = ["per_night", "per_room_night", "per_bed_night", "per_person", "per_day", "per_traveller"];

/** What the guest picked in a booking widget. Never a price. */
export type BookingSelection =
  | {
      kind: "listing";
      listingId: string;
      /** yyyy-MM-dd (check-in / pickup / experience date). */
      startDate: string;
      /** yyyy-MM-dd (checkout / return). Ignored for experiences. */
      endDate: string;
      guestCount: number;
      /** Rooms (hotels) or beds (hostels). */
      unitCount?: number;
      selectedRoomTypeId?: string;
      /** Experience session (GET /listings/{id}/availability slots). */
      slotId?: string;
      /** How the widget labels the price (display only). */
      model?: PricingModel;
    }
  | {
      kind: "trip";
      tripId: string;
      departureDate: string;
      /** Departure UUID when known; otherwise found from the date. */
      departureId?: string;
      guestCount: number;
    };

export type CreateBookingInput = BookingSelection & {
  /** The quote the guest saw (POST /quotes); a fresh one is asked for when missing or expired. */
  quoteId?: string;
  guestMessage?: string;
};

function cleanCount(value: unknown, max = 500): number | null {
  const n = typeof value === "number" ? value : NaN;
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type Cleaned = { body: QuoteRequest; model?: PricingModel } | { error: ActionResult<never> };

/** Turn a widget selection into the body of POST /quotes. */
async function quoteBody(input: BookingSelection): Promise<Cleaned> {
  if (!input || typeof input !== "object") return { error: actionFail("INVALID_INPUT") };
  const guests = cleanCount(input.guestCount);
  if (!guests) return { error: actionFail("INVALID_GUESTS") };

  if (input.kind === "listing") {
    if (!isUuid(input.listingId)) return { error: actionFail("LISTING_UNAVAILABLE") };
    if (!isDateKey(input.startDate)) return { error: actionFail("INVALID_DATES") };
    const model = PRICING_MODELS.includes(input.model as PricingModel) ? input.model : undefined;
    if (input.slotId !== undefined) {
      if (!isUuid(input.slotId)) return { error: actionFail("INVALID_DATES") };
      return { body: { listing_id: input.listingId, experience_slot_id: input.slotId, guests }, model };
    }
    if (!isDateKey(input.endDate) || input.endDate <= input.startDate) return { error: actionFail("INVALID_DATES") };
    const body: QuoteRequest = { listing_id: input.listingId, check_in: input.startDate, check_out: input.endDate, guests };
    if (input.selectedRoomTypeId !== undefined) {
      if (!isUuid(input.selectedRoomTypeId)) return { error: actionFail("INVALID_ROOM_COUNT") };
      const units = cleanCount(input.unitCount ?? 1, 10000);
      if (!units) return { error: actionFail("INVALID_ROOM_COUNT") };
      body.room_type_id = input.selectedRoomTypeId;
      body.units = units;
    }
    return { body, model };
  }

  if (input.kind === "trip") {
    if (typeof input.tripId !== "string" || !input.tripId) return { error: actionFail("TRIP_UNAVAILABLE") };
    let departureId = isUuid(input.departureId) ? input.departureId : null;
    if (!departureId) {
      if (!isDateKey(input.departureDate)) return { error: actionFail("INVALID_DEPARTURE") };
      const departures = await getTripDepartures(input.tripId);
      const match = departures.find((d) => d.starts_on === input.departureDate);
      if (!match) return { error: actionFail("INVALID_DEPARTURE") };
      departureId = match.id;
    }
    return { body: { trip_departure_id: departureId, guests }, model: "per_traveller" };
  }

  return { error: actionFail("INVALID_INPUT") };
}

/**
 * Price a selection on the server (POST /quotes). Open to visitors: the
 * booking widgets show this quote, never a price computed in the browser.
 */
export async function quoteBookingAction(input: BookingSelection): Promise<ActionResult<ServerQuote>> {
  try {
    const cleaned = await quoteBody(input);
    if ("error" in cleaned) return cleaned.error;
    return actionOk(await createQuote(cleaned.body, cleaned.model));
  } catch (error) {
    return bookingFail(error, "quoteBookingAction");
  }
}

const isQuoteGone = (error: unknown) =>
  error instanceof ApiError && (error.code === "quote_expired" || error.code === "quote_already_used" || error.status === 404);

/**
 * Book a quote for the signed-in guest (POST /me/bookings with an
 * Idempotency-Key). When the quote the guest saw has expired, a new one is
 * asked for; it is booked only if its total is unchanged, else PRICE_CHANGED.
 */
export async function createBookingAction(input: CreateBookingInput): Promise<ActionResult<Reservation>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const guestMessage = cleanText(input?.guestMessage, 2000) || undefined;
  const idempotencyKey = newIdempotencyKey();

  try {
    const cleaned = await quoteBody(input);
    if ("error" in cleaned) return cleaned.error;

    let reservation: Reservation;
    if (isUuid(input.quoteId)) {
      try {
        reservation = await bookQuote(input.quoteId, guestMessage, idempotencyKey);
      } catch (error) {
        if (!isQuoteGone(error)) throw error;
        const [seen, fresh] = await Promise.all([getQuote(input.quoteId).catch(() => null), createQuote(cleaned.body)]);
        if (!seen || seen.total !== fresh.total) return actionFail("PRICE_CHANGED");
        reservation = await bookQuote(fresh.quoteId, guestMessage, newIdempotencyKey());
      }
    } else {
      const fresh = await createQuote(cleaned.body);
      reservation = await bookQuote(fresh.quoteId, guestMessage, idempotencyKey);
    }
    revalidatePath("/", "layout");
    return actionOk(reservation);
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) return actionFail(bookingCodeFor(error));
    return bookingFail(error, "createBookingAction");
  }
}

// ---------------------------------------------------------------------------
// Guest
// ---------------------------------------------------------------------------

async function asGuest<T>(where: string, id: unknown, run: (id: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!isUuid(id)) return actionFail("NOT_FOUND");
  try {
    return actionOk(await run(id));
  } catch (error) {
    return bookingFail(error, where);
  }
}

/** What cancelling one of my bookings would refund now (the backend applies the frozen policy). */
export async function getMyCancellationPreviewAction(reservationId: string): Promise<ActionResult<CancellationPreview>> {
  return asGuest("getMyCancellationPreviewAction", reservationId, guestCancellationPreview);
}

/** Guest cancels one of their own bookings. */
export async function cancelMyReservationAction(reservationId: string, reason?: string): Promise<ActionResult<Reservation>> {
  const result = await asGuest("cancelMyReservationAction", reservationId, (id) => guestCancel(id, cleanText(reason, 2000)));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Guest confirms the stay took place (from check-in time on). */
export async function confirmMyStayAction(reservationId: string): Promise<ActionResult<Reservation>> {
  const result = await asGuest("confirmMyStayAction", reservationId, guestConfirmStay);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

const DISPUTE_REASONS = ["not_as_described", "no_show", "safety", "cleanliness", "refund", "other"] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

/** Report a problem with a booking to BLADUS support (opens a dispute, as guest or as host). */
export async function reportBookingProblemAction(
  reservationId: string,
  input: { side: "guest" | "host"; reasonCode: DisputeReason; statement: string },
): Promise<ActionResult<null>> {
  const statement = cleanText(input?.statement, 4000);
  if (!DISPUTE_REASONS.includes(input?.reasonCode)) return actionFail("INVALID_INPUT");
  if (statement.length < 20) return actionFail("INVALID_INPUT");
  const side = input.side === "host" ? "host" : "guest";
  if (side === "host" && !(await getHostContext())) return actionFail("FORBIDDEN");
  const result = await asGuest("reportBookingProblemAction", reservationId, (id) =>
    openDispute(side, id, { reasonCode: input.reasonCode, statement }),
  );
  return result.ok ? actionOk(null) : result;
}

/** Refunds hosts owe me after cancellations. */
export async function getMyRefundsAction(): Promise<ActionResult<RefundObligation[]>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  try {
    return actionOk(await getMyRefunds());
  } catch (error) {
    return bookingFail(error, "getMyRefundsAction");
  }
}

/** Guest confirms a refund arrived, or says it did not (with a note). */
export async function answerRefundAction(
  refundId: string,
  answer: { received: true } | { received: false; note: string },
): Promise<ActionResult<RefundObligation>> {
  if (!answer?.received) {
    const note = cleanText((answer as { note?: string })?.note, 2000);
    if (!note) return actionFail("REASON_REQUIRED");
    return asGuest("answerRefundAction", refundId, (id) => disputeRefund(id, note));
  }
  return asGuest("answerRefundAction", refundId, confirmRefundReceived);
}

// ---------------------------------------------------------------------------
// Host
// ---------------------------------------------------------------------------

async function asHost<T>(where: string, id: unknown, run: (id: string) => Promise<T>): Promise<ActionResult<T>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail((await getSessionUser()) ? "FORBIDDEN" : "UNAUTHENTICATED");
  if (!isUuid(id)) return actionFail("NOT_FOUND");
  try {
    return actionOk(await run(id));
  } catch (error) {
    return bookingFail(error, where);
  }
}

export type HostReservationDecision = "confirm" | "decline" | "cancel";

/**
 * Host (or a member of the organisation with the right permission) accepts or
 * declines a request, or cancels a confirmed booking. `reason` is required by
 * the backend for declines and cancellations.
 */
export async function respondToReservationAction(
  reservationId: string,
  decision: HostReservationDecision,
  reason?: string,
): Promise<ActionResult<Reservation>> {
  const text = cleanText(reason, 2000);
  if ((decision === "decline" || decision === "cancel") && !text) return actionFail("REASON_REQUIRED");
  const run =
    decision === "confirm"
      ? hostAccept
      : decision === "decline"
        ? (id: string) => hostDecline(id, text)
        : decision === "cancel"
          ? (id: string) => hostCancel(id, text)
          : null;
  if (!run) return actionFail("INVALID_INPUT");
  const result = await asHost("respondToReservationAction", reservationId, run);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** What a host cancellation would do now (guest refund, commission returned). */
export async function getHostCancellationPreviewAction(reservationId: string): Promise<ActionResult<CancellationPreview>> {
  return asHost("getHostCancellationPreviewAction", reservationId, hostCancellationPreview);
}

/** Host enters the guest's 6-digit check-in code on arrival. */
export async function confirmGuestStayAction(reservationId: string, code: string): Promise<ActionResult<Reservation>> {
  const clean = cleanText(code, 12).replace(/\s+/g, "");
  if (!/^[0-9]{6}$/.test(clean)) return actionFail("STAY_CODE_INVALID");
  const result = await asHost("confirmGuestStayAction", reservationId, (id) => hostConfirmStay(id, clean));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Refunds the active workspace owes guests. */
export async function getHostRefundsAction(): Promise<ActionResult<RefundObligation[]>> {
  if (!(await getHostContext())) return actionFail("FORBIDDEN");
  try {
    return actionOk(await getHostRefunds());
  } catch (error) {
    return bookingFail(error, "getHostRefundsAction");
  }
}

/** Host declares a refund paid, with the transfer reference. */
export async function declareRefundPaidAction(refundId: string, paymentReference: string): Promise<ActionResult<RefundObligation>> {
  const reference = cleanText(paymentReference, 200);
  if (!reference) return actionFail("INVALID_INPUT");
  return asHost("declareRefundPaidAction", refundId, (id) => declareRefundPaid(id, reference));
}
