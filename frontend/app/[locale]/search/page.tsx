import { getSessionUser } from "@/lib/server/session";
import { getListings } from "@/lib/data/listings";
import { SearchParams } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeAlternates, OG_LOCALE } from "@/lib/site";
import SearchResultsClient from "@/components/search/SearchResultsClient";
import { matchesListing, matchesTrip, parseSideFilters, toFacet, toTripFacet, verticalOf } from "@/components/search/searchFacets";

import { getTrips } from "@/lib/data/trips";

interface SearchPageProps {
  params: { locale: string };
  searchParams: SearchParams & {
    instantBook?: string;
    isGuestFavorite?: string;
    propertyType?: string;
    amenities?: string;
    wilayas?: string;
    communes?: string;
    roomCount?: string;
    minRating?: string;
    duration?: string;
    months?: string;
  };
}

export async function generateMetadata({ params: { locale }, searchParams }: SearchPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "search" });
  const destination = searchParams.destination?.trim();
  const title = destination ? t("meta.titleIn", { place: destination }) : t("meta.title");
  // Only the bare /search page is indexable; filtered variations are noindex (canonical points to /search).
  const isFiltered = Object.values(searchParams || {}).some((v) => v !== undefined && v !== "");
  return {
    title,
    description: t("meta.description"),
    alternates: localeAlternates(locale, "/search"),
    openGraph: {
      title,
      description: t("meta.description"),
      locale: OG_LOCALE[locale] ?? "en_US",
      type: "website",
    },
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const filters = parseSideFilters((key) => (searchParams as Record<string, unknown>)[key]);
  const sideless = { ...searchParams, minPrice: undefined, maxPrice: undefined, propertyType: undefined, amenities: undefined };

  // The base search (destination, dates, guests, vertical) without the side filters: it is
  // the facet pool the sidebar counts from, and the results are that pool once filtered.
  // `allVerticals` is the same search across every category, for the category counts.
  const [currentUser, pool, allVerticals, baseTrips] = await Promise.all([
    getSessionUser(),
    getListings(sideless),
    searchParams.vertical ? getListings({ ...sideless, vertical: undefined }) : null,
    getTrips({ destination: searchParams.destination }),
  ]);

  const facets = pool.map(toFacet);
  const tripFacets = baseTrips.map(toTripFacet);
  const listings = pool.filter((_, i) => matchesListing(facets[i], filters));
  const trips = baseTrips.filter((_, i) => matchesTrip(tripFacets[i], filters));

  const categoryCounts: Record<string, number> = { all: 0, home: 0, hotel: 0, experience: 0, vehicle: 0, trip: baseTrips.length };
  for (const l of allVerticals ?? pool) {
    categoryCounts.all += 1;
    categoryCounts[verticalOf(l)] = (categoryCounts[verticalOf(l)] ?? 0) + 1;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-darnaBg">
      <SearchResultsClient
        listings={listings}
        trips={trips}
        currentUser={currentUser}
        destination={searchParams.destination}
        activeVertical={searchParams.vertical}
        facets={facets}
        tripFacets={tripFacets}
        categoryCounts={categoryCounts}
      />
    </div>
  );
}
