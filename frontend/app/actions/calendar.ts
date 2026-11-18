"use server";

import { revalidatePath } from "next/cache";
import type { DateAvailabilityOverride } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getHostContext } from "@/lib/server/host-context";
import { getSessionUser } from "@/lib/server/session";
import { bookingFail } from "@/lib/api/bookings";
import { getListingById } from "@/lib/data/listings";
import { setDatePrice, setDatesBlocked, type CalendarTarget } from "@/lib/data/calendar";
import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import { isDateKey, nightsBetween, eachNightKey, addDaysToKey, todayKey } from "@/lib/booking/dates";

/**
 * Host calendar actions. The backend checks that the listing belongs to the
 * active workspace and that the member may manage the calendar (403/404).
 */

const MAX_DATES_PER_CALL = 366;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts either an explicit list of dates or an inclusive [from, to] range. */
function cleanDates(input: { dates?: unknown; from?: unknown; to?: unknown }): string[] | null {
  let dates: string[] = [];
  if (Array.isArray(input.dates)) {
    dates = input.dates.filter(isDateKey);
    if (dates.length !== input.dates.length) return null;
  } else if (isDateKey(input.from) && isDateKey(input.to)) {
    if (input.to < input.from || nightsBetween(input.from, input.to) >= MAX_DATES_PER_CALL) return null;
    dates = eachNightKey(input.from, addDaysToKey(input.to, 1));
  } else {
    return null;
  }
  const unique = Array.from(new Set(dates)).sort();
  return unique.length > 0 && unique.length <= MAX_DATES_PER_CALL ? unique : null;
}

/** The calendar target: the listing, and for hotels and hostels the room type(s) to edit. */
async function target(listingId: unknown, roomTypeId: unknown): Promise<{ target: CalendarTarget } | { error: ActionResult<never> }> {
  if (!(await getHostContext())) {
    return { error: actionFail((await getSessionUser()) ? "FORBIDDEN" : "UNAUTHENTICATED") };
  }
  if (typeof listingId !== "string" || !UUID.test(listingId)) return { error: actionFail("NOT_FOUND") };
  if (typeof roomTypeId === "string" && UUID.test(roomTypeId)) {
    return { target: { listingId, roomTypeIds: [roomTypeId] } };
  }
  // Without a room type, a hotel or hostel edits every room type of the listing.
  const listing = await getListingById(listingId).catch(() => null);
  const roomTypeIds = (listing?.roomTypes ?? []).map((r) => r.id).filter((id) => UUID.test(id));
  return { target: { listingId, roomTypeIds } };
}

/** Owner blocks or reopens dates on one of their listings. */
export async function setListingDatesBlockedAction(input: {
  listingId: string;
  roomTypeId?: string;
  dates?: string[];
  from?: string;
  to?: string;
  blocked: boolean;
}): Promise<ActionResult<DateAvailabilityOverride[]>> {
  const dates = cleanDates(input ?? {});
  if (!dates || typeof input.blocked !== "boolean") return actionFail("INVALID_DATES");
  if (input.blocked && dates.some((d) => d < todayKey())) return actionFail("PAST_DATES_LOCKED");
  const resolved = await target(input.listingId, input.roomTypeId);
  if ("error" in resolved) return resolved.error;
  try {
    const overrides = await setDatesBlocked(resolved.target, dates, input.blocked);
    revalidatePath("/", "layout");
    return actionOk(overrides);
  } catch (error) {
    return bookingFail(error, "setListingDatesBlockedAction");
  }
}

/** Owner sets (or clears with `price: null`) a nightly price for specific dates. */
export async function setListingDatePriceAction(input: {
  listingId: string;
  roomTypeId?: string;
  dates?: string[];
  from?: string;
  to?: string;
  price: number | null;
}): Promise<ActionResult<DateAvailabilityOverride[]>> {
  const dates = cleanDates(input ?? {});
  if (!dates) return actionFail("INVALID_DATES");
  if (input.price !== null && !isValidPriceDzd(input.price)) {
    return actionFail("PRICE_RANGE", { min: PRICE_MIN_DZD, max: PRICE_MAX_DZD });
  }
  const resolved = await target(input.listingId, input.roomTypeId);
  if ("error" in resolved) return resolved.error;
  // One price for several room types would overwrite their own rates: hotels pick one room type.
  if ((resolved.target.roomTypeIds?.length ?? 0) > 1) return actionFail("ROOM_TYPE_DATE_PRICES_UNSUPPORTED");
  try {
    const overrides = await setDatePrice(resolved.target, dates, input.price);
    revalidatePath("/", "layout");
    return actionOk(overrides);
  } catch (error) {
    return bookingFail(error, "setListingDatePriceAction");
  }
}
