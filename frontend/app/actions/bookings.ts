"use server";

import { revalidatePath } from "next/cache";
import type { Reservation } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import { getHostContextForReservation } from "@/lib/server/authz";
import { getListingById, isPublicListing } from "@/lib/data/listings";
import { getTripById } from "@/lib/data/trips";
import { priceOverridesFor } from "@/lib/data/calendar";
import {
  cancelReservation,
  createListingReservation,
  createTripReservation,
  getReservationById,
  getReservationOwner,
  ReservationConflictError,
  respondToRequest,
  seatsSoldByDeparture,
  unavailableNights,
} from "@/lib/data/reservations";
import {
  isRequestToBook,
  quoteListingBooking,
  quoteTripBooking,
  selectRoomType,
} from "@/lib/booking/pricing";
import {
  tripEndDate,
  validateListingRequest,
  validateTripRequest,
} from "@/lib/booking/availability";
import {
  computeGuestRefund,
  computeHostRefund,
} from "@/lib/booking/cancellation";
import { isDateKey, todayKey } from "@/lib/booking/dates";

export type CreateBookingInput =
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
      guestMessage?: string;
    }
  | {
      kind: "trip";
      tripId: string;
      departureDate: string;
      guestCount: number;
      guestMessage?: string;
    };

function cleanCount(value: unknown, max = 500): number | null {
  const n = typeof value === "number" ? value : NaN;
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

function cleanMessage(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 2000)
    : undefined;
}

/**
 * Creates a booking for the logged-in user. Dates are validated against the
 * listing's rules and live availability; price, fees, status and approval
 * mode are computed here from server data, nothing money-related or
 * status-related is taken from the client.
 */
export async function createBookingAction(
  input: CreateBookingInput,
): Promise<ActionResult<Reservation>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!input || typeof input !== "object") return actionFail("INVALID_INPUT");

  const guestCount = cleanCount(input.guestCount);
  if (!guestCount) return actionFail("INVALID_GUESTS");
  const guestMessage = cleanMessage(input.guestMessage);
  const today = todayKey();

  try {
    if (input.kind === "listing") {
      const listing =
        typeof input.listingId === "string"
          ? await getListingById(input.listingId)
          : null;
      // Drafts / suspended listings are never bookable.
      if (!listing || !isPublicListing(listing))
        return actionFail("LISTING_UNAVAILABLE");
      if (listing.hostUserId === user.id && !listing.organizationId) {
        return actionFail("OWN_LISTING");
      }

      const startDate = input.startDate;
      const endDate =
        listing.category === "experience" ? input.startDate : input.endDate;
      if (!isDateKey(startDate) || !isDateKey(endDate))
        return actionFail("INVALID_DATES");

      const roomType = selectRoomType(
        listing,
        typeof input.selectedRoomTypeId === "string"
          ? input.selectedRoomTypeId
          : null,
      );
      const unitCount = roomType
        ? roomType.bookingUnit === "bed"
          ? guestCount // one bed per guest
          : cleanCount(input.unitCount ?? 1, 10000)
        : undefined;
      if (roomType && !unitCount) return actionFail("INVALID_ROOM_COUNT");

      const error = validateListingRequest({
        listing,
        roomType,
        request: {
          startDate,
          endDate,
          guestCount,
          unitCount: unitCount ?? undefined,
        },
        today,
        unavailableNights: unavailableNights(listing, roomType?.id),
      });
      if (error) return actionFail(error.code, error.params);

      const quote = quoteListingBooking({
        listing,
        startDate,
        endDate,
        guestCount,
        unitCount: unitCount ?? undefined,
        selectedRoomTypeId: roomType?.id,
        priceOverrides: roomType ? undefined : priceOverridesFor(listing.id),
      });
      if (quote.total <= 0) return actionFail("INVALID_DATES");

      const reservation = await createListingReservation(listing.id, {
        userId: user.id,
        startDate,
        endDate,
        guestCount,
        unitCount: unitCount ?? undefined,
        selectedRoomTypeId: roomType?.id,
        quote,
        approvalMode: isRequestToBook(listing) ? "request" : "instant",
        cancellationPolicy: listing.cancellationPolicy ?? "flexible",
        guestMessage,
      });
      revalidatePath("/", "layout");
      return actionOk(reservation);
    }

    if (input.kind === "trip") {
      const trip =
        typeof input.tripId === "string"
          ? await getTripById(input.tripId)
          : null;
      if (!trip || trip.status !== "active")
        return actionFail("TRIP_UNAVAILABLE");

      const departureDate = input.departureDate;
      const error = validateTripRequest({
        trip,
        departureDate,
        guestCount,
        seatsSold: isDateKey(departureDate)
          ? seatsSoldByDeparture(trip.id)[departureDate] || 0
          : 0,
        today,
      });
      if (error) return actionFail(error.code, error.params);

      const quote = quoteTripBooking({ trip, guestCount });
      const reservation = await createTripReservation(trip.id, {
        userId: user.id,
        startDate: departureDate,
        endDate: tripEndDate(departureDate, trip.durationDays),
        guestCount,
        quote,
        approvalMode:
          trip.organization?.bookingApprovalMode === "request"
            ? "request"
            : "instant",
        cancellationPolicy: trip.cancellationPolicy,
        guestMessage,
      });
      revalidatePath("/", "layout");
      return actionOk(reservation);
    }

    return actionFail("INVALID_INPUT");
  } catch (err) {
    if (err instanceof ReservationConflictError) {
      return actionFail(
        err.message === "SEATS_UNAVAILABLE"
          ? "SEATS_UNAVAILABLE"
          : "DATES_UNAVAILABLE",
      );
    }
    console.error("[createBookingAction] failed", err);
    return actionFail("BOOKING_FAILED");
  }
}

