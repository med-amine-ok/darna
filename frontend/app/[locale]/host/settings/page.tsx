import { hostPageMetadata } from "@/components/host/hostMetadata";
import { requireHostContext } from "@/lib/server/host-context";
import HostSettingsClient from "@/components/host/HostSettingsClient";
import { loadHostAccount } from "@/lib/api/host-account";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "settings");
}

export default async function HostSettingsPage({ params }: { params: { locale: string } }) {
  const ctx = await requireHostContext(params?.locale || "en", "/host/settings");
  const account = await loadHostAccount();
  return (
    <HostSettingsClient
      currentUser={{ ...ctx.user, hostType: ctx.hostType }}
      organization={ctx.organization}
      account={account}
    />
  );
}
