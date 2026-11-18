import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/server/session";
import { AccountPage } from "@/components/profile/AccountShell";
import { loadGuestReservations } from "@/lib/data/reservations";
import { Banner } from "@/components/ui";
import TripsClient from "@/components/trips/TripsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "trips" });
  return { title: t("meta.title"), robots: { index: false, follow: false } };
}

export default async function TripsPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/trips`);
  }

  const [{ data: reservations, failed }, t, tc] = await Promise.all([
    loadGuestReservations(currentUser.id),
    getTranslations({ locale, namespace: "trips" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <AccountPage eyebrow={t("eyebrow")} title={t("pageTitle")} subtitle={t("pageSubtitle")}>
      {failed && (
        <Banner tone="danger" title={tc("dataLoadFailedTitle")} className="mb-6">
          {tc("dataLoadFailedBody")}
        </Banner>
      )}
      <TripsClient initialReservations={reservations} />
    </AccountPage>
  );
}
