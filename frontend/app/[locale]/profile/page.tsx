import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
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
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <UserProfileClient
          user={currentUser}
          listings={userListings}
          reviews={reviews}
          isOwner={true}
        />
      </div>
    </div>
  );
}
