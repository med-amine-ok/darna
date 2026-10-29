import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { requireHostContext, hostOwnerKey } from "@/lib/server/host-context";
import { getReservations } from "@/lib/data/reservations";
import { getHostListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import HostTodayClient from "@/components/host/HostTodayClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "today");
}

export default async function HostTodayPage({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const ctx = await requireHostContext(locale);

  // Solo hosts use simplified 2-page interface centered on Listings & Bookings
  if (!ctx.isOrgHost) {
    redirect(`/${locale}/host/listings`);
  }

  // Everything is scoped to the host's own organization.
  const owner = hostOwnerKey(ctx);
  const [reservations, listings, reviews] = await Promise.all([
    getReservations({ hostId: owner.userId, organizationId: owner.organizationId }),
    getHostListings(owner),
    getReviewsByUserId(ctx.user.id),
  ]);

  return (
    <HostTodayClient
      currentUser={ctx.user}
      organization={ctx.organization}
      initialReservations={reservations}
      listings={listings}
      reviews={reviews}
    />
  );
}
