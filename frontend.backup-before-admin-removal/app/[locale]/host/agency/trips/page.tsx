import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import { getTrips } from "@/lib/data/trips";
import { redirect } from "next/navigation";
import AgencyTripsClient from "@/components/host/agency/AgencyTripsClient";

export const dynamic = "force-dynamic";

export default async function AgencyTripsPage({
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

  // Enforce Agency Exclusivity: Non-agency hosts are not permitted
  if (effectiveHostType !== "agency") {
    redirect(`/${locale}/host/listings`);
  }

  const orgId = currentUser?.organizationId || cookieAgencyId || "org_atlas_escapes";
  const [organization, trips] = await Promise.all([
    getOrganizationById(orgId),
    getTrips({ organizationId: orgId, status: "all" }),
  ]);

  return (
    <AgencyTripsClient
      initialTrips={trips}
      currentUser={currentUser}
      organization={organization}
    />
  );
}
