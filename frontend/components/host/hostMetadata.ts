import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export type HostPageKey =
  | "today"
  | "listings"
  | "bookings"
  | "calendar"
  | "messages"
  | "settings"
  | "agencySettings"
  | "agencyTeam"
  | "agencyTrips"
  | "newTrip"
  | "newListing"
  | "becomeHost";

/** Localized title for a private host page; never indexed. */
export async function hostPageMetadata(locale: string, page: HostPageKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "host.meta" });
  return {
    title: t(page),
    ...(page === "becomeHost" ? { description: t("becomeHostDescription") } : {}),
    robots: { index: false, follow: false },
  };
}
