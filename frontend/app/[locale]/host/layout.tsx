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
  const currentUser = await getCurrentUser(cookieUserId);

  // 1. Not authenticated -> Redirect to login
  if (!currentUser) {
    redirect(`/${locale}/login`);
    return null;
  }

  // 2. hostType is unset / null -> Redirect to host-type selection screen (Step 0 / Step 2)
  if (!currentUser.hostType) {
    redirect(`/${locale}/become-a-host`);
    return null;
  }

  // 3. Individual Host Guard: User must have at least one completed/published listing
  if (currentUser.hostType === "individual") {
    const userListings = await getHostListings(currentUser.id);
    if (!userListings || userListings.length === 0) {
      redirect(`/${locale}/become-a-host/1`);
      return null;
    }
  }

  // 4. Agency Host Guard: User must have a completed, registered Organization record with verification status
  if (currentUser.hostType === "agency") {
    let organization = currentUser.organizationId
      ? await getOrganizationById(currentUser.organizationId)
      : null;

    if (!organization) {
      const allOrgs = await getOrganizations();
      organization = allOrgs.find((o) => o.ownerUserId === currentUser.id) || null;
    }

    if (!organization || !organization.verificationStatus) {
      redirect(`/${locale}/become-a-host/agency`);
      return null;
    }
  }

  // Relevant flow is genuinely complete -> Render Host workspace layout
  const organization = currentUser.organizationId
    ? await getOrganizationById(currentUser.organizationId)
    : null;

  return (
    <div className="min-h-screen bg-bg-light/40 flex flex-col">
      <HostNavbar currentUser={currentUser} organization={organization} />
      <div className="flex-1 pb-20 md:pb-12">{children}</div>
      <HostBottomNav />
    </div>
  );
}
