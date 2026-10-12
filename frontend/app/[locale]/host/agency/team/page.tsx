import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById, getOrganizationMembers, getOrganizations, createOrganization } from "@/lib/data/organizations";
import AgencyTeamClient from "@/components/host/AgencyTeamClient";

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
  const cookieHostType = cookieStore.get("darna_host_type")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/host`);
  }

  const effectiveHostType = currentUser.hostType || cookieHostType;

  // Solo hosts do not have an agency or team page
  if (effectiveHostType !== "agency") {
    redirect(`/${locale}/host`);
  }

  let orgId = currentUser?.organizationId || cookieAgencyId;
  let organization = orgId ? await getOrganizationById(orgId) : null;

  if (!organization && currentUser) {
    const allOrgs = await getOrganizations();
    organization = allOrgs.find((o) => o.ownerUserId === currentUser.id) || null;
    if (organization) {
      orgId = organization.id;
    }
  }

  if (!organization) {
    const allOrgs = await getOrganizations();
    organization = allOrgs[0] || (await createOrganization({
      name: "Atlas Escapes Voyages SARL",
      businessRegistrationNumber: "DZ-ALG-2024-B-08921",
      businessType: "Licensed Tourism Agency",
      businessEmail: "contact@atlasescapes.dz",
      businessPhone: "+213 21 69 45 12",
      ownerUserId: currentUser?.id || "usr_amina",
      verificationStatus: "verified",
    }));
    orgId = organization.id;
  }

  const members = await getOrganizationMembers(orgId!);

  return (
    <AgencyTeamClient
      organization={organization}
      initialMembers={members}
      currentUser={currentUser}
    />
  );
}
