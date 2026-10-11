import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import HostSettingsClient from "@/components/host/HostSettingsClient";

export const dynamic = "force-dynamic";

export default async function HostSettingsPage() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  const orgId = currentUser?.organizationId || cookieAgencyId;
  const organization = orgId ? await getOrganizationById(orgId) : null;

  return (
    <HostSettingsClient
      currentUser={currentUser}
      organization={organization}
    />
  );
}
