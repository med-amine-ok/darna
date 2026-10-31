import { getSessionUser } from "@/lib/server/session";
import { getListings, getFeaturedListings } from "@/lib/data/listings";
import { getVehicles } from "@/lib/data/vehicles";
import { getExperiences } from "@/lib/data/experiences";
import { getTrips } from "@/lib/data/trips";
import { toCardListing, toCardTrip } from "@/lib/server/card-dto";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeAlternates, OG_LOCALE } from "@/lib/site";
import HomeHero from "@/components/home/HomeHero";
import ListingCarouselSection from "@/components/home/ListingCarouselSection";
import ListingCard from "@/components/listing/ListingCard";
import TripCard from "@/components/trips/TripCard";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import WilayaTiles from "@/components/home/WilayaTiles";
import TrustBand from "@/components/home/TrustBand";
import HostCta from "@/components/home/HostCta";
import { POPULAR_DESTINATIONS } from "@/components/search/destinations";
import { wilayaImagery } from "@/lib/imagery";

// Order of the "Explore by wilaya" bento (first = large feature tile); only keys with curated imagery.
const WILAYA_ORDER = ["djanet", "algiers", "constantine", "ghardaia", "oran", "taghit"];

interface HomePageProps {
  params: { locale: string };
  searchParams: {
    category?: string;
    vertical?: "home" | "experience" | "vehicle" | "trip";
    destination?: string;
  };
}

