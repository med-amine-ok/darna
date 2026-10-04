import getCurrentUser from "@/app/actions/getCurrentUser";
import { getFavoriteListings, getListings, getReservations } from "@/lib/data";
import { mockCurrentUserStore } from "@/lib/mock-data";
import { getTranslations } from "next-intl/server";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "profile" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  const isDemo = !currentUser;
  const user = currentUser || mockCurrentUserStore;

  const [reservations, userListings, favorites] = await Promise.all([
    getReservations({ userId: user.id }),
    getListings({ userId: user.id }),
    getFavoriteListings(),
  ]);

  return (
    <ProfileClient
      currentUser={user}
      isDemo={isDemo}
      reservations={reservations}
      userListings={userListings}
      favorites={favorites}
    />
  );
}
