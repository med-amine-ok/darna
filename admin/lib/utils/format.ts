// Centralized formatting for DZD amounts, numbers, and dates.
// In Arabic, Latin digits (1, 2, 3...) are the standard convention across Algerian commerce and banking.

export function formatDzd(amount: number, locale: string = "fr"): string {
  const rounded = Math.round(amount);
  const formattedNumber = new Intl.NumberFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "fr" ? "fr-DZ" : "en-DZ", {
    maximumFractionDigits: 0,
    numberingSystem: "latn",
  }).format(rounded);

  if (locale === "ar") {
    return `${formattedNumber} د.ج`;
  }
  return `${formattedNumber} DZD`;
}

export function formatNumber(value: number, locale: string = "fr"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "fr" ? "fr-DZ" : "en-DZ", {
    numberingSystem: "latn",
  }).format(value);
}

export function formatPercent(value: number, locale: string = "fr"): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string | Date | undefined, locale: string = "fr"): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "fr" ? "fr-DZ" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    numberingSystem: "latn",
  }).format(d);
}

export function formatDateTime(dateStr: string | Date | undefined, locale: string = "fr"): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "fr" ? "fr-DZ" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  }).format(d);
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return String(num);
}
