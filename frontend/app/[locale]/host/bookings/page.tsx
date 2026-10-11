import { getCurrentUser } from "@/lib/data/auth";
import { getReservations } from "@/lib/data/reservations";
import { getHostListings } from "@/lib/data/listings";
import HostBookingsClient from "@/components/host/HostBookingsClient";

export default async function HostBookingsPage() {
  const currentUser = await getCurrentUser();
  const hostId = currentUser?.id || "usr_amina";
  const orgId = currentUser?.organizationId || undefined;

  const [reservations, hostListings] = await Promise.all([
    getReservations({ hostId, organizationId: orgId }),
    getHostListings(orgId || hostId),
  ]);

  return (
    <HostBookingsClient
      initialReservations={reservations}
      hostListings={hostListings}
      currentUser={currentUser}
    />
  );
}
