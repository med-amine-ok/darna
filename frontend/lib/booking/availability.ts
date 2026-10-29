/**
 * Booking request validation shared by the booking widgets (preview) and the
 * server (authority). Pure and client-safe: the caller supplies "today" and
 * the set of unavailable nights computed server-side.
 */
import type { Listing, RoomType, Trip } from "@/types";
import { getStayRules } from "./config";
import { addDaysToKey, isDateKey, nightsBetween, eachNightKey, type DateKey } from "./dates";
import { roomTypeInventory } from "./pricing";
import type { ActionError } from "@/lib/action-result";

/** Server-built availability passed to the booking calendars as props. */
export interface ListingAvailability {
  today: DateKey;
  /** Booked or blocked nights for whole-listing bookings (homes, vehicles, experiences). */
  unavailable: DateKey[];
  /** Fully booked or blocked nights per room type (hotels, hostels). */
  unavailableByRoomType: Record<string, DateKey[]>;
}

/** Booking kinds that reserve the whole listing for a date range. */
export function isExclusiveStay(listing: Pick<Listing, "category" | "roomTypes">): boolean {
  return listing.category !== "experience" && !(listing.roomTypes && listing.roomTypes.length > 0);
}

/** Highest guest count allowed for the selection. */
export function maxGuestsFor(
  listing: Pick<Listing, "category" | "guestCount" | "seats" | "groupSize">,
  roomType?: Pick<RoomType, "bookingUnit" | "capacity"> | null,
  unitCount = 1
): number {
  if (roomType) {
    // Hostel beds: one guest per bed. Rooms: capacity × rooms.
    return roomType.bookingUnit === "bed" ? Math.max(1, unitCount) : Math.max(1, roomType.capacity * Math.max(1, unitCount));
  }
  if (listing.category === "vehicle") return Math.max(1, listing.seats ?? listing.guestCount ?? 5);
  if (listing.category === "experience") return Math.max(1, listing.groupSize ?? listing.guestCount ?? 10);
  return Math.max(1, listing.guestCount ?? 16);
}

export function maxUnitsFor(roomType?: Pick<RoomType, "inventoryCount" | "totalInventory"> | null): number {
  return roomType ? Math.max(1, roomTypeInventory(roomType)) : 1;
}

export interface ListingRequest {
  startDate: DateKey;
  endDate: DateKey;
  guestCount: number;
  unitCount?: number;
}

/**
 * Returns an error code (+ params) or null when the request respects the
 * listing's rules. `unavailableNights` = booked or host-blocked nights for the
 * selected unit (for experiences: dates that are full or blocked).
 */
export function validateListingRequest(params: {
  listing: Pick<
    Listing,
    | "category"
    | "roomTypes"
    | "guestCount"
    | "seats"
    | "groupSize"
    | "availableFrom"
    | "availableTo"
    | "minNights"
    | "maxNights"
    | "advanceNoticeDays"
    | "checkInTime"
    | "checkOutTime"
  >;
  roomType?: RoomType | null;
  request: ListingRequest;
  today: DateKey;
  unavailableNights?: ReadonlySet<DateKey>;
}): ActionError | null {
  const { listing, request, today, roomType } = params;
  const { startDate, endDate } = request;
  if (!isDateKey(startDate) || !isDateKey(endDate)) return { code: "INVALID_DATES" };

  const rules = getStayRules(listing);
  const earliest = addDaysToKey(today, rules.advanceNoticeDays);
  if (startDate < today) return { code: "PAST_DATE" };
  if (startDate < earliest) {
    return { code: "ADVANCE_NOTICE", params: { count: rules.advanceNoticeDays } };
  }
  if (listing.availableFrom && isDateKey(listing.availableFrom) && startDate < listing.availableFrom) {
    return { code: "OUTSIDE_WINDOW" };
  }

  const isExperience = listing.category === "experience";
  if (isExperience) {
    if (listing.availableTo && isDateKey(listing.availableTo) && startDate > listing.availableTo) {
      return { code: "OUTSIDE_WINDOW" };
    }
  } else {
    const nights = nightsBetween(startDate, endDate);
    const byDay = listing.category === "vehicle";
    if (nights < 1) return { code: byDay ? "MIN_ONE_DAY" : "MIN_ONE_NIGHT" };
    if (nights < rules.minNights) return { code: byDay ? "MIN_DAYS" : "MIN_NIGHTS", params: { count: rules.minNights } };
    if (nights > rules.maxNights) return { code: byDay ? "MAX_DAYS" : "MAX_NIGHTS", params: { count: rules.maxNights } };
    // availableTo is the last possible checkout / return date.
    if (listing.availableTo && isDateKey(listing.availableTo) && endDate > listing.availableTo) {
      return { code: "OUTSIDE_WINDOW" };
    }
  }

  const unitCount = Math.max(1, Math.floor(request.unitCount ?? 1));
  if (roomType && unitCount > maxUnitsFor(roomType)) {
    return { code: roomType.bookingUnit === "bed" ? "MAX_BEDS" : "MAX_ROOMS", params: { count: maxUnitsFor(roomType) } };
  }
  const maxGuests = maxGuestsFor(listing, roomType, roomType?.bookingUnit === "bed" ? request.guestCount : unitCount);
  if (!Number.isInteger(request.guestCount) || request.guestCount < 1) return { code: "INVALID_GUESTS" };
  if (request.guestCount > maxGuests) return { code: "MAX_GUESTS", params: { count: maxGuests } };

  const unavailable = params.unavailableNights;
  if (unavailable && unavailable.size > 0) {
    const nights = isExperience ? [startDate] : eachNightKey(startDate, endDate);
    if (nights.some((n) => unavailable.has(n))) return { code: "DATES_UNAVAILABLE" };
  }
  return null;
}

/** Trip departure validation (seat counts come from the server). */
export function validateTripRequest(params: {
  trip: Pick<Trip, "departureDates" | "maxGroupSize" | "minGroupSize">;
  departureDate: DateKey;
  guestCount: number;
  seatsSold: number;
  today: DateKey;
}): ActionError | null {
  const { trip, departureDate, guestCount, seatsSold, today } = params;
  if (!trip.departureDates || trip.departureDates.length === 0) return { code: "TRIP_NO_DEPARTURES" };
  if (!isDateKey(departureDate) || !trip.departureDates.includes(departureDate)) {
    return { code: "INVALID_DEPARTURE" };
  }
  if (departureDate <= today) return { code: "DEPARTURE_PASSED" };
  if (!Number.isInteger(guestCount) || guestCount < 1) return { code: "INVALID_TRAVELERS" };
  const seatsLeft = Math.max(0, trip.maxGroupSize - seatsSold);
  if (seatsLeft === 0) return { code: "DEPARTURE_FULL" };
  if (guestCount > seatsLeft) return { code: "SEATS_LEFT", params: { count: seatsLeft } };
  return null;
}

/** Last day of a trip: a 5-day trip leaving on the 1st ends on the 5th. */
export function tripEndDate(departureDate: DateKey, durationDays: number): DateKey {
  return addDaysToKey(departureDate, Math.max(1, durationDays) - 1);
}
