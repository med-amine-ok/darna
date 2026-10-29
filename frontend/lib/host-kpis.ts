/**
 * Host dashboard KPIs computed from the host's own reservations and listings
 * (pure, client-safe). Nothing here is a placeholder: when there is no data
 * the functions return null and the UI hides the figure.
 */
import type { Listing, Reservation } from "@/types";
import { addDaysToKey, eachNightKey, nightsBetween, type DateKey } from "@/lib/booking/dates";
import { roomTypeInventory } from "@/lib/booking/pricing";

export type KpiPeriod = "month" | "30days" | "year";

export interface DateWindow {
  /** Inclusive first day. */
  start: DateKey;
  /** Exclusive end (tomorrow for current windows). */
  end: DateKey;
}

const EARNING_STATUSES = new Set<Reservation["status"]>(["confirmed", "completed"]);

/** Current window for the period and the window of the same length right before it. */
export function periodWindows(period: KpiPeriod, today: DateKey): { current: DateWindow; previous: DateWindow } {
  const end = addDaysToKey(today, 1);
  const start =
    period === "month" ? `${today.slice(0, 8)}01` : period === "year" ? `${today.slice(0, 5)}01-01` : addDaysToKey(today, -29);
  const length = nightsBetween(start, end);
  return {
    current: { start, end },
    previous: { start: addDaysToKey(start, -length), end: start },
  };
}

const inWindow = (key: string, w: DateWindow) => key >= w.start && key < w.end;

/** Gross booking value of confirmed / completed stays starting in the window. */
export function grossEarnings(reservations: Reservation[], w: DateWindow): number {
  return reservations
    .filter((r) => EARNING_STATUSES.has(r.status) && inWindow(r.startDate, w))
    .reduce((sum, r) => sum + r.totalPrice, 0);
}

/** Relative change vs. the previous window; null when there is nothing to compare with. */
export function earningsChange(reservations: Reservation[], period: KpiPeriod, today: DateKey): number | null {
  const { current, previous } = periodWindows(period, today);
  const before = grossEarnings(reservations, previous);
  if (before <= 0) return null;
  return (grossEarnings(reservations, current) - before) / before;
}

/**
 * Booked nights / available nights in the window across the host's bookable
 * listings (homes and vehicles; per-room inventory counts each unit).
 */
export function occupancy(
  reservations: Reservation[],
  listings: Listing[],
  w: DateWindow
): { booked: number; available: number; rate: number } | null {
  const bookable = listings.filter((l) => l.category !== "experience" && l.category !== "trip" && l.status !== "draft");
  const units = bookable.reduce(
    (sum, l) =>
      sum +
      (l.roomTypes && l.roomTypes.length > 0
        ? l.roomTypes.reduce((n, r) => n + roomTypeInventory(r), 0)
        : 1),
    0
  );
  const days = nightsBetween(w.start, w.end);
  const available = units * days;
  if (available <= 0) return null;
  const ids = new Set(bookable.map((l) => l.id));
  let booked = 0;
  for (const r of reservations) {
    if (!EARNING_STATUSES.has(r.status) || r.tripId || !ids.has(r.listingId)) continue;
    const nights = eachNightKey(r.startDate, r.endDate).filter((n) => inWindow(n, w)).length;
    booked += nights * Math.max(1, r.unitCount ?? 1);
  }
  booked = Math.min(booked, available);
  return { booked, available, rate: booked / available };
}
