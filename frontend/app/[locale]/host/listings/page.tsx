import { getCurrentUser } from "@/lib/data/auth";
import { getHostListings } from "@/lib/data/listings";
import HostListingsClient from "@/components/host/HostListingsClient";

export default async function HostListingsPage() {
  const currentUser = await getCurrentUser();
  const hostId = currentUser?.id || "usr_amina";
  const orgId = currentUser?.organizationId || undefined;

  const listings = await getHostListings(orgId || hostId);

  return (
    <HostListingsClient
      initialListings={listings}
      currentUser={currentUser}
    />
  );
}
