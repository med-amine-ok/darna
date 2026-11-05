import HostLayoutShell from "@/components/host/HostLayoutShell";
import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";
import { requireHostContext } from "@/lib/server/host-context";
import { getMembershipsForUser, getOrganizationById } from "@/lib/data/organizations";

export const dynamic = "force-dynamic";

/**
 * Host workspace guard. Identity, host type and organization all come from
 * the verified session + server store (never from plain cookies). This layout
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

  // Organizations this user can act for (workspace switcher in the host menu).
  const memberships = ctx.user ? await getMembershipsForUser(ctx.user.id) : [];
  const workspaces = (await Promise.all(memberships.map((m) => getOrganizationById(m.organizationId))))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map((o) => ({ id: o.id, name: o.name, businessCategory: o.businessCategory }));

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
