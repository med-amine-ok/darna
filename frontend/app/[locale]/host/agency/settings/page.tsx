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
  const currentUser = await getCurrentUser();
  if (currentUser?.hostType !== "agency" || !currentUser?.organizationId) {
    redirect(`/${locale}/host`);
  }

  const orgId = currentUser!.organizationId!;
  const organization = await getOrganizationById(orgId);

  if (!organization) {
    redirect(`/${locale}/host`);
  }

  return (
    <AgencySettingsClient
      organization={organization!}
      currentUser={currentUser}
    />
  );
}
