import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getReservations } from "@/lib/data/reservations";
import { getHostListings } from "@/lib/data/listings";
import HostBookingsClient from "@/components/host/HostBookingsClient";

export const dynamic = "force-dynamic";

export default async function HostBookingsPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const hostId = currentUser?.id || "usr_amina";
  const orgId = currentUser?.organizationId || cookieAgencyId;

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
