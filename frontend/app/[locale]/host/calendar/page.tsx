import { getCurrentUser } from "@/lib/data/auth";
import { getHostListings } from "@/lib/data/listings";
import { getReservations } from "@/lib/data/reservations";
import HostCalendarClient from "@/components/host/HostCalendarClient";

export default async function HostCalendarPage() {
  const currentUser = await getCurrentUser();
  const hostId = currentUser?.id || "usr_amina";
  const orgId = currentUser?.organizationId || undefined;

  const [hostListings, reservations] = await Promise.all([
    getHostListings(orgId || hostId),
    getReservations({ hostId, organizationId: orgId }),
  ]);

  return (
    <HostCalendarClient
      hostListings={hostListings}
      reservations={reservations}
      currentUser={currentUser}
    />
  );
}
