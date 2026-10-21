import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getHostListings, getListings } from "@/lib/data/listings";
import { getReservations } from "@/lib/data/reservations";
import HostCalendarClient from "@/components/host/HostCalendarClient";

export const dynamic = "force-dynamic";

export default async function HostCalendarPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const cookieHostType = cookieStore.get("darna_host_type")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const effectiveHostType = currentUser?.hostType || cookieHostType;
  const isAgency = effectiveHostType === "agency";

  const hostId = currentUser?.id || "usr_amina";
  const orgId = isAgency ? (currentUser?.organizationId || cookieAgencyId) : undefined;

  let [userListings, reservations] = await Promise.all([
    getHostListings(orgId || hostId),
    getReservations({ hostId, organizationId: orgId }),
  ]);

  if (!userListings || userListings.length === 0) {
    const allListings = await getListings();
    userListings = allListings.slice(0, 3);
  }

  return (
    <HostCalendarClient
      hostListings={userListings}
      reservations={reservations}
      currentUser={currentUser}
    />
  );
}
