import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/server/session";
import SettingsClient from "@/components/settings/SettingsClient";
import { getNotificationPreferences } from "@/lib/data/notifications";
import { getAuthProviders } from "@/lib/api/providers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "settings" });
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function SettingsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/settings`);
  }

  const [notificationPreferences, { phoneOtpRequired }] = await Promise.all([
    getNotificationPreferences().catch(() => null),
    getAuthProviders(),
  ]);

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <SettingsClient currentUser={currentUser} notificationPreferences={notificationPreferences} phoneOtpRequired={phoneOtpRequired} />
      </div>
    </div>
  );
}
