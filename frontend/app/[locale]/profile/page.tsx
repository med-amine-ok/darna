import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSessionUser } from "@/lib/server/session";
import { getHostListings } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import UserProfileClient from "@/components/profile/UserProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "profile" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function ProfilePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/profile`);
  }

  // The owner sees all of their own listings, drafts included.
  const userListings = await getHostListings({ userId: currentUser.id });
  const reviews = await getReviewsByUserId(currentUser.id);

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <UserProfileClient
          user={currentUser}
          listings={userListings}
          reviews={reviews}
          isOwner={true}
        />
      </Container>
    </div>
  );
}
