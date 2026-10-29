import { format } from "date-fns";
import { dateFnsLocale } from "@/lib/i18n/date-locale";

/** Short day + month label for a calendar date ("Mar 4" / "4 mars" / "4 مارس"), in the user's local day. */
export function shortDayLabel(date: Date, locale: string): string {
  return format(date, locale === "en" ? "MMM d" : "d MMM", { locale: dateFnsLocale(locale) });
}
