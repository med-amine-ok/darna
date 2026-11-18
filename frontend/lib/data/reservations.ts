import "server-only";
import type { Listing, Reservation, ReservationStatus, Trip } from "@/types";
import { api, apiAll, apiOrNull, newIdempotencyKey } from "@/lib/api/client";
import {
  toCancellationPreview,
  toRefund,
  toReservation,
  toServerQuote,
  type ApiCancellationPreview,
  type ApiGuestBooking,
  type ApiHostBooking,
  type ApiQuote,
  type ApiRefund,
  type CancellationPreview,
  type RefundObligation,
  type ServerQuote,
} from "@/lib/api/bookings";
import { toListingAvailability, type ApiAvailability } from "@/lib/api/calendar";
import type { PricingModel } from "@/lib/booking/pricing";
import type { ListingAvailability } from "@/lib/booking/availability";
import { addDaysToKey, todayKey, type DateKey } from "@/lib/booking/dates";
import { getListingById } from "./listings";
import { getTripById } from "./trips";

/**
 * Bookings, quotes and availability, read from and written to the Django API
 * (backend apps/bookings, apps/pricing, apps/inventory). The backend is the
 * authority for prices, availability, status transitions and permissions;
 * nothing here computes money.
 *
 * Reads used by pages never throw: they log and return an empty result, and
 * the `load*` variants also say whether the read failed so the page can show
 * an error state instead of a misleading empty one.
 */

export interface Loaded<T> {
  data: T;
  failed: boolean;
}

