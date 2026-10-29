import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import ChangeRequestsClient from "@/components/management/ChangeRequestsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("trips_bookingrequests");

export default async function TripBookingRequestsPage() {
  const denied = await guardPage("bookings.view");
  if (denied) return denied;
  const t = await getTranslations("trips");

  return (
    <ChangeRequestsClient
      title={t("bookingRequestsPage.title")}
      subtitle={t("bookingRequestsPage.subtitle")}
      backRoute="/trips"
    />
  );
}
