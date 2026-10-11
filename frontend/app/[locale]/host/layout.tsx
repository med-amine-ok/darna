import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById, getOrganizations } from "@/lib/data/organizations";
import { getHostListings } from "@/lib/data/listings";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import HostNavbar from "@/components/host/HostNavbar";
import HostBottomNav from "@/components/host/HostBottomNav";

export const dynamic = "force-dynamic";

export default async function HostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const cookieHostType = cookieStore.get("darna_host_type")?.value;
  const cookieAgencyId = cookieStore.get("darna_agency_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  // 1. Not authenticated -> Redirect to login
  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/host`);
    return null;
  }

  const effectiveHostType = (currentUser.hostType || cookieHostType) as "individual" | "agency" | undefined;

  // 2. hostType is unset / null -> Redirect to host-type selection screen (Step 0)
  if (!effectiveHostType) {
    redirect(`/${locale}/become-a-host`);
    return null;
  }

  // Ensure currentUser reflects effective host type
  currentUser.hostType = effectiveHostType;

  // 3. Individual Host Guard: User must have at least one completed/published listing
  if (effectiveHostType === "individual") {
    const userListings = await getHostListings(currentUser.id);
    if (!userListings || userListings.length === 0) {
      redirect(`/${locale}/become-a-host/1`);
      return null;
    }
  }

  // 4. Agency Host Guard: User must have a completed, registered Organization record with verification status
  let organization = null;
  if (effectiveHostType === "agency") {
    if (currentUser.organizationId) {
      organization = await getOrganizationById(currentUser.organizationId);
    }
    if (!organization && cookieAgencyId) {
      organization = await getOrganizationById(cookieAgencyId);
      if (organization) {
        currentUser.organizationId = organization.id;
      }
    }
    if (!organization) {
      const allOrgs = await getOrganizations();
      organization = allOrgs.find((o) => o.ownerUserId === currentUser.id) || null;
      if (organization) {
        currentUser.organizationId = organization.id;
      }
    }

    if (!organization || !organization.verificationStatus) {
      redirect(`/${locale}/become-a-host/agency`);
      return null;
    }
  } else if (currentUser.organizationId) {
    organization = await getOrganizationById(currentUser.organizationId);
  }

  return (
    <div className="min-h-screen bg-bg-light/40 flex flex-col">
      <HostNavbar currentUser={currentUser} organization={organization} />
      <div className="flex-1 pb-20 md:pb-12">{children}</div>
      <HostBottomNav />
    </div>
  );
}
