import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getHostListings } from "@/lib/data/listings";
import { getReservations } from "@/lib/data/reservations";
import HostCalendarClient from "@/components/host/HostCalendarClient";

export const dynamic = "force-dynamic";

export default async function HostCalendarPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const hostId = currentUser?.id || "usr_amina";
  const orgId = currentUser?.organizationId || cookieAgencyId;

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
