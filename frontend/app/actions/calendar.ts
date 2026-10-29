"use server";

import { revalidatePath } from "next/cache";
import type { DateAvailabilityOverride } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getHostContext } from "@/lib/server/host-context";
import { hostOwnsListing } from "@/lib/server/authz";
import { getListingById } from "@/lib/data/listings";
import { setDatePrice, setDatesBlocked } from "@/lib/data/calendar";
import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import { isDateKey, nightsBetween, eachNightKey, addDaysToKey, todayKey } from "@/lib/booking/dates";

const MAX_DATES_PER_CALL = 366;

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
  const unique = Array.from(new Set(dates));
  return unique.length > 0 && unique.length <= MAX_DATES_PER_CALL ? unique : null;
}

async function ownedListing(listingId: unknown) {
  const ctx = await getHostContext();
  if (!ctx) return { error: actionFail<DateAvailabilityOverride[]>("UNAUTHENTICATED") };
  const listing = typeof listingId === "string" ? await getListingById(listingId) : null;
  if (!listing || !hostOwnsListing(ctx, listing)) return { error: actionFail<DateAvailabilityOverride[]>("NOT_FOUND") };
  return { listing };
}

/** Owner blocks or reopens dates on one of their listings. */
export async function setListingDatesBlockedAction(input: {
  listingId: string;
  dates?: string[];
  from?: string;
  to?: string;
  blocked: boolean;
}): Promise<ActionResult<DateAvailabilityOverride[]>> {
  const { listing, error } = await ownedListing(input?.listingId);
  if (error) return error;
  const dates = cleanDates(input);
  if (!dates || typeof input.blocked !== "boolean") return actionFail("INVALID_DATES");
  const today = todayKey();
  if (dates.some((d) => d < today)) return actionFail("PAST_DATES_LOCKED");

  const overrides = await setDatesBlocked(listing!.id, dates, input.blocked);
  revalidatePath("/", "layout");
  return actionOk(overrides);
}

/** Owner sets (or clears with `price: null`) a nightly price for specific dates. */
export async function setListingDatePriceAction(input: {
  listingId: string;
  dates?: string[];
  from?: string;
  to?: string;
  price: number | null;
}): Promise<ActionResult<DateAvailabilityOverride[]>> {
  const { listing, error } = await ownedListing(input?.listingId);
  if (error) return error;
  const dates = cleanDates(input);
  if (!dates) return actionFail("INVALID_DATES");
  if (input.price !== null && !isValidPriceDzd(input.price)) {
    return actionFail("PRICE_RANGE", { min: PRICE_MIN_DZD, max: PRICE_MAX_DZD });
  }
  if (listing!.roomTypes && listing!.roomTypes.length > 0) {
    return actionFail("ROOM_TYPE_DATE_PRICES_UNSUPPORTED");
  }

  const overrides = await setDatePrice(listing!.id, dates, input.price);
  revalidatePath("/", "layout");
  return actionOk(overrides);
}
