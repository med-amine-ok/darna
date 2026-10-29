/**
 * Reservation lifecycle transitions that depend only on the clock (pure,
 * client-safe). The server applies them lazily whenever reservations are
 * read (lib/data/reservations.ts), so no background job is needed:
 *  - pending past `expiresAt`        -> expired (payment voided)
 *  - confirmed past checkout / end   -> completed
 */
import type { Reservation, ReservationStatus } from "@/types";
import { STAY_RULE_DEFAULTS } from "./config";
import { hasCheckInPassed } from "./cancellation";

export function isRequestExpired(res: Pick<Reservation, "status" | "expiresAt">, now: Date = new Date()): boolean {
  if (res.status !== "pending" || !res.expiresAt) return false;
  const t = Date.parse(res.expiresAt);
  return Number.isFinite(t) && t <= now.getTime();
}

/** Stay over: checkout time on the end date has passed (trips: the last day is over). */
export function isStayOver(
  res: Pick<Reservation, "endDate" | "tripId">,
  checkOutTime: string | undefined,
  now: Date = new Date()
): boolean {
  if (res.tripId) return hasCheckInPassed(res.endDate, "23:59", now);
  return hasCheckInPassed(res.endDate, checkOutTime || STAY_RULE_DEFAULTS.checkOutTime, now);
}

/** Status after applying time-based transitions. */
export function effectiveStatus(
  res: Pick<Reservation, "status" | "expiresAt" | "endDate" | "tripId">,
  checkOutTime?: string,
  now: Date = new Date()
): ReservationStatus {
  if (isRequestExpired(res, now)) return "expired";
  if (res.status === "confirmed" && isStayOver(res, checkOutTime, now)) return "completed";
  return res.status;
}

/** Statuses that hold inventory (block dates / seats). */
export function holdsInventory(res: Pick<Reservation, "status" | "expiresAt">, now: Date = new Date()): boolean {
  if (res.status === "confirmed") return true;
  return res.status === "pending" && !isRequestExpired(res, now);
}
