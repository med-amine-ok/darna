import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { localeAlternates, OG_LOCALE } from "@/lib/site";
import { cache } from "react";
import { getListings, getPublicAvailability, getPublicListingById } from "@/lib/data/listings";
import { ORG_PROFILE_PATH, userProfileHref, type HostProfileLink } from "@/lib/host-profile";
import { getSessionUser } from "@/lib/server/session";
import { getHostContext } from "@/lib/server/host-context";
import { hostOwnsListing } from "@/lib/server/authz";
import { getPublicProfile, toPublicUserFromApi } from "@/lib/api/people";
import { getReviewsByListingId } from "@/lib/data/reviews";
import ListingClient from "@/components/listing/ListingClient";

export const dynamic = "force-dynamic";

interface ListingPageProps {
  params: {
    locale: string;
    listingId: string;
  };
}

// Draft or paused listings are only visible to their owner. Cached so metadata and page share one lookup.
const loadListing = cache(async (listingId: string) => {
  const hostCtx = await getHostContext();
  return getPublicListingById(listingId, (l) => Boolean(hostCtx && hostOwnsListing(hostCtx, l)));
});

function excerpt(text: string | undefined, max = 160): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({ params: { locale, listingId } }: ListingPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "listing" });
  // Public projection only: drafts/suspended listings are never described to crawlers.
  const listing = await loadListing(listingId);
  if (!listing || listing.status !== "active") {
    return { title: t("meta.notFoundTitle"), robots: { index: false, follow: false } };
  }
  const title = listing.city
    ? t("meta.titleWithCity", { title: listing.title, city: listing.city })
    : listing.title;
  const description = excerpt(listing.description) || t("meta.fallbackDescription", { title: listing.title });
  const images = (Array.isArray(listing.imageSrc) ? listing.imageSrc : [listing.imageSrc]).filter(Boolean);
  const path = `/listings/${listing.id}`;
  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      type: "website",
      title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale] ?? "en_US",
      images: images.length > 0 ? [{ url: images[0], alt: listing.title }] : undefined,
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      images: images.length > 0 ? [images[0]] : undefined,
    },
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const listing = await loadListing(params.listingId);

  if (!listing) {
    notFound();
  }

  // Who offers the listing (public card of the API), linked to the public page of its host category.
  const [currentUser, profile, reviews, calendar, sameVertical] = await Promise.all([
    getSessionUser(),
    listing.ownerType === "individual" && listing.hostUserId ? getPublicProfile(listing.hostUserId) : Promise.resolve(null),
    getReviewsByListingId(listing.id),
    getPublicAvailability(listing),
    getListings({ vertical: listing.category, limit: 12 }),
  ]);
  // Public projection only: no email / phone / address in client props.
  const host = profile ? toPublicUserFromApi(profile) : null;
  const orgCategory = listing.businessCategory;
  const hostProfile: HostProfileLink | null =
    listing.ownerType === "organization" && orgCategory && listing.organizationSlug
      ? {
          kind: orgCategory,
          name: listing.hostName || "",
          image: null,
          href: `${ORG_PROFILE_PATH[orgCategory]}/${encodeURIComponent(listing.organizationSlug)}`,
        }
      : host
        ? { kind: "individual", name: host.name || "", image: host.image, href: userProfileHref(host.id, host.handle) }
        : null;

  // Similar listings: same vertical, same wilaya first.
  const similarListings = sameVertical
    .filter((l) => l.id !== listing.id)
    .sort((a, b) => Number(b.wilayaCode === listing.wilayaCode) - Number(a.wilayaCode === listing.wilayaCode))
    .slice(0, 4);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-darnaBg">
      {/* Complete Listing Client with Gallery, Info, Map & Booking Widget */}
      <ListingClient
        listing={listing}
        host={host}
        hostProfile={hostProfile}
        reviews={reviews}
        similarListings={similarListings}
        currentUser={currentUser}
        availability={calendar.availability}
        priceOverrides={listing.roomTypes && listing.roomTypes.length > 0 ? {} : calendar.priceOverrides}
      />
    </div>
  );
}
