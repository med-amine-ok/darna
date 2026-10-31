import type { Locale as DateFnsLocale } from "date-fns";
import enUS from "date-fns/locale/en-US";
import fr from "date-fns/locale/fr";
import arDZ from "date-fns/locale/ar-DZ";

/** BCP-47 tag for Intl APIs (numbers, dates) per app locale. */
export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-US";
}

/** date-fns locale per app locale; pass to format(), react-date-range, etc. */
export function dateFnsLocale(locale: string): DateFnsLocale {
  return locale === "ar" ? arDZ : locale === "fr" ? fr : enUS;
}

/** Locale-aware date formatting for Date objects or ISO strings. */
export function formatDate(
  value: Date | string | number | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "Africa/Algiers",
    ...options,
  }).format(date);
}

/** Locale-aware plain number formatting (counts, not money, use formatDzd for DZD). */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

/** Average rating ("4.9", "4,87" in fr), null when there is no rating yet (show "New" instead). */
export function formatRating(
  value: number | null | undefined,
  locale: string,
): string | null {
  return typeof value === "number" && value > 0
    ? formatNumber(value, locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })
    : null;
}
