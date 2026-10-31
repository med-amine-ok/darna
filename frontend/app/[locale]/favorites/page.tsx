import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountPage } from "@/components/profile/AccountShell";
import { getFavoriteListings } from "@/lib/data/favorites";
import { getSessionUser } from "@/lib/server/session";
import FavoritesClient from "@/components/favorites/FavoritesClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "favorites" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function FavoritesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/favorites`);
  }

  const [listings, t, tNav] = await Promise.all([
    getFavoriteListings(currentUser.id),
    getTranslations({ locale, namespace: "favorites" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);

  return (
    <AccountPage width="wide" eyebrow={t("eyebrow")} title={tNav("myFavorites")} subtitle={t("pageSubtitle")}>
      <FavoritesClient initialListings={listings} currentUser={currentUser} />
    </AccountPage>
  );
}
