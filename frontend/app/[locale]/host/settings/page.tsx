import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import HostSettingsClient from "@/components/host/HostSettingsClient";

export default async function HostSettingsPage() {
  const currentUser = await getCurrentUser();
  const organization = currentUser?.organizationId
    ? await getOrganizationById(currentUser.organizationId)
    : null;

  return (
    <HostSettingsClient
      currentUser={currentUser}
      organization={organization}
    />
  );
}
