import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicTripById } from "@/lib/data/trips";
import { seatsSoldByDeparture } from "@/lib/data/reservations";
import { getHostContext } from "@/lib/server/host-context";
import { hostOwnsTrip } from "@/lib/server/authz";
import { todayKey } from "@/lib/booking/dates";
import { getSessionUser } from "@/lib/server/session";
import { localeAlternates, OG_LOCALE } from "@/lib/site";
import TripDetailClient from "@/components/trips/TripDetailClient";

export const dynamic = "force-dynamic";

interface TripPageProps {
  params: {
    tripId: string;
    locale: string;
  };
}

// Draft trips are only visible to the owning agency. Cached so metadata and
// page share one lookup per request.
const loadTrip = cache(async (tripId: string) => {
  const hostCtx = await getHostContext();
  return getPublicTripById(tripId, (t) => Boolean(hostCtx && hostOwnsTrip(hostCtx, t)));
});

function excerpt(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({ params: { tripId, locale } }: TripPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "trips" });
  const trip = await loadTrip(tripId);
  if (!trip) {
    return { title: t("meta.notFoundTitle"), robots: { index: false } };
  }

  const description = excerpt(trip.description || t("meta.tripDescriptionFallback", { city: trip.city }));
  const path = `/trips/${trip.id}`;
  const images = trip.coverPhoto ? [{ url: trip.coverPhoto, alt: trip.title }] : undefined;

  return {
    title: trip.title,
    description,
    alternates: localeAlternates(locale, path),
    // Drafts are visible to their agency only; keep them out of search results.
    robots: trip.status === "active" ? undefined : { index: false },
    openGraph: {
      type: "website",
      title: trip.title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: trip.title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

export default async function TripDetailPage({ params }: TripPageProps) {
  const trip = await loadTrip(params.tripId);

  if (!trip) {
    notFound();
  }

  const currentUser = await getSessionUser();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-darnaBg">
      <TripDetailClient
        trip={trip}
        currentUser={currentUser}
        seatsSold={seatsSoldByDeparture(trip.id)}
        today={todayKey()}
      />
    </div>
  );
}
