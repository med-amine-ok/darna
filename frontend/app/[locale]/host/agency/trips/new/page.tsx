import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { requireHostContext } from "@/lib/server/host-context";
import TripCreationClient from "@/components/host/agency/TripCreationClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "newTrip");
}

export default async function NewTripPage({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const ctx = await requireHostContext(locale, "/host/agency/trips/new");

  if (ctx.hostType !== "agency" || !ctx.organization) {
    redirect(`/${locale}/host/listings`);
  }

  return <TripCreationClient currentUser={ctx.user} organization={ctx.organization} />;
}
