// TODO: replace with Supabase query
import "server-only";
import type { CancellationPolicy, HostType, Listing, Reservation, ReservationStatus, RoomType, Trip, User } from "@/types";
import { newId } from "@/lib/ids";
import { deductBookingCommission, getBookingCommission, reverseBookingCommission } from "@/lib/data/wallet";
import { REQUEST_TO_BOOK_TTL_HOURS } from "@/lib/booking/config";
import { eachNightKey, todayKey, type DateKey } from "@/lib/booking/dates";
import { effectiveStatus, holdsInventory } from "@/lib/booking/lifecycle";
import { roomTypeInventory, type BookingQuote } from "@/lib/booking/pricing";
import { maxGuestsFor, type ListingAvailability } from "@/lib/booking/availability";
import type { RefundBreakdown } from "@/lib/booking/cancellation";
import { blockedDateKeys } from "./calendar";
import { clone, delay } from "./_store";
import { listingsTable, organizationsTable, reservationsTable, tripsTable, usersTable } from "./_tables";

/** Contact details the HOST of a booking may see about the guest. */
function guestForHost(userId: string, createdAt: string): User {
  const user = usersTable.find((u) => u.id === userId);
  if (user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      favoriteIds: [],
      isIdentityVerified: user.isIdentityVerified,
    };
  }
  return {
    id: userId,
    name: "DARNA guest",
    email: "",
    image: "/assets/avatar.png",
    role: "guest",
    createdAt,
    favoriteIds: [],
  };
}

function tripFor(res: Reservation): Trip | undefined {
  return tripsTable.find((t) => t.id === res.tripId || (!!res.tripId && t.id === res.listingId));
}

/**
 * Lazily applies clock-based transitions to the stored row:
 * pending past expiresAt -> expired, confirmed past checkout -> completed.
 */
function settle(res: Reservation, now = new Date()): Reservation {
  const listing = res.tripId ? undefined : listingsTable.find((l) => l.id === res.listingId);
  const next = effectiveStatus(res, listing?.checkOutTime, now);
  if (next !== res.status) {
    if (next === "expired") {
      res.paymentStatus = "voided";
      res.respondedAt = res.expiresAt;
    }
    res.status = next;
  }
  return res;
}

function populate(res: Reservation): Reservation {
  const trip = tripFor(res);
  return clone({
    ...res,
    commissionAmount: res.commissionAmount ?? getBookingCommission(res.id) ?? undefined,
    listing: res.tripId ? undefined : listingsTable.find((l) => l.id === res.listingId),
    trip,
    user: guestForHost(res.userId, res.createdAt),
  });
}

/** Listing ids + trip ids owned by a host (individual) or an organization. */
function ownedInventory(owner: { hostId?: string; organizationId?: string }) {
  const listingIds = new Set(
    listingsTable
      .filter((l) =>
        owner.organizationId
          ? l.organizationId === owner.organizationId
          : Boolean(owner.hostId) && l.hostUserId === owner.hostId && !l.organizationId
      )
      .map((l) => l.id)
  );
  const tripIds = new Set(
    owner.organizationId
      ? tripsTable.filter((t) => t.organizationId === owner.organizationId).map((t) => t.id)
      : []
  );
  return { listingIds, tripIds };
}

export async function getReservations(params?: {
  userId?: string;
  listingId?: string;
  tripId?: string;
  hostId?: string;
  organizationId?: string;
  status?: ReservationStatus;
}): Promise<Reservation[]> {
  await delay(40);

  const now = new Date();
  reservationsTable.forEach((r) => settle(r, now));
  let results = [...reservationsTable];

  if (params?.status) results = results.filter((r) => r.status === params.status);
  if (params?.userId) results = results.filter((r) => r.userId === params.userId);
  if (params?.listingId) {
    results = results.filter((r) => r.listingId === params.listingId || r.tripId === params.listingId);
  }
  if (params?.tripId) results = results.filter((r) => r.tripId === params.tripId);

  if (params?.hostId || params?.organizationId) {
    const { listingIds, tripIds } = ownedInventory(params);
    results = results.filter(
      (r) => listingIds.has(r.listingId) || (r.tripId ? tripIds.has(r.tripId) : false)
    );
  }

  return results.map(populate);
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  await delay(30);
  const res = reservationsTable.find((r) => r.id === id);
  return res ? populate(settle(res)) : null;
}

