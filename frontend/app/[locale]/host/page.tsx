import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import { getReservations } from "@/lib/data/reservations";
import { getHostListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import HostTodayClient from "@/components/host/HostTodayClient";

export const dynamic = "force-dynamic";

export default async function HostTodayPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const orgId = currentUser?.organizationId || cookieAgencyId;
  const organization = orgId ? await getOrganizationById(orgId) : null;

  const reservations = await getReservations();
  const hostId = orgId || currentUser?.id || "usr_amina";
  const listings = await getHostListings(hostId);
  const reviews = currentUser ? await getReviewsByUserId(currentUser.id) : [];

  return (
    <HostTodayClient
      currentUser={currentUser}
      organization={organization}
      initialReservations={reservations}
      listings={listings}
      reviews={reviews}
    />
  );
}
