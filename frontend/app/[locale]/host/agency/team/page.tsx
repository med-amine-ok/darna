import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById, getOrganizationMembers } from "@/lib/data/organizations";
import AgencyTeamClient from "@/components/host/AgencyTeamClient";
import { redirect } from "@/navigation";

export default async function AgencyTeamPage() {
  const currentUser = await getCurrentUser();
  const orgId = currentUser?.organizationId || "org_atlas_escapes";

  const organization = await getOrganizationById(orgId);

  if (!organization) {
    redirect("/host");
  }

  const members = await getOrganizationMembers(orgId);

  return (
    <AgencyTeamClient
      organization={organization!}
      initialMembers={members}
      currentUser={currentUser}
    />
  );
}
