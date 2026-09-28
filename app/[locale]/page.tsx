import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/listing/ListingCard";
import ListingCarouselSection from "@/components/home/ListingCarouselSection";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";
import SearchResultsClient from "@/components/search/SearchResultsClient";
import HomeHero from "@/components/home/HomeHero";
import { getTranslations } from "next-intl/server";

interface HomeProps {
  searchParams: IListingsParams;
}

export default async function Home({ searchParams }: HomeProps) {
  const allListings = await getListings();
  const currentUser = await getCurrentUser();
  const t = await getTranslations("nav");

  // Filter listings based on URL query
  const hasSpecificSearch = Boolean(
    searchParams.destination ||
    searchParams.service ||
    searchParams.locationValue ||
    searchParams.startDate ||
    searchParams.endDate ||
    (searchParams.guestCount && +searchParams.guestCount > 1) ||
    searchParams.searchQuery ||
    searchParams.minPrice ||
    searchParams.maxPrice ||
    searchParams.propertyType ||
    searchParams.amenities ||
    searchParams.instantBook ||
    searchParams.superhost,
  );

  const selectedCategory = searchParams.category;

  // Filtered view when user performs a search
  if (hasSpecificSearch) {
    const searchResults = await getListings(searchParams);

    const resultTitle = searchParams.service
      ? `Services: ${searchParams.service}`
      : searchParams.destination
        ? `Stays in ${searchParams.destination}`
        : undefined;

    return (
      <ClientOnly>
        <SearchResultsClient
          listings={searchResults}
          currentUser={currentUser}
          title={resultTitle}
        />
      </ClientOnly>
    );
  }

  // If specific tab selected (Homes, Experiences, Services)
  if (selectedCategory && selectedCategory !== "all") {
    const tabListings = allListings.filter(
      (l) => l.type === selectedCategory || l.category === selectedCategory,
    );

    return (
      <ClientOnly>
        <HomeHero />
        <Container>
          <div className="pb-16 pt-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {selectedCategory}
              </h1>
              <p className="text-sm text-primary/70">
                Showing top rated {selectedCategory.toLowerCase()} with DARNA
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
              {tabListings.map((list) => (
                <ListingCard
                  key={list.id}
                  data={list}
                  currentUser={currentUser}
                  customHref={`/search?destination=${encodeURIComponent(
                    list.city || "Tipaza"
                  )}&selectedId=${list.id}`}
                />
              ))}
            </div>
          </div>
        </Container>
      </ClientOnly>
    );
  }

  // --- Default Home Page matching Screenshot Layout ---
  const algerianStays = allListings.filter(
    (l) => l.locationValue === "DZ" || l.city === "Tipaza" || l.city === "Alger" || l.city === "Oran"
  );
  const parisHomes = allListings.filter(
    (l) => l.city === "Paris" && (l.type === "Homes" || !l.type),
  );
  const hotelListings = allListings.filter(
    (l) => l.type === "Services" || l.category === "Lux",
  );
  const uniqueExperiences = allListings.filter(
    (l) =>
      l.type === "Experiences" ||
      l.category === "Windmills" ||
      l.category === "Desert",
  );

  return (
    <ClientOnly>
      <HomeHero />
      <Container>
        <div className="pb-20 pt-6 space-y-12 sm:space-y-16">
          {/* Section 1: Featured Stays in Algeria (Tipaza, Alger, Oran, Taghit) */}
          {algerianStays.length > 0 && (
            <ListingCarouselSection
              title="Stays in Tipaza & Algeria"
              subtitle="Handpicked stays across the Mediterranean coast and oasis towns"
              badge="✦ Win DARNA"
              listings={algerianStays}
              currentUser={currentUser}
            />
          )}

          {/* Section 2: Popular homes in Paris (from Screenshot) */}
          <ListingCarouselSection
            title={t("popularHomesParis")}
            listings={
              parisHomes.length > 0 ? parisHomes : allListings.slice(0, 7)
            }
            currentUser={currentUser}
          />

          {/* Section 3: Great hotels for your next trip (from Screenshot) */}
          <ListingCarouselSection
            title={t("greatHotels")}
            subtitle={t("hotelsCredit")}
            badge={t("pricesIncludeFees")}
            listings={
              hotelListings.length > 0 ? hotelListings : allListings.slice(3, 8)
            }
            currentUser={currentUser}
          />

          {/* Section 4: Unique stays & extraordinary experiences */}
          <ListingCarouselSection
            title={t("uniqueStays")}
            listings={
              uniqueExperiences.length > 0
                ? uniqueExperiences
                : allListings.slice(0, 5)
            }
            currentUser={currentUser}
          />
        </div>
      </Container>
    </ClientOnly>
  );
}
