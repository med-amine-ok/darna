import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { requireHostContext } from "@/lib/server/host-context";
import { getOrganizationInvitations, getOrganizationMembers } from "@/lib/data/organizations";
import { orgPermissions } from "@/lib/host-types";
import AgencyTeamClient from "@/components/host/AgencyTeamClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "agencyTeam");
}

export default async function AgencyTeamPage({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const ctx = await requireHostContext(locale, "/host/agency/team");

  // Solo hosts do not have an organization or team page
  if (!ctx.isOrgHost || !ctx.organization) {
    redirect(`/${locale}/host/listings`);
  }

  // Team from the API (active workspace). Invitations are visible to owners and admins only.
  const role = ctx.membership?.role ?? null;
  const [members, invitations] = await Promise.all([
    getOrganizationMembers(ctx.organization.id),
    orgPermissions.canInviteMembers(role) ? getOrganizationInvitations() : Promise.resolve([]),
  ]);

  return (
    <AgencyTeamClient
      organization={ctx.organization}
      initialMembers={members}
      initialInvitations={invitations}
      currentUser={ctx.user}
      currentRole={role}
    />
  );
}
