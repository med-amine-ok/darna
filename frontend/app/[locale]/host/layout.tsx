import { getCurrentUser } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import HostNavbar from "@/components/host/HostNavbar";
import HostBottomNav from "@/components/host/HostBottomNav";

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  const organization = currentUser?.organizationId
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
