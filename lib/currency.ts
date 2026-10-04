export const DEFAULT_EUR_TO_DZD = 152.47;

/**
 * Converts Algerian Dinar (DZD) amount into Euros (EUR) based on exchange rate.
 */
export function convertDzdToEur(dzdAmount: number, rate: number = DEFAULT_EUR_TO_DZD): number {
  if (!dzdAmount || isNaN(dzdAmount)) return 0;
  return Math.round(dzdAmount / rate);
}

/**
 * Converts Euros (EUR) amount into Algerian Dinar (DZD) based on exchange rate.
 */
export function convertEurToDzd(eurAmount: number, rate: number = DEFAULT_EUR_TO_DZD): number {
  if (!eurAmount || isNaN(eurAmount)) return 0;
  return Math.round(eurAmount * rate);
}

/**
 * Formats a number with standard thousand separators (e.g. 22 000 or 22,000).
 */
export function formatAmountNumber(amount: number, locale = "en"): string {
  if (!amount || isNaN(amount)) return "0";
  const normalizedLocale = locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-DZ" : "en-US";
  return new Intl.NumberFormat(normalizedLocale, {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Formats DZD currency string according to current locale:
 * Arabic: "22,000 د.ج"
 * French: "22 000 DZD"
 * English: "22,000 DZD"
 */
export function formatDzd(amount: number, locale = "en"): string {
  const formatted = formatAmountNumber(amount, locale);
  if (locale === "ar") {
    return `${formatted} د.ج`;
  }
  return `${formatted} DZD`;
}

/**
 * Formats EUR equivalent string (e.g. "~€144" or "≈ 144 €" in French/Arabic).
 */
export function formatEur(eurAmount: number, locale = "en"): string {
  const rounded = Math.round(eurAmount);
  if (locale === "fr") {
    return `≈ ${rounded} €`;
  }
  if (locale === "ar") {
    return `(≈ ${rounded} €)`;
  }
  return `~€${rounded}`;
}

/**
 * Formats full price text with primary DZD and small secondary Euro:
 * e.g. "22,000 DZD (~€144)"
 */
export function formatPriceWithEur(
  dzdAmount: number,
  rate: number = DEFAULT_EUR_TO_DZD,
  locale = "en"
): { dzd: string; eur: string; full: string } {
  const dzd = formatDzd(dzdAmount, locale);
  const eurVal = convertDzdToEur(dzdAmount, rate);
  const eur = formatEur(eurVal, locale);
  return {
    dzd,
    eur,
    full: `${dzd} (${eur})`,
  };
}