/** Who owns the inventory a reservation was made on. */
export async function getReservationOwner(
  reservationId: string
): Promise<{ hostUserId: string | null; organizationId: string | null; guestUserId: string } | null> {
  const res = reservationsTable.find((r) => r.id === reservationId);
  if (!res) return null;
  const listing = res.tripId ? undefined : listingsTable.find((l) => l.id === res.listingId);
  const trip = tripFor(res);
  return {
    hostUserId: listing && !listing.organizationId ? listing.hostUserId || null : null,
    organizationId: listing?.organizationId || trip?.organizationId || null,
    guestUserId: res.userId,
  };
}

// ---------------------------------------------------------------------------
// Inventory / availability
// ---------------------------------------------------------------------------

export class ReservationConflictError extends Error {
  constructor(message = "DATES_UNAVAILABLE") {
    super(message);
    this.name = "ReservationConflictError";
  }
}

function activeListingReservations(listingId: string, now = new Date()): Reservation[] {
  return reservationsTable.filter((r) => !r.tripId && r.listingId === listingId && holdsInventory(r, now));
}

/** Room type a stored reservation occupies (legacy rows without one use the first type). */
function reservationRoomTypeId(res: Reservation, listing: Listing): string | undefined {
  if (!listing.roomTypes || listing.roomTypes.length === 0) return undefined;
  return listing.roomTypes.some((r) => r.id === res.selectedRoomTypeId) ? res.selectedRoomTypeId : listing.roomTypes[0].id;
}

/**
 * Units in use per night: whole-listing stays count 1 per reservation, room
 * types count rooms/beds, experiences count guests on their date.
 */
function usageByNight(listing: Listing, roomType: RoomType | null, now = new Date()): Map<DateKey, number> {
  const usage = new Map<DateKey, number>();
  for (const r of activeListingReservations(listing.id, now)) {
    let nights: DateKey[];
    let amount: number;
    if (listing.category === "experience") {
      nights = [r.startDate];
      amount = r.guestsCount;
    } else if (roomType) {
      if (reservationRoomTypeId(r, listing) !== roomType.id) continue;
      nights = eachNightKey(r.startDate, r.endDate);
      amount = r.unitCount ?? (roomType.bookingUnit === "bed" ? r.guestsCount : 1);
    } else {
      nights = eachNightKey(r.startDate, r.endDate);
      amount = 1;
    }
    for (const n of nights) usage.set(n, (usage.get(n) || 0) + amount);
  }
  return usage;
}

function capacityOf(listing: Listing, roomType: RoomType | null): number {
  if (listing.category === "experience") return maxGuestsFor(listing);
  if (roomType) return roomTypeInventory(roomType);
  return 1;
}

/**
 * Nights that can't be booked for the given unit: host-blocked dates plus
 * nights whose capacity is fully used by confirmed / live pending bookings.
 */
export function unavailableNights(listing: Listing, roomTypeId?: string | null, now = new Date()): Set<DateKey> {
  const roomType = listing.roomTypes?.find((r) => r.id === roomTypeId) ?? listing.roomTypes?.[0] ?? null;
  const out = blockedDateKeys(listing.id);
  const capacity = capacityOf(listing, roomType);
  usageByNight(listing, roomType, now).forEach((used, night) => {
    if (used >= capacity) out.add(night);
  });
  return out;
}

/** Built server-side and passed to the booking calendar as props. */
export async function getListingAvailability(listing: Listing): Promise<ListingAvailability> {
  const now = new Date();
  const today = todayKey(now);
  const keep = (s: Set<DateKey>) => Array.from(s).filter((d) => d >= today).sort();
  const unavailableByRoomType: Record<string, DateKey[]> = {};
  for (const rt of listing.roomTypes || []) unavailableByRoomType[rt.id] = keep(unavailableNights(listing, rt.id, now));
  return {
    today,
    unavailable: listing.roomTypes && listing.roomTypes.length > 0 ? [] : keep(unavailableNights(listing, null, now)),
    unavailableByRoomType,
  };
}

