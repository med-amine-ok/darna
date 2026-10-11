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
  const currentUser = await getCurrentUser();
  if (currentUser?.hostType !== "agency" || !currentUser?.organizationId) {
    redirect(`/${locale}/host`);
  }

  const orgId = currentUser!.organizationId!;
  const organization = await getOrganizationById(orgId);

  if (!organization) {
    redirect(`/${locale}/host`);
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
