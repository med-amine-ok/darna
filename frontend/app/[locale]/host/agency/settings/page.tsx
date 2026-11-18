import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { requireHostContext } from "@/lib/server/host-context";
import AgencySettingsClient from "@/components/host/AgencySettingsClient";
import { api } from "@/lib/api/client";

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

  // The booking approval mode is a setting of the host account (GET /host/account).
  const account = await api<{ default_approval_mode?: "instant" | "request" }>("/host/account").catch(() => null);
  const organization = { ...ctx.organization, bookingApprovalMode: account?.default_approval_mode ?? ctx.organization.bookingApprovalMode };

  return (
    <AgencySettingsClient
      organization={organization}
      currentUser={ctx.user}
      currentRole={ctx.membership?.role ?? null}
    />
  );
}
