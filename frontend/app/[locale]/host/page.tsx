import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import { getReservations } from "@/lib/data/reservations";
import { getListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import HostTodayClient from "@/components/host/HostTodayClient";

export const dynamic = "force-dynamic";

export default async function HostTodayPage() {
  const currentUser = await getCurrentUser();
  const organization = currentUser?.organizationId
    ? await getOrganizationById(currentUser.organizationId)
    : null;

  const reservations = await getReservations();
  const listings = await getListings();
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
