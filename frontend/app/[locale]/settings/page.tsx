import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getSessionUser } from "@/lib/server/session";
import SettingsClient from "@/components/settings/SettingsClient";

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

  return (
    <div className="min-h-screen bg-bg-light/40 py-8">
      <Container>
        <SettingsClient currentUser={currentUser} />
      </Container>
    </div>
  );
}
