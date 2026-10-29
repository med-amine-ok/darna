// TODO: replace with Supabase query
import "server-only";
import type { DateAvailabilityOverride } from "@/types";
import { newId } from "@/lib/ids";
import type { DateKey } from "@/lib/booking/dates";
import type { PriceOverrides } from "@/lib/booking/pricing";
import { clone, globalStore, removeWhere } from "./_store";

/**
 * Host calendar overrides: one row per (listing, date) with a blocked flag
 * and/or a custom nightly price. Callers (server actions) check ownership.
 */
const SEED_OVERRIDES: DateAvailabilityOverride[] = [
  { id: "ovr_01", listingId: "lst_tipaza_villa", date: "2026-11-24", isBlocked: true, note: "Host maintenance" },
  { id: "ovr_02", listingId: "lst_tipaza_villa", date: "2026-11-21", isBlocked: false, customPrice: 22000, note: "Peak weekend" },
  { id: "ovr_03", listingId: "lst_tipaza_villa", date: "2026-11-22", isBlocked: false, customPrice: 22000, note: "Peak weekend" },
];

const overridesTable = globalStore<DateAvailabilityOverride[]>("__darna_calendar_overrides__", () =>
  SEED_OVERRIDES.map(clone)
);

export async function getAvailabilityOverrides(listingId: string): Promise<DateAvailabilityOverride[]> {
  return clone(overridesTable.filter((ov) => ov.listingId === listingId));
}

export async function getOverridesForListings(listingIds: string[]): Promise<DateAvailabilityOverride[]> {
  const ids = new Set(listingIds);
  return clone(overridesTable.filter((ov) => ids.has(ov.listingId)));
}

/** Synchronous helpers for the booking engine (same request, no latency). */
export function blockedDateKeys(listingId: string): Set<DateKey> {
  return new Set(overridesTable.filter((o) => o.listingId === listingId && o.isBlocked).map((o) => o.date));
}

export function priceOverridesFor(listingId: string): PriceOverrides {
  const out: PriceOverrides = {};
  for (const o of overridesTable) {
    if (o.listingId === listingId && !o.isBlocked && typeof o.customPrice === "number") out[o.date] = o.customPrice;
  }
  return out;
}

function upsert(listingId: string, date: DateKey): DateAvailabilityOverride {
  let row = overridesTable.find((o) => o.listingId === listingId && o.date === date);
  if (!row) {
    row = { id: newId("ovr"), listingId, date, isBlocked: false };
    overridesTable.push(row);
  }
  return row;
}

function pruneEmpty(listingId: string) {
  removeWhere(overridesTable, (o) => o.listingId === listingId && !o.isBlocked && o.customPrice === undefined);
}

export async function setDatesBlocked(listingId: string, dates: DateKey[], blocked: boolean): Promise<DateAvailabilityOverride[]> {
  for (const date of dates) {
    const row = upsert(listingId, date);
    row.isBlocked = blocked;
  }
  pruneEmpty(listingId);
  return getAvailabilityOverrides(listingId);
}

/** `price: null` removes the override (back to the listing's standard price). */
export async function setDatePrice(listingId: string, dates: DateKey[], price: number | null): Promise<DateAvailabilityOverride[]> {
  for (const date of dates) {
    const row = upsert(listingId, date);
    if (price === null) delete row.customPrice;
    else row.customPrice = price;
  }
  pruneEmpty(listingId);
  return getAvailabilityOverrides(listingId);
}
