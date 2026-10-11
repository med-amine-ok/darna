import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import AgencySettingsClient from "@/components/host/AgencySettingsClient";
import { redirect } from "@/navigation";

export default async function AgencySettingsPage() {
  const currentUser = await getCurrentUser();
  const orgId = currentUser?.organizationId || "org_atlas_escapes";

  const organization = await getOrganizationById(orgId);

  if (!organization) {
    redirect("/host");
  }

  return (
    <AgencySettingsClient
      organization={organization!}
      currentUser={currentUser}
    />
  );
}
