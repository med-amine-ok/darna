import HostLayoutShell from "@/components/host/HostLayoutShell";
import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";
import { requireHostContext } from "@/lib/server/host-context";
import { getMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Host workspace guard. Identity, host type and organization all come from
 * the verified session and the API (never from plain cookies). This layout
 * never creates data. Every real host gets the workspace, even with zero
 * listings: pages show empty states with a "Create your first listing" call
 * to action (/host/listings/new). Only non-hosts and org hosts whose
 * organization doesn't exist yet are sent to onboarding.
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

  // Workspaces this user can act for (switcher in the host menu): the solo host
  // account and every organisation, straight from GET /me/workspaces.
  const bundle = await getMe().catch(() => null);
  const activeId = bundle?.workspaces.find((w) => w.is_active)?.host_account_id ?? bundle?.workspaces[0]?.host_account_id;
  const workspaces = (bundle?.workspaces ?? []).map((w) => ({
    id: w.host_account_id,
    name: w.display_name,
    businessCategory: w.host_type ?? undefined,
    isActive: w.host_account_id === activeId,
  }));

  return (
    <ScopedIntlProvider scope="host">
      <HostLayoutShell
        currentUser={ctx.user}
        organization={ctx.organization}
        hostType={ctx.hostType}
        workspaces={workspaces}
      >
        {children}
      </HostLayoutShell>
    </ScopedIntlProvider>
  );
}
