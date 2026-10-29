import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { requireHostContext } from "@/lib/server/host-context";
import { getOrganizationMembers } from "@/lib/data/organizations";
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

  const members = await getOrganizationMembers(ctx.organization.id);

  return (
    <AgencyTeamClient
      organization={ctx.organization}
      initialMembers={members}
      currentUser={ctx.user}
      currentRole={ctx.membership?.role ?? null}
    />
  );
}