/** Does any active reservation overlap [start, end) on this whole-listing stay? (search filter) */
export function isListingFreeForRange(listing: Listing, start: DateKey, end: DateKey): boolean {
  const nights = eachNightKey(start, end);
  if (nights.length === 0) return true;
  const blocked = unavailableNights(listing, null);
  if (listing.roomTypes && listing.roomTypes.length > 0) {
    // A property is listed if at least one room type has every night free.
    const propertyBlocked = blockedDateKeys(listing.id);
    if (nights.some((n) => propertyBlocked.has(n))) return false;
    return listing.roomTypes.some((rt) => {
      const full = unavailableNights(listing, rt.id);
      return nights.every((n) => !full.has(n));
    });
  }
  return nights.every((n) => !blocked.has(n));
}

/** Seats sold per departure date (confirmed + live pending). */
export function seatsSoldByDeparture(tripId: string, now = new Date()): Record<DateKey, number> {
  const out: Record<DateKey, number> = {};
  for (const r of reservationsTable) {
    if (r.tripId !== tripId || !holdsInventory(r, now)) continue;
    out[r.startDate] = (out[r.startDate] || 0) + r.guestsCount;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface CreateReservationInput {
  userId: string;
  startDate: DateKey;
  endDate: DateKey;
  guestCount: number;
  quote: BookingQuote;
  approvalMode: "instant" | "request";
  cancellationPolicy: CancellationPolicy;
  guestMessage?: string;
  paymentMethod?: string;
}

function buildReservation(
  input: CreateReservationInput,
  ids: { listingId: string; tripId?: string; selectedRoomTypeId?: string; unitCount?: number }
): Reservation {
  const status: ReservationStatus = input.approvalMode === "request" ? "pending" : "confirmed";
  const now = new Date();
  return {
    id: newId("res"),
    userId: input.userId,
    listingId: ids.listingId,
    tripId: ids.tripId,
    startDate: input.startDate,
    endDate: input.endDate,
    totalPrice: input.quote.total,
    subtotal: input.quote.subtotal,
    nightlyPrice: input.quote.averageUnitPrice,
    cleaningFee: input.quote.cleaningFee,
    serviceFee: input.quote.serviceFee,
    taxes: input.quote.taxes,
    guestsCount: input.guestCount,
    unitCount: ids.unitCount,
    status,
    paymentStatus: status === "pending" ? "pending" : "paid",
    createdAt: now.toISOString(),
    paymentMethod: input.paymentMethod || "CIB / Edahabia Card",
    approvalMode: input.approvalMode,
    cancellationPolicy: input.cancellationPolicy,
    expiresAt:
      input.approvalMode === "request"
        ? new Date(now.getTime() + REQUEST_TO_BOOK_TTL_HOURS * 60 * 60 * 1000).toISOString()
        : undefined,
    guestMessage: input.guestMessage,
    selectedRoomTypeId: ids.selectedRoomTypeId,
  };
}

/**
 * Persists a listing reservation. The capacity check and the insert run in
 * one synchronous block (no await in between), so two concurrent requests
 * can't both take the last unit. Prices come from the server-side quote.
 */
export async function createListingReservation(
  listingId: string,
  input: CreateReservationInput & { selectedRoomTypeId?: string; unitCount?: number }
): Promise<Reservation> {
  await delay(60);
  const listing = listingsTable.find((l) => l.id === listingId);
  if (!listing) throw new ReservationConflictError("LISTING_GONE");
  const roomType = listing.roomTypes?.find((r) => r.id === input.selectedRoomTypeId) ?? null;

  // --- atomic section: check capacity, then insert ---
  const blocked = blockedDateKeys(listing.id);
  const nights = listing.category === "experience" ? [input.startDate] : eachNightKey(input.startDate, input.endDate);
  if (nights.length === 0 || nights.some((n) => blocked.has(n))) throw new ReservationConflictError();
  const capacity = capacityOf(listing, roomType);
  const requested = listing.category === "experience" ? input.guestCount : roomType ? input.unitCount ?? 1 : 1;
  const usage = usageByNight(listing, roomType);
  if (nights.some((n) => (usage.get(n) || 0) + requested > capacity)) throw new ReservationConflictError();

  const reservation = buildReservation(input, {
    listingId: listing.id,
    selectedRoomTypeId: roomType?.id,
    unitCount: roomType ? input.unitCount ?? 1 : undefined,
  });
  reservationsTable.unshift(reservation);
  // --- end atomic section ---

  if (reservation.status === "confirmed") await chargeCommission(reservation);
  return populate(reservation);
}

/** Persists a trip seat booking after checking the seats left on that departure. */
export async function createTripReservation(tripId: string, input: CreateReservationInput): Promise<Reservation> {
  await delay(60);
  const trip = tripsTable.find((t) => t.id === tripId);
  if (!trip) throw new ReservationConflictError("TRIP_GONE");

  // --- atomic section ---
  const sold = seatsSoldByDeparture(trip.id)[input.startDate] || 0;
  if (sold + input.guestCount > trip.maxGroupSize) throw new ReservationConflictError("SEATS_UNAVAILABLE");
  const reservation = buildReservation(input, { listingId: trip.id, tripId: trip.id });
  reservationsTable.unshift(reservation);
  // --- end atomic section ---

  if (reservation.status === "confirmed") await chargeCommission(reservation);
  return populate(reservation);
}

function commissionOwner(res: Reservation): {
  hostUserId: string | null;
  organizationId: string | null;
  hostType: HostType;
  ownerName?: string;
} {
  const listing = res.tripId ? undefined : listingsTable.find((l) => l.id === res.listingId);
  const trip = tripFor(res);
  const organizationId = listing?.organizationId || trip?.organizationId || null;
  const org = organizationId ? organizationsTable.find((o) => o.id === organizationId) : undefined;
  return {
    hostUserId: listing && !listing.organizationId ? listing.hostUserId || null : null,
    organizationId,
    // Hotels and hostels pay their own rates, not the agency rate.
    hostType: org?.businessCategory ?? (organizationId ? "agency" : "individual"),
    ownerName: org?.name,
  };
}

/** Commission base: accommodation subtotal (no DARNA service fee, no cleaning fee, no taxes). */
function commissionBase(res: Reservation): number {
  return res.subtotal ?? Math.max(0, res.totalPrice - (res.cleaningFee ?? 0) - (res.serviceFee ?? 0) - (res.taxes ?? 0));
}

async function chargeCommission(res: Reservation) {
  try {
    const result = await deductBookingCommission({
      bookingId: res.id,
      commissionBase: commissionBase(res),
      ...commissionOwner(res),
    });
    const stored = reservationsTable.find((r) => r.id === res.id);
    if (stored) {
      stored.commissionAmount = result.amount;
      stored.commissionRate = result.rate;
    }
  } catch (e) {
    console.error("Failed to deduct booking commission", e);
  }
}

/**
 * Records a cancellation with the refund computed by lib/booking/cancellation.
 * The host's commission is reversed for the refunded share of the subtotal.
 */
export async function cancelReservation(
  id: string,
  by: "guest" | "host",
  refund: RefundBreakdown
): Promise<Reservation | null> {
  await delay(40);
  const res = reservationsTable.find((r) => r.id === id);
  if (!res) return null;

  res.status = "cancelled";
  res.paymentStatus = refund.paymentStatus;
  res.refundAmount = refund.refundAmount;
  res.cancelledAt = new Date().toISOString();
  res.cancelledBy = by;

  const keepShare = by === "guest" ? 1 - refund.refundPercent / 100 : 0;
  try {
    await reverseBookingCommission(res.id, keepShare);
    res.commissionAmount = getBookingCommission(res.id) ?? 0;
  } catch (e) {
    console.error("Failed to reverse booking commission", e);
  }
  return populate(res);
}

/** Host accepts or declines a pending request. */
export async function respondToRequest(
  id: string,
  decision: "confirmed" | "declined",
  extra?: { declineReason?: string }
): Promise<Reservation | null> {
  await delay(40);
  const res = reservationsTable.find((r) => r.id === id);
  if (!res) return null;
  settle(res);
  if (res.status !== "pending") throw new ReservationConflictError("NOT_PENDING");

  res.status = decision;
  res.respondedAt = new Date().toISOString();
  if (decision === "confirmed") {
    res.paymentStatus = "paid";
    await chargeCommission(res);
  } else {
    res.paymentStatus = "voided";
    if (extra?.declineReason) res.declineReason = extra.declineReason;
    await reverseBookingCommission(res.id, 0);
  }
  return populate(res);
}
