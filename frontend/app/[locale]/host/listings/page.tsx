import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getHostListings } from "@/lib/data/listings";
import HostListingsClient from "@/components/host/HostListingsClient";

export const dynamic = "force-dynamic";

export default async function HostListingsPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const orgId = currentUser?.organizationId || cookieAgencyId;
  const hostId = currentUser?.id || "usr_amina";

  const listings = await getHostListings(orgId || hostId);

  return (
    <HostListingsClient
      initialListings={listings}
      currentUser={currentUser}
    />
  );
}
