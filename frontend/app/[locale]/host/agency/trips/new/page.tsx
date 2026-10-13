import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import { redirect } from "next/navigation";
import TripCreationClient from "@/components/host/agency/TripCreationClient";

export const dynamic = "force-dynamic";

export default async function NewTripPage({
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

  // Enforce Agency Exclusivity
  if (effectiveHostType !== "agency") {
    redirect(`/${locale}/host/listings`);
  }

  const orgId = currentUser?.organizationId || cookieAgencyId || "org_atlas_escapes";
  const organization = await getOrganizationById(orgId);

  return (
    <TripCreationClient
      currentUser={currentUser}
      organization={organization}
    />
  );
}
