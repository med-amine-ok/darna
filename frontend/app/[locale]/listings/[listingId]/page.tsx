import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { localeAlternates, OG_LOCALE } from "@/lib/site";
import { getListings, getPublicListingById } from "@/lib/data/listings";
import { getUserById } from "@/lib/data/auth";
import { getOrganizationById } from "@/lib/data/organizations";
import { orgProfileHref, userProfileHref, type HostProfileLink } from "@/lib/host-profile";
import { getSessionUser } from "@/lib/server/session";
import { getHostContext } from "@/lib/server/host-context";
import { hostOwnsListing } from "@/lib/server/authz";
import { toPublicUser } from "@/lib/server/dto";
import { getReviewsByListingId } from "@/lib/data/reviews";
import { getListingAvailability } from "@/lib/data/reservations";
import { priceOverridesFor } from "@/lib/data/calendar";
import ListingClient from "@/components/listing/ListingClient";

export const dynamic = "force-dynamic";

interface ListingPageProps {
  params: {
    locale: string;
    listingId: string;
  };
}

function excerpt(text: string | undefined, max = 160): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({ params: { locale, listingId } }: ListingPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "listing" });
  // Public projection only: drafts/suspended listings are never described to crawlers.
  const listing = await getPublicListingById(listingId);
  if (!listing) {
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
  // Drafts / suspended listings are only visible to their owner.
  const hostCtx = await getHostContext();
  const listing = await getPublicListingById(params.listingId, (l) => Boolean(hostCtx && hostOwnsListing(hostCtx, l)));

  if (!listing) {
    notFound();
  }

  const currentUser = await getSessionUser();
  const hostRecord = listing.hostUserId ? await getUserById(listing.hostUserId) : null;
  // Public projection only: no email / phone / address in client props.
  const host = hostRecord ? toPublicUser(hostRecord) : null;
  // Who offers the listing, linked to the profile page of its host category.
  const organization = listing.organizationId ? await getOrganizationById(listing.organizationId) : null;
  const hostProfile: HostProfileLink | null = organization
    ? { kind: organization.businessCategory, name: organization.name, image: null, href: orgProfileHref(organization) }
    : host
      ? { kind: "individual", name: host.name || "", image: host.image, href: userProfileHref(host.id) }
      : null;
  const reviews = await getReviewsByListingId(listing.id);

  // Booked + host-blocked nights and per-date prices, built server-side.
  const availability = await getListingAvailability(listing);
  const priceOverrides = listing.roomTypes && listing.roomTypes.length > 0 ? {} : priceOverridesFor(listing.id);

  // Fetch similar listings in same vertical/wilaya
  const allInVertical = await getListings({ vertical: listing.category });
  const similarListings = allInVertical
    .filter((l) => l.id !== listing.id)
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
        availability={availability}
        priceOverrides={priceOverrides}
      />
    </div>
  );
}
