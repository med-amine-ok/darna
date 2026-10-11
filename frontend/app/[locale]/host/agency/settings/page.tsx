import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import AgencySettingsClient from "@/components/host/AgencySettingsClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgencySettingsPage({
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

  return (
    <AgencySettingsClient
      organization={organization}
      currentUser={currentUser}
    />
  );
}
