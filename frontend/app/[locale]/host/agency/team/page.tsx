import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById, getOrganizationMembers } from "@/lib/data/organizations";
import AgencyTeamClient from "@/components/host/AgencyTeamClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgencyTeamPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const orgId = currentUser?.organizationId || cookieAgencyId;

  if (!orgId) {
    redirect(`/${locale}/host`);
  }

  const organization = await getOrganizationById(orgId);

  if (!organization) {
    redirect(`/${locale}/host`);
  }

  const members = await getOrganizationMembers(orgId);

  return (
    <AgencyTeamClient
      organization={organization}
      initialMembers={members}
      currentUser={currentUser}
    />
  );
}
