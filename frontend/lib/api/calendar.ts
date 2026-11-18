import "server-only";
import type { DateAvailabilityOverride } from "@/types";
import type { ListingAvailability, ListingSlot } from "@/lib/booking/availability";
import { dzd, type ApiMoney } from "./bookings";

/**
 * Availability and host calendars of the Django API (backend apps/inventory)
 * mapped onto the frontend types.
 */

interface ApiAvailabilityNight {
  date: string;
  available: boolean;
  reason: string | null;
  units_left?: number;
  price: ApiMoney;
}

/** GET /listings/{id}/availability (inventory.selectors.public_availability). */
export interface ApiAvailability {
  listing_id: string;
  inventory_kind: "single" | "room_pool" | "slot";
  today: string;
  from: string;
  to: string;
  min_nights: number;
  max_nights: number | null;
  advance_notice_days: number;
  nights?: ApiAvailabilityNight[];
  room_types?: { room_type_id: string; name: string; nights: ApiAvailabilityNight[] }[];
  slots?: {
    id: string;
    starts_at: string;
    ends_at: string;
    seats_total: number;
    seats_left: number;
    is_cancelled: boolean;
    price: ApiMoney;
  }[];
}

/** Algeria has no daylight saving time: the local date of an instant is its UTC+1 date. */
function algiersDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Nights that cannot be booked. Past days and the advance-notice window are
 * left out: the widgets already keep the calendar from opening before them,
 * and listing them would only bloat the props.
 */
function closedNights(nights: ApiAvailabilityNight[]): string[] {
  return nights
    .filter((n) => !n.available && n.reason !== "past" && n.reason !== "advance_notice")
    .map((n) => n.date);
}

export function toListingAvailability(a: ApiAvailability): ListingAvailability {
  const unavailableByRoomType: Record<string, string[]> = {};
  const unitsLeftByRoomType: Record<string, Record<string, number>> = {};
  const priceByRoomType: Record<string, Record<string, number>> = {};
  for (const room of a.room_types ?? []) {
    priceByRoomType[room.room_type_id] = Object.fromEntries(room.nights.map((n) => [n.date, dzd(n.price)]));
    unavailableByRoomType[room.room_type_id] = closedNights(room.nights);
    unitsLeftByRoomType[room.room_type_id] = Object.fromEntries(room.nights.map((n) => [n.date, n.units_left ?? 0]));
  }
  const slots: ListingSlot[] | undefined = a.slots
    ?.filter((s) => !s.is_cancelled)
    .map((s) => ({
      id: s.id,
      date: algiersDate(s.starts_at),
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      seatsTotal: s.seats_total,
      seatsLeft: s.seats_left,
      price: dzd(s.price),
    }));
  let unavailable = closedNights(a.nights ?? []);
  if (slots) {
    // Experiences: every day without an open session with seats left is closed.
    const open = new Set(slots.filter((s) => s.seatsLeft > 0).map((s) => s.date));
    unavailable = [];
    for (let d = new Date(`${a.today}T00:00:00Z`); d.toISOString().slice(0, 10) < a.to; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!open.has(key)) unavailable.push(key);
    }
  }
  return {
    today: a.today,
    unavailable,
    unavailableByRoomType,
    unitsLeftByRoomType,
    priceByRoomType,
    slots,
    until: a.to,
  };
}

interface ApiCalendarDay {
  date: string;
  is_blocked: boolean;
  price: ApiMoney | null;
  price_override: ApiMoney | null;
  note: string | null;
  units_total: number | null;
  units_booked: number | null;
  units_held: number | null;
  booking_ids: string[];
}

/** GET /host/calendar (CalendarResponseSerializer). */
export interface ApiHostCalendar {
  from: string;
  to: string;
  results: { listing_id: string; room_type_id: string | null; days: ApiCalendarDay[] }[];
}

/**
 * Host calendar rows -> the override list the host screens use: one entry per
 * day that is blocked or has a special price (other days follow the listing).
 */
export function toOverrides(calendar: ApiHostCalendar): DateAvailabilityOverride[] {
  const out: DateAvailabilityOverride[] = [];
  for (const row of calendar.results) {
    for (const day of row.days) {
      if (!day.is_blocked && !day.price_override) continue;
      out.push({
        id: `${row.listing_id}_${row.room_type_id ?? "all"}_${day.date}`,
        listingId: row.listing_id,
        roomTypeId: row.room_type_id,
        date: day.date,
        isBlocked: day.is_blocked,
        customPrice: day.price_override ? dzd(day.price_override) : undefined,
        note: day.note ?? undefined,
        unitsBooked: day.units_booked ?? undefined,
        unitsTotal: day.units_total ?? undefined,
      });
    }
  }
  return out;
}
