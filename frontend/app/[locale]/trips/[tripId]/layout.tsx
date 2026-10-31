import { notFound } from "next/navigation";
import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";
import { getPublicTripById } from "@/lib/data/trips";
import { getHostContext } from "@/lib/server/host-context";
import { hostOwnsTrip } from "@/lib/server/authz";

/**
 * Existence check above the loading.tsx Suspense boundary: a missing (or draft) trip
 * calls notFound() before anything streams, so the response keeps its 404 status.
 */
export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string; tripId: string };
}) {
  const hostCtx = await getHostContext();
  const trip = await getPublicTripById(params.tripId, (t) => Boolean(hostCtx && hostOwnsTrip(hostCtx, t)));
  if (!trip) notFound();
  return <ScopedIntlProvider scope="tripDetail">{children}</ScopedIntlProvider>;
}
