import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { getNotifications } from "@/lib/data/notifications";
import NotificationsClient from "@/components/notifications/NotificationsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "notifications" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function NotificationsPage({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();
  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/notifications`);
  }

  const notifications = await getNotifications(currentUser.id);

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <NotificationsClient initialNotifications={notifications} />
      </div>
    </div>
  );
}
