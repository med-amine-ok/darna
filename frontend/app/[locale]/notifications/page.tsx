import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
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
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <NotificationsClient initialNotifications={notifications} />
      </Container>
    </div>
  );
}
