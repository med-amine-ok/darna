import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById, getOrganizations, createOrganization } from "@/lib/data/organizations";
import AgencySettingsClient from "@/components/host/AgencySettingsClient";

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
  const cookieHostType = cookieStore.get("darna_host_type")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/host`);
  }

  const effectiveHostType = currentUser.hostType || cookieHostType;

  // Solo hosts do not have an agency settings page; redirect to their host settings
  if (effectiveHostType !== "agency") {
    redirect(`/${locale}/host/settings`);
  }

  let orgId = currentUser?.organizationId || cookieAgencyId;
  let organization = orgId ? await getOrganizationById(orgId) : null;

  if (!organization && currentUser) {
    const allOrgs = await getOrganizations();
    organization = allOrgs.find((o) => o.ownerUserId === currentUser.id) || null;
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
  }

  return (
    <AgencySettingsClient
      organization={organization}
      currentUser={currentUser}
    />
  );
}
