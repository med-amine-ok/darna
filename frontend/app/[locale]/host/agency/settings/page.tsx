import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { requireHostContext } from "@/lib/server/host-context";
import AgencySettingsClient from "@/components/host/AgencySettingsClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "agencySettings");
}

export default async function AgencySettingsPage({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const ctx = await requireHostContext(locale, "/host/agency/settings");

  // Solo hosts do not have an organization settings page
  if (!ctx.isOrgHost || !ctx.organization) {
    redirect(`/${locale}/host/settings`);
  }

  return (
    <AgencySettingsClient
      organization={ctx.organization}
      currentUser={ctx.user}
      currentRole={ctx.membership?.role ?? null}
    />
  );
}