async function loaded<T>(where: string, fallback: T, run: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { data: await run(), failed: false };
  } catch (error) {
    console.error(`[${where}]`, error);
    return { data: fallback, failed: true };
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Public listings and trips of guest bookings, for photos and links (best effort, at most 40 lookups). */
async function joinGuestInventory(rows: ApiGuestBooking[]): Promise<Map<string, Listing | Trip | null>> {
  const ids = new Map<string, "listing" | "trip">();
  for (const b of rows) {
    if (b.trip_id) ids.set(b.trip_id, "trip");
    else if (b.listing_id) ids.set(b.listing_id, "listing");
  }
  const found = new Map<string, Listing | Trip | null>();
  await Promise.all(
    Array.from(ids.entries())
      .slice(0, 40)
      .map(async ([id, kind]) => {
        const item = await (kind === "trip" ? getTripById(id) : getListingById(id)).catch(() => null);
        found.set(id, item);
      }),
  );
  return found;
}

/** The signed-in guest's own bookings, newest first (GET /me/bookings). Throws on API failure. */
export async function fetchGuestReservations(guestId: string, status?: ReservationStatus): Promise<Reservation[]> {
  const rows = await apiAll<ApiGuestBooking>("/me/bookings", { query: { status } });
  const inventory = await joinGuestInventory(rows);
  return rows.map((b) =>
    toReservation(b, {
      guestId,
      listing: b.trip_id ? null : ((inventory.get(b.listing_id ?? "") as Listing | null) ?? null),
      trip: b.trip_id ? ((inventory.get(b.trip_id) as Trip | null) ?? null) : null,
    }),
  );
}

/** Bookings of the active host workspace (GET /host/bookings). Throws on API failure. */
export async function fetchHostReservations(params?: { status?: ReservationStatus; listingId?: string }): Promise<Reservation[]> {
  const rows = await apiAll<ApiHostBooking>("/host/bookings", {
    query: { status: params?.status, listing: params?.listingId },
  });
  return rows.map((b) => toReservation(b));
}

/** Attach the host's own listings to their bookings (photos, titles, check-in times). */
export function attachListings(reservations: Reservation[], listings: Listing[]): Reservation[] {
  const byId = new Map(listings.map((l) => [l.id, l]));
  return reservations.map((r) => (r.tripId || r.listing ? r : { ...r, listing: byId.get(r.listingId) }));
}

export function loadGuestReservations(guestId: string): Promise<Loaded<Reservation[]>> {
  return loaded("loadGuestReservations", [], () => fetchGuestReservations(guestId));
}

export function loadHostReservations(): Promise<Loaded<Reservation[]>> {
  return loaded("loadHostReservations", [], () => fetchHostReservations());
}

/**
 * Kept for older callers: `userId` reads the signed-in guest's bookings,
 * `hostId` / `organizationId` the active host workspace's bookings (the
 * backend scopes both to the session, the ids only pick the side).
 * Never throws; an API failure gives an empty list.
 */
export async function getReservations(params?: {
  userId?: string;
  listingId?: string;
  tripId?: string;
  hostId?: string;
  organizationId?: string;
  status?: ReservationStatus;
}): Promise<Reservation[]> {
  try {
    let rows: Reservation[];
    if (params?.hostId || params?.organizationId) {
      rows = await fetchHostReservations({ status: params.status, listingId: params.tripId ? undefined : params.listingId });
    } else if (params?.userId) {
      rows = await fetchGuestReservations(params.userId, params.status);
    } else {
      return [];
    }
    if (params?.tripId) rows = rows.filter((r) => r.tripId === params.tripId);
    return rows;
  } catch (error) {
    console.error("[getReservations]", error);
    return [];
  }
}

/** One of the signed-in guest's bookings by UUID, or null. */
export async function getGuestReservation(id: string): Promise<Reservation | null> {
  const b = await apiOrNull<ApiGuestBooking>(`/me/bookings/${encodeURIComponent(id)}`);
  return b ? toReservation(b) : null;
}

/** One booking of the active host workspace by UUID, or null. */
export async function getHostReservation(id: string): Promise<Reservation | null> {
  const b = await apiOrNull<ApiHostBooking>(`/host/bookings/${encodeURIComponent(id)}`);
  return b ? toReservation(b) : null;
}

/** A booking the current user can see, as guest first, then as host. */
export async function getReservationById(id: string): Promise<Reservation | null> {
  return (await getGuestReservation(id).catch(() => null)) ?? (await getHostReservation(id).catch(() => null));
}

// ---------------------------------------------------------------------------
// Availability (GET /listings/{id}/availability)
// ---------------------------------------------------------------------------

/** How far ahead the booking calendars know availability (the API allows 366 days per call). */
const AVAILABILITY_DAYS = 365;

/**
 * Availability passed to the booking calendars. On an API failure the
 * calendar opens with no closed days; the backend still refuses a taken date
 * when the quote is asked for.
 */
export async function getListingAvailability(listing: Pick<Listing, "id">): Promise<ListingAvailability> {
  const today = todayKey();
  try {
    const answer = await api<ApiAvailability>(`/listings/${encodeURIComponent(listing.id)}/availability`, {
      query: { from: today, to: addDaysToKey(today, AVAILABILITY_DAYS) },
    });
    return toListingAvailability(answer);
  } catch (error) {
    console.error("[getListingAvailability]", error);
    return { today, unavailable: [], unavailableByRoomType: {} };
  }
}

interface ApiDeparture {
  id: string;
  starts_on: string;
  ends_on: string;
  seats_total: number;
  seats_left: number;
  status: string;
}

/** Upcoming open departures of a public trip (GET /trips/{id}/departures). Throws on API failure. */
export async function getTripDepartures(tripId: string): Promise<ApiDeparture[]> {
  const answer = await api<unknown>(`/trips/${encodeURIComponent(tripId)}/departures`);
  return Array.isArray(answer) ? (answer as ApiDeparture[]) : ((answer as { results?: ApiDeparture[] })?.results ?? []);
}

/** Seats already taken per departure date (seats total minus seats left). Empty on API failure. */
export async function getSeatsSoldByDeparture(tripId: string): Promise<Record<DateKey, number>> {
  try {
    const out: Record<DateKey, number> = {};
    for (const d of await getTripDepartures(tripId)) out[d.starts_on] = Math.max(0, d.seats_total - d.seats_left);
    return out;
  } catch (error) {
    console.error("[getSeatsSoldByDeparture]", error);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Quotes and booking creation
// ---------------------------------------------------------------------------

/** Body of POST /quotes: exactly one target, never a price (BR-PRC-01). */
export interface QuoteRequest {
  listing_id?: string;
  room_type_id?: string;
  experience_slot_id?: string;
  trip_departure_id?: string;
  check_in?: DateKey;
  check_out?: DateKey;
  guests: number;
  units?: number;
}

export async function createQuote(body: QuoteRequest, model?: PricingModel): Promise<ServerQuote> {
  const quote = await api<ApiQuote>("/quotes", { method: "POST", body });
  return toServerQuote(quote, model);
}

export async function getQuote(quoteId: string): Promise<ServerQuote | null> {
  const quote = await apiOrNull<ApiQuote>(`/quotes/${encodeURIComponent(quoteId)}`);
  return quote ? toServerQuote(quote) : null;
}

/** POST /me/bookings with a quote. One Idempotency-Key per user action makes retries safe. */
export async function bookQuote(quoteId: string, guestMessage?: string, idempotencyKey = newIdempotencyKey()): Promise<Reservation> {
  const booking = await api<ApiGuestBooking>("/me/bookings", {
    method: "POST",
    body: { quote_id: quoteId, ...(guestMessage ? { guest_message: guestMessage } : {}) },
    idempotencyKey,
  });
  return toReservation(booking);
}

// ---------------------------------------------------------------------------
// Guest lifecycle
// ---------------------------------------------------------------------------

const meBooking = (id: string) => `/me/bookings/${encodeURIComponent(id)}`;
const hostBooking = (id: string) => `/host/bookings/${encodeURIComponent(id)}`;

export async function guestCancellationPreview(id: string): Promise<CancellationPreview> {
  return toCancellationPreview(await api<ApiCancellationPreview>(`${meBooking(id)}/cancellation-preview`));
}

export async function guestCancel(id: string, reason = ""): Promise<Reservation> {
  return toReservation(await api<ApiGuestBooking>(`${meBooking(id)}/cancel`, { method: "POST", body: { reason } }));
}

export async function guestConfirmStay(id: string): Promise<Reservation> {
  return toReservation(await api<ApiGuestBooking>(`${meBooking(id)}/confirm-stay`, { method: "POST", body: {} }));
}

export interface DisputeInput {
  reasonCode: string;
  statement: string;
}

export async function openDispute(side: "guest" | "host", id: string, input: DisputeInput): Promise<void> {
  await api(`${side === "guest" ? meBooking(id) : hostBooking(id)}/dispute`, {
    method: "POST",
    body: { reason_code: input.reasonCode, statement: input.statement },
  });
}

export async function getMyRefunds(): Promise<RefundObligation[]> {
  return (await apiAll<ApiRefund>("/me/refunds")).map(toRefund);
}

export async function confirmRefundReceived(refundId: string): Promise<RefundObligation> {
  return toRefund(await api<ApiRefund>(`/me/refunds/${encodeURIComponent(refundId)}/confirm-received`, { method: "POST", body: {} }));
}

export async function disputeRefund(refundId: string, note: string): Promise<RefundObligation> {
  return toRefund(await api<ApiRefund>(`/me/refunds/${encodeURIComponent(refundId)}/dispute`, { method: "POST", body: { note } }));
}

// ---------------------------------------------------------------------------
// Host lifecycle (the backend checks the workspace and the member's permissions)
// ---------------------------------------------------------------------------

export async function hostAccept(id: string): Promise<Reservation> {
  return toReservation(await api<ApiHostBooking>(`${hostBooking(id)}/accept`, { method: "POST", body: {} }));
}

export async function hostDecline(id: string, reason: string): Promise<Reservation> {
  return toReservation(await api<ApiHostBooking>(`${hostBooking(id)}/decline`, { method: "POST", body: { reason } }));
}

export async function hostCancellationPreview(id: string): Promise<CancellationPreview> {
  return toCancellationPreview(await api<ApiCancellationPreview>(`${hostBooking(id)}/cancellation-preview`));
}

export async function hostCancel(id: string, reason: string): Promise<Reservation> {
  return toReservation(await api<ApiHostBooking>(`${hostBooking(id)}/cancel`, { method: "POST", body: { reason } }));
}

export async function hostConfirmStay(id: string, code: string): Promise<Reservation> {
  return toReservation(await api<ApiHostBooking>(`${hostBooking(id)}/confirm-stay`, { method: "POST", body: { code } }));
}

export async function getHostRefunds(): Promise<RefundObligation[]> {
  return (await apiAll<ApiRefund>("/host/refunds")).map(toRefund);
}

export async function declareRefundPaid(refundId: string, paymentReference: string): Promise<RefundObligation> {
  return toRefund(
    await api<ApiRefund>(`/host/refunds/${encodeURIComponent(refundId)}/declare-paid`, {
      method: "POST",
      body: { payment_reference: paymentReference },
    }),
  );
}
