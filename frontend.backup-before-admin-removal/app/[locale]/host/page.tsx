import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import { getReservations } from "@/lib/data/reservations";
import { getHostListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import HostTodayClient from "@/components/host/HostTodayClient";

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HostTodayPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const cookieHostType = cookieStore.get("darna_host_type")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const effectiveHostType = currentUser?.hostType || cookieHostType;

  // Solo hosts use simplified 2-page interface centered on Listings & Bookings
  if (effectiveHostType === "individual") {
    redirect(`/${locale}/host/listings`);
  }
  const isOrgHost = effectiveHostType === "agency" || effectiveHostType === "hotel" || effectiveHostType === "hostel";

  const orgId = isOrgHost ? (currentUser?.organizationId || cookieAgencyId) : null;
  const organization = orgId ? await getOrganizationById(orgId) : null;

  const reservations = await getReservations();
  const hostId = (isOrgHost && orgId) ? orgId : (currentUser?.id || "usr_amina");
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
