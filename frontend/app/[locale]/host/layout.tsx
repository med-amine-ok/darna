import { redirect } from "next/navigation";
import HostLayoutShell from "@/components/host/HostLayoutShell";
import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";
import { requireHostContext } from "@/lib/server/host-context";
import { getHostListings } from "@/lib/data/listings";

export const dynamic = "force-dynamic";

/**
 * Host workspace guard. Identity, host type and organization all come from
 * the verified session + server store (never from plain cookies). This layout
 * never creates data: incomplete hosts are sent to onboarding.
 */
export default async function HostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const ctx = await requireHostContext(locale);

  // Individual hosts need at least one listing before using the workspace.
  if (!ctx.isOrgHost) {
    const listings = await getHostListings({ userId: ctx.user.id });
    if (listings.length === 0) {
      redirect(`/${locale}/become-a-host/1`);
    }
  }

  return (
    <ScopedIntlProvider scope="host">
    <HostLayoutShell currentUser={ctx.user} organization={ctx.organization} hostType={ctx.hostType}>
      {children}
    </HostLayoutShell>
    </ScopedIntlProvider>
  );
}
