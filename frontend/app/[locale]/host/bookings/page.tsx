import { hostPageMetadata } from "@/components/host/hostMetadata";
import { requireHostContext, hostOwnerKey } from "@/lib/server/host-context";
import { getReservations } from "@/lib/data/reservations";
import { getHostListings } from "@/lib/data/listings";
import { getOverridesForListings } from "@/lib/data/calendar";
import HostBookingsClient from "@/components/host/HostBookingsClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "bookings");
}

export default async function HostBookingsPage({ params }: { params: { locale: string } }) {
  const ctx = await requireHostContext(params?.locale || "en", "/host/bookings");
  const owner = hostOwnerKey(ctx);

  const [reservations, hostListings] = await Promise.all([
    getReservations({ hostId: owner.userId, organizationId: owner.organizationId }),
    getHostListings(owner),
  ]);

  const blockedByListing: Record<string, string[]> = {};
  for (const o of await getOverridesForListings(hostListings.map((l) => l.id))) {
    if (o.isBlocked) (blockedByListing[o.listingId] ||= []).push(o.date);
  }

  return (
    <HostBookingsClient
      blockedByListing={blockedByListing}
      initialReservations={reservations}
      hostListings={hostListings}
      currentUser={{ ...ctx.user, hostType: ctx.hostType }}
    />
  );
}
