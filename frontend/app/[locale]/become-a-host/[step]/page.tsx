import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { getHostContext } from "@/lib/server/host-context";
import BecomeHostFlow from "@/components/host/BecomeHostFlow";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "becomeHost");
}

export default async function BecomeHostStepPage({
  params,
}: {
  params: { locale: string; step: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/become-a-host/${params.step}`);
  }

  // Existing hosts add listings from host mode ("Create a listing"), not from
  // the onboarding wizard: old links to /become-a-host/<n> land there.
  if (/^\d+$/.test(params.step)) {
    const ctx = await getHostContext();
    if (ctx && (!ctx.isOrgHost || ctx.organization)) redirect(`/${locale}/host/listings/new`);
  }

  return <BecomeHostFlow initialStep={params.step} currentUserId={currentUser.id} />;
}
