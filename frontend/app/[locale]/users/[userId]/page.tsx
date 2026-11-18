import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicListingsByHost } from "@/lib/data/listings";
import { getReviewsByUserId } from "@/lib/data/reviews";
import { getSessionUser } from "@/lib/server/session";
import { loadPublicProfile, toPublicUserFromApi } from "@/lib/api/people";
import { formatDate } from "@/lib/i18n/date-locale";
import { OG_LOCALE, localeAlternates } from "@/lib/site";
import UserProfileClient from "@/components/profile/UserProfileClient";

export const dynamic = "force-dynamic";

interface UserPageProps {
  params: { userId: string; locale: string };
}

// Shared by generateMetadata and the page so the user is fetched once per request.
const loadUser = (id: string) => loadPublicProfile(decodeURIComponent(id));

function excerpt(text: string | undefined, max = 160) {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { locale, userId } = params;
  const t = await getTranslations({ locale, namespace: "profile" });
  if (userId === "me" || userId === "current") {
    return { title: t("metaTitle"), robots: { index: false } };
  }

  const user = await loadUser(userId);
  if (!user) {
    return { title: t("page.metaTitleFallback"), robots: { index: false } };
  }

  // Only public fields (name, bio, avatar) are exposed in metadata.
  const publicUser = toPublicUserFromApi(user);
  // One canonical address per person: their handle (ACC-06), so shared links and search engines agree.
  const path = `/users/${encodeURIComponent(publicUser.handle || publicUser.id)}`;
  const title = publicUser.name;
  const description =
    excerpt(publicUser.bio) ||
    t("page.metaDescription", {
      name: publicUser.name,
      year: formatDate(publicUser.createdAt, locale, { year: "numeric" }),
    });
  const images = publicUser.image
    ? [{ url: publicUser.image, alt: t("page.avatarAlt", { name: publicUser.name }) }]
    : undefined;

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
      type: "profile",
      images,
    },
    twitter: { card: "summary", title, description, images: publicUser.image ? [publicUser.image] : undefined },
  };
}

export default async function UserPublicProfilePage({ params }: UserPageProps) {
  const locale = params?.locale || "en";
  const currentUser = await getSessionUser();

  // "/users/me" is the owner's own profile: requires login, no fallback user.
  if (params.userId === "me" || params.userId === "current") {
    if (!currentUser) {
      redirect(`/${locale}/login?callbackUrl=/${locale}/profile`);
    }
    redirect(`/${locale}/profile`);
  }

  const user = await loadUser(params.userId);
  if (!user) {
    notFound();
  }

  const isOwner = currentUser?.id === user.id;
  const [listings, reviews] = await Promise.all([getPublicListingsByHost({ userId: user.id }), getReviewsByUserId(user.id)]);
  // Organisations the person belongs to (hotel, hostel or agency), each with its own public page (by slug).
  const businesses = (user.organizations ?? [])
    .filter((o) => o.role === "owner" && (o.business_category === "agency" || o.business_category === "hotel" || o.business_category === "hostel"))
    .map((o) => ({ id: o.slug, name: o.display_name, businessCategory: o.business_category as "agency" | "hotel" | "hostel" }));

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <UserProfileClient
          // Owners get their full record; everyone else only the public projection.
          user={isOwner && currentUser ? currentUser : toPublicUserFromApi(user)}
          listings={listings}
          businesses={businesses}
          reviews={reviews}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
