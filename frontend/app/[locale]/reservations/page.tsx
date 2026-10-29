import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getSessionUser } from "@/lib/server/session";
import { getHostContext, hostOwnerKey } from "@/lib/server/host-context";
import { getReservations } from "@/lib/data/reservations";
import { getHostListings } from "@/lib/data/listings";
import ReservationsClient from "@/components/reservations/ReservationsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "reservations" });
  return { title: t("meta.title"), robots: { index: false, follow: false } };
}

/** Host-side reservations: only bookings on the host's own listings/trips. */
export default async function ReservationsPage({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/reservations`);
  }

  const ctx = await getHostContext();
  if (!ctx) {
    // Guests see their own bookings on /trips.
    redirect(`/${locale}/trips`);
  }
  if (ctx.isOrgHost && !ctx.organization) {
    redirect(`/${locale}/become-a-host/${ctx.hostType}`);
  }

  const owner = hostOwnerKey(ctx);
  const [reservations, listings] = await Promise.all([
    getReservations({ hostId: owner.userId, organizationId: owner.organizationId }),
    getHostListings(owner),
  ]);

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <ReservationsClient initialReservations={reservations} listings={listings} />
      </Container>
    </div>
  );
}
