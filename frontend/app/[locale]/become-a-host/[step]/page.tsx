import { hostPageMetadata } from "@/components/host/hostMetadata";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
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

  return <BecomeHostFlow initialStep={params.step} currentUserId={currentUser.id} />;
}
