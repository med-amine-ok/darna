import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import BecomeHostFlow from "@/components/host/BecomeHostFlow";
import { loadFlowConfigs, loadLatestDraft } from "@/lib/api/onboarding";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "becomeHost");
}

export default async function BecomeHostRootPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/become-a-host`);
  }

  // The published flows and the saved draft come from the API; the flow falls back to its local copy.
  const [flowSteps, initialDraft] = await Promise.all([loadFlowConfigs(), loadLatestDraft()]);
  return (
    <BecomeHostFlow initialStep="0" currentUserId={currentUser.id} flowSteps={flowSteps} initialDraft={initialDraft} />
  );
}
