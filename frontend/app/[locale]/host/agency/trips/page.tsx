import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { requireHostContext } from "@/lib/server/host-context";
import { getTrips } from "@/lib/data/trips";
import AgencyTripsClient from "@/components/host/agency/AgencyTripsClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "agencyTrips");
}

export default async function AgencyTripsPage({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const ctx = await requireHostContext(locale, "/host/agency/trips");

  // Trips are an agency-only product
  if (ctx.hostType !== "agency" || !ctx.organization) {
    redirect(`/${locale}/host/listings`);
  }

  const trips = await getTrips({ organizationId: ctx.organization.id, status: "all" });

  return <AgencyTripsClient initialTrips={trips} currentUser={ctx.user} organization={ctx.organization} />;
}
