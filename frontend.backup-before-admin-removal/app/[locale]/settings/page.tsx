import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getCurrentUser } from "@/lib/data/auth";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/settings`);
  }

  return (
    <div className="min-h-screen bg-bg-light/40 py-8">
      <Container>
        <SettingsClient currentUser={currentUser} />
      </Container>
    </div>
  );
}
