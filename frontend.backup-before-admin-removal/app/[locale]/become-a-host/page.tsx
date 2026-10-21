import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/auth";
import BecomeHostFlow from "@/components/host/BecomeHostFlow";

export const dynamic = "force-dynamic";

export default async function BecomeHostRootPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/become-a-host`);
  }

  return <BecomeHostFlow initialStep="0" />;
}
