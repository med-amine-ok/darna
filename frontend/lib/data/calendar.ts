import "server-only";
import type { DateAvailabilityOverride } from "@/types";
import { api } from "@/lib/api/client";
import { toMinor } from "@/lib/api/bookings";
import { toOverrides, type ApiHostCalendar } from "@/lib/api/calendar";
import { addDaysToKey, todayKey, type DateKey } from "@/lib/booking/dates";
import type { PriceOverrides } from "@/lib/booking/pricing";

/**
 * Host calendars from the Django API (backend apps/inventory): blocked days
 * and special prices per listing (and per room type for hotels and hostels).
 * The backend checks that the listing belongs to the active workspace.
 */

/** Window the host screens load: one month back, one year ahead (the API allows 400 days). */
const PAST_DAYS = 31;
const FUTURE_DAYS = 365;
/** The API takes at most 50 listing ids per call. */
const MAX_IDS = 50;

async function hostCalendar(listingIds: string[]): Promise<DateAvailabilityOverride[]> {
  if (listingIds.length === 0) return [];
  const today = todayKey();
  const from = addDaysToKey(today, -PAST_DAYS);
  const to = addDaysToKey(today, FUTURE_DAYS);
  const out: DateAvailabilityOverride[] = [];
  for (let i = 0; i < listingIds.length; i += MAX_IDS) {
    const answer = await api<ApiHostCalendar>("/host/calendar", {
      query: { listing_ids: listingIds.slice(i, i + MAX_IDS), from, to },
    });
    out.push(...toOverrides(answer));
  }
  return out;
}

/** Blocked days and special prices of one of the host's listings. Throws on API failure. */
export async function getAvailabilityOverrides(listingId: string): Promise<DateAvailabilityOverride[]> {
  return hostCalendar([listingId]);
}

/** Blocked days and special prices of several of the host's listings. Never throws (logs, returns []). */
export async function getOverridesForListings(listingIds: string[]): Promise<DateAvailabilityOverride[]> {
  try {
    return await hostCalendar(listingIds);
  } catch (error) {
    console.error("[getOverridesForListings]", error);
    return [];
  }
}

export interface CalendarTarget {
  listingId: string;
  /** Room types of a hotel or hostel listing; their nights are edited one room type at a time. */
  roomTypeIds?: string[];
}

function roomTargets(target: CalendarTarget): (string | null)[] {
  return target.roomTypeIds && target.roomTypeIds.length > 0 ? target.roomTypeIds : [null];
}

/** Close or reopen days (PUT /host/listings/{id}/calendar/blocks). Throws ApiError (409 dates_booked...). */
export async function setDatesBlocked(target: CalendarTarget, dates: DateKey[], blocked: boolean): Promise<DateAvailabilityOverride[]> {
  for (const roomTypeId of roomTargets(target)) {
    await api(`/host/listings/${encodeURIComponent(target.listingId)}/calendar/blocks`, {
      method: "PUT",
      body: { dates, blocked, ...(roomTypeId ? { room_type_id: roomTypeId } : {}) },
    });
  }
  return getAvailabilityOverrides(target.listingId);
}

/** Set (DZD) or remove (`null`) a special price (PUT /host/listings/{id}/calendar/prices). */
export async function setDatePrice(target: CalendarTarget, dates: DateKey[], price: number | null): Promise<DateAvailabilityOverride[]> {
  for (const roomTypeId of roomTargets(target)) {
    await api(`/host/listings/${encodeURIComponent(target.listingId)}/calendar/prices`, {
      method: "PUT",
      body: {
        dates,
        price_override: price === null ? null : { amount_minor: toMinor(price), currency: "DZD" },
        ...(roomTypeId ? { room_type_id: roomTypeId } : {}),
      },
    });
  }
  return getAvailabilityOverrides(target.listingId);
}
