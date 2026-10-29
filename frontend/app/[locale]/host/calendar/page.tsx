import { hostPageMetadata } from "@/components/host/hostMetadata";
import { requireHostContext, hostOwnerKey } from "@/lib/server/host-context";
import { getHostListings } from "@/lib/data/listings";
import { getReservations } from "@/lib/data/reservations";
import { getOverridesForListings } from "@/lib/data/calendar";
import HostCalendarClient from "@/components/host/HostCalendarClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "calendar");
}

export default async function HostCalendarPage({ params }: { params: { locale: string } }) {
  const ctx = await requireHostContext(params?.locale || "en", "/host/calendar");
  const owner = hostOwnerKey(ctx);

  const [hostListings, reservations] = await Promise.all([
    getHostListings(owner),
    getReservations({ hostId: owner.userId, organizationId: owner.organizationId }),
  ]);

  const overrides = await getOverridesForListings(hostListings.map((l) => l.id));

  return (
    <HostCalendarClient
      hostListings={hostListings}
      reservations={reservations}
      currentUser={ctx.user}
      overrides={overrides}
    />
  );
}
