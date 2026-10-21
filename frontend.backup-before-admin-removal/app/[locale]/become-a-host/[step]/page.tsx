import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/auth";
import BecomeHostFlow from "@/components/host/BecomeHostFlow";

export const dynamic = "force-dynamic";

export default async function BecomeHostStepPage({
  params,
}: {
  params: { locale: string; step: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/become-a-host/${params.step}`);
  }

  return <BecomeHostFlow initialStep={params.step} />;
}
