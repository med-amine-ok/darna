/**
 * Calendar-date helpers for bookings (pure, client-safe).
 *
 * Stay dates are stored and exchanged as plain `yyyy-MM-dd` strings ("date
 * keys"), never as ISO timestamps, so a 15 Nov check-in stays 15 Nov in
 * every timezone (Algeria is UTC+1; `toISOString()` used to shift it to the
 * 14th). Keys compare correctly as strings, and stays are half-open
 * intervals [checkIn, checkOut): the checkout day is free for the next guest.
 */
import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

export type DateKey = string;

/** Business timezone used to decide what "today" is. */
export const BUSINESS_TIME_ZONE = "Africa/Algiers";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) return false;
  const d = parseISO(value);
  return isValid(d) && format(d, "yyyy-MM-dd") === value;
}

/** Local calendar day of a Date as a key (no UTC conversion). */
export function toDateKey(date: Date): DateKey {
  return format(startOfDay(date), "yyyy-MM-dd");
}

/** Key -> local-midnight Date (parseISO treats date-only strings as local). */
export function fromDateKey(key: DateKey): Date {
  return startOfDay(parseISO(key));
}

/**
 * Accepts a date key or a legacy ISO timestamp / Date and returns a key.
 * Legacy timestamps are read as the calendar day in Algeria.
 */
export function normalizeDateKey(value: unknown): DateKey | null {
  if (value instanceof Date) return isValid(value) ? toDateKey(value) : null;
  if (typeof value !== "string" || value.length > 40) return null;
  if (isDateKey(value)) return value;
  const d = parseISO(value);
  if (!isValid(d)) return null;
  return dateKeyInBusinessZone(d);
}

/** Calendar day of an instant in Algeria (used for "today" and legacy timestamps). */
export function dateKeyInBusinessZone(instant: Date = new Date()): DateKey {
  // en-CA formats as yyyy-MM-dd.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Today's date in Algeria. */
export function todayKey(now: Date = new Date()): DateKey {
  return dateKeyInBusinessZone(now);
}

export function addDaysToKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), days));
}

/** Number of nights (or rental days) between two keys. */
export function nightsBetween(start: DateKey, end: DateKey): number {
  return differenceInCalendarDays(fromDateKey(end), fromDateKey(start));
}

/** Every night of a stay: [start, end), the checkout day is not included. */
export function eachNightKey(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = nightsBetween(start, end);
  for (let i = 0; i < n && i < 3660; i++) out.push(addDaysToKey(start, i));
  return out;
}

/** Half-open overlap: back-to-back stays (A.end === B.start) do not overlap. */
export function rangesOverlap(
  aStart: DateKey,
  aEnd: DateKey,
  bStart: DateKey,
  bEnd: DateKey,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Locale-aware display of a date key, e.g. "Nov 15, 2026" / "15 nov. 2026". */
export function formatDateKey(
  key: string | null | undefined,
  locale: string = "en",
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  if (!key) return "";
  const normalized = normalizeDateKey(key);
  if (!normalized) return key;
  const intlLocale =
    locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, options).format(
    fromDateKey(normalized),
  );
}

/** "Nov 15 – Nov 20, 2026" style range. */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  locale = "en",
): string {
  if (!start) return "";
  if (!end || end === start) return formatDateKey(start, locale);
  return `${formatDateKey(start, locale)} – ${formatDateKey(end, locale)}`;
}
