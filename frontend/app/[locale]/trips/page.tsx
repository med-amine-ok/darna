import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/server/session";
import Container from "@/components/Container";
import { getReservations } from "@/lib/data/reservations";
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

  const reservations = await getReservations({ userId: currentUser.id });

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <TripsClient initialReservations={reservations} />
      </Container>
    </div>
  );
}
