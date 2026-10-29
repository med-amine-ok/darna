import { guardPage } from "@/lib/auth/page-guard";
import BookingsClient from "./BookingsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("bookings");

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const denied = await guardPage("bookings.view");
  if (denied) return denied;

  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  const vertical = typeof searchParams.vertical === "string" ? searchParams.vertical : "all";

  // BookingsClient loads its rows through the listBookings server action
  // (permission-checked); the page no longer fetches data it would discard.
  return (
    <BookingsClient
      initialStatus={status}
      initialVertical={vertical}
    />
  );
}