export async function generateMetadata({ params: { locale }, searchParams }: HomePageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "homeHero" });
  const isFiltered = Boolean(searchParams?.category || searchParams?.vertical || searchParams?.destination);
  return {
    title: { absolute: t("meta.title") },
    description: t("meta.description"),
    alternates: localeAlternates(locale, ""),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
      locale: OG_LOCALE[locale] ?? "en_US",
      type: "website",
    },
    // Filtered variations of the home feed are not separate pages for search engines.
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HomePage({ params: { locale }, searchParams }: HomePageProps) {
  // If a specific category chip is active
  const categoryFilter = searchParams?.category;

  // Independent reads run in parallel (sequential awaits put ~500 ms on time to first byte).
  const [t, currentUser, allListings, vehicleListings, experienceListings, featuredListings, agencyTrips] =
    await Promise.all([
      getTranslations({ locale, namespace: "homeHero" }),
      getSessionUser(),
      getListings({ destination: searchParams?.destination }),
      getVehicles(),
      getExperiences(),
      getFeaturedListings(),
      getTrips({ destination: searchParams?.destination }),
    ]);

  const homeListings = allListings.filter((l) => l.category === "home");
  const hotelAndHostelListings = allListings.filter(
    (l) => l.businessCategory === "hotel" || l.businessCategory === "hostel" || (l.roomTypes && l.roomTypes.length > 0)
  );

  // Filtered listings if category selected
  const filteredListings = categoryFilter
    ? allListings.filter(
        (l) =>
          l.type?.toLowerCase().includes(categoryFilter.toLowerCase()) ||
          l.amenities?.some((a) =>
            a.toLowerCase().includes(categoryFilter.toLowerCase())
          ) ||
          (categoryFilter === "Vehicles 4x4" && l.category === "vehicle") ||
          (categoryFilter === "Expeditions" && l.category === "experience") ||
          (categoryFilter === "Villas" && l.type === "Villa") ||
          (categoryFilter === "Beachfront" &&
            (l.amenities?.includes("sea_view") || l.city === "Tipaza" || l.city === "Oran")) ||
          (categoryFilter === "Desert & Sahara" &&
            (l.city === "Djanet" || l.city === "Taghit" || l.city === "Ghardaïa")) ||
          (categoryFilter === "Historic & Riads" &&
            (l.type === "Riad" || l.type === "Ksar" || l.type === "Heritage Home"))
      )
    : [];

  const isTripVertical = categoryFilter === "Trips & Circuits" || searchParams?.vertical === "trip";

  const normalize = (v?: string) => (v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const wilayaTiles = WILAYA_ORDER.filter((key) => wilayaImagery[key]).map((key) => {
    const dest = POPULAR_DESTINATIONS.find((d) => d.key === key);
    const count = dest ? allListings.filter((l) => normalize(l.city) === normalize(dest.name)).length : 0;
    return { key, count };
  });

  return (
    <div className="relative min-h-[100dvh] flex flex-col overflow-x-hidden">
      {/* Authentic Algerian Hero Section */}
      <HomeHero />

      {/* Main Feed Section */}
      <Container className="max-w-[1360px] lg:px-10 pt-4 pb-20 space-y-20 sm:space-y-28">
        {isTripVertical ? (
          /* Trips vertical grid view */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  {t("sections.tripsGridTitle")}
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  {t("sections.tripsGridCount", { count: agencyTrips.length })}
                </p>
              </div>
            </div>

            {agencyTrips.length === 0 ? (
              <EmptyState
                title={t("sections.noTrips")}
                subtitle={t("sections.noTripsDesc")}
                showReset
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {agencyTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    customHref={`/search?vertical=trip&selectedId=${trip.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : categoryFilter ? (
          /* When category filtered: Grid View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  {t("sections.categoryTitle", { category: categoryFilter })}
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  {t("sections.categoryCount", { count: filteredListings.length })}
                </p>
              </div>
            </div>

            {filteredListings.length === 0 ? (
              <EmptyState
                title={t("sections.noCategoryListings")}
                subtitle={t("sections.noCategoryListingsDesc")}
                showReset
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    data={listing}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default editorial feed */
          <>
            <ListingCarouselSection
              title={t("sections.homesTitle")}
              subtitle={t("sections.homesSubtitle")}
              badge={t("sections.homesBadge")}
              listings={homeListings.map(toCardListing)}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=home"
            />

            <WilayaTiles tiles={wilayaTiles} />

            <ListingCarouselSection
              title={t("sections.experiencesTitle")}
              subtitle={t("sections.experiencesSubtitle")}
              badge={t("sections.experiencesBadge")}
              listings={experienceListings.map(toCardListing)}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=experience"
            />

            {agencyTrips.length > 0 && (
              <section aria-labelledby="agency-trips-heading" className="space-y-7">
                <SectionHeader
                  id="agency-trips-heading"
                  eyebrow={t("sections.agencyBadge")}
                  title={t("sections.agencyTitle")}
                  subtitle={t("sections.agencySubtitle")}
                  href="/search?vertical=trip"
                  linkLabel={t("sections.browseAllCircuits")}
                />
                <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {agencyTrips.slice(0, 4).map((trip) => (
                    <RevealItem key={trip.id}>
                      <TripCard trip={toCardTrip(trip)} customHref={`/trips/${trip.slug || trip.id}`} />
                    </RevealItem>
                  ))}
                </RevealGroup>
              </section>
            )}

            {hotelAndHostelListings.length > 0 && (
              <ListingCarouselSection
                title={t("sections.hotelsTitle")}
                subtitle={t("sections.hotelsSubtitle")}
                badge={t("sections.hotelsBadge")}
                listings={hotelAndHostelListings.map(toCardListing)}
                currentUser={currentUser}
                viewMoreHref="/search?propertyType=Hotel"
              />
            )}

            <TrustBand />

            <ListingCarouselSection
              title={t("sections.vehiclesTitle")}
              subtitle={t("sections.vehiclesSubtitle")}
              badge={t("sections.vehiclesBadge")}
              listings={vehicleListings.map(toCardListing)}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=vehicle"
            />

            <ListingCarouselSection
              title={t("sections.weekendTitle")}
              subtitle={t("sections.weekendSubtitle")}
              listings={featuredListings.map(toCardListing)}
              currentUser={currentUser}
              viewMoreHref="/search?instantBook=true"
            />

            <HostCta />
          </>
        )}
      </Container>
    </div>
  );
}
