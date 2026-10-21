import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getHostListings } from "@/lib/data/listings";
import HostListingsClient from "@/components/host/HostListingsClient";

export const dynamic = "force-dynamic";

export default async function HostListingsPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const cookieHostType = cookieStore.get("darna_host_type")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const effectiveHostType = currentUser?.hostType || cookieHostType;
  const isAgency = effectiveHostType === "agency";

  const orgId = isAgency ? (currentUser?.organizationId || cookieAgencyId) : null;
  const hostId = (isAgency && orgId) ? orgId : (currentUser?.id || "usr_amina");

  const listings = await getHostListings(hostId);

  const userForClient = currentUser
    ? { ...currentUser, hostType: (effectiveHostType || "individual") as any }
    : ({ id: hostId, hostType: (effectiveHostType || "individual") as any, name: "Host", email: "" } as any);

  return (
    <HostListingsClient
      initialListings={listings}
      currentUser={userForClient}
    />
  );
}