/** Guest cancels one of THEIR OWN reservations, under the listing's cancellation policy. */
export async function cancelMyReservationAction(
  reservationId: string,
): Promise<ActionResult<Reservation>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");

  const owner =
    typeof reservationId === "string"
      ? await getReservationOwner(reservationId)
      : null;
  if (!owner || owner.guestUserId !== user.id) return actionFail("NOT_FOUND");

  const existing = await getReservationById(reservationId); // settles expired / completed first
  if (!existing) return actionFail("NOT_FOUND");

  const refund = computeGuestRefund({
    reservation: existing,
    policy:
      existing.cancellationPolicy ??
      existing.listing?.cancellationPolicy ??
      existing.trip?.cancellationPolicy,
    checkInTime: existing.tripId ? "00:00" : existing.listing?.checkInTime,
  });
  if (!refund.allowed) return actionFail(refund.reason ?? "CONFLICT");

  const updated = await cancelReservation(reservationId, "guest", refund);
  if (!updated) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk(updated);
}

export type HostReservationDecision = "confirm" | "decline" | "cancel";

/**
 * Host (or org member) accepts / declines / cancels a reservation on
 * inventory they own. Expired requests can't be accepted.
 */
export async function respondToReservationAction(
  reservationId: string,
  decision: HostReservationDecision,
  declineReason?: string,
): Promise<ActionResult<Reservation>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof reservationId !== "string") return actionFail("INVALID_INPUT");

  const ctx = await getHostContextForReservation(reservationId);
  if (!ctx) return actionFail("NOT_FOUND");

  const existing = await getReservationById(reservationId); // settles expired / completed first
  if (!existing) return actionFail("NOT_FOUND");

  try {
    let updated: Reservation | null = null;
    if (decision === "confirm" || decision === "decline") {
      if (existing.status === "expired") return actionFail("REQUEST_EXPIRED");
      if (existing.status !== "pending")
        return actionFail("REQUEST_NOT_PENDING");
      updated = await respondToRequest(
        reservationId,
        decision === "confirm" ? "confirmed" : "declined",
        {
          declineReason:
            typeof declineReason === "string"
              ? declineReason.slice(0, 500)
              : undefined,
        },
      );
    } else if (decision === "cancel") {
      if (existing.status !== "confirmed") {
        return actionFail("RESERVATION_NOT_CANCELLABLE");
      }
      updated = await cancelReservation(
        reservationId,
        "host",
        computeHostRefund(existing),
      );
    } else {
      return actionFail("INVALID_INPUT");
    }

    if (!updated) return actionFail("NOT_FOUND");
    revalidatePath("/", "layout");
    return actionOk(updated);
  } catch (err) {
    if (err instanceof ReservationConflictError)
      return actionFail("REQUEST_EXPIRED");
    console.error("[respondToReservationAction] failed", err);
    return actionFail("SERVER_ERROR");
  }
}
