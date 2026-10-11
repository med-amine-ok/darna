import { getCurrentUser } from "@/lib/data/auth";
import { getListings, getFeaturedListings } from "@/lib/data/listings";
import { getVehicles } from "@/lib/data/vehicles";
import { getExperiences } from "@/lib/data/experiences";

import Navbar from "@/components/navbar/Navbar";
import HomeHero from "@/components/home/HomeHero";
import MainCategoryTabs from "@/components/navbar/MainCategoryTabs";
import ListingCarouselSection from "@/components/home/ListingCarouselSection";
import ListingCard from "@/components/listing/ListingCard";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";

interface HomePageProps {
  searchParams: {
    category?: string;
    vertical?: "home" | "experience" | "vehicle";
    destination?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const currentUser = await getCurrentUser();

  // If a specific category chip is active
  const categoryFilter = searchParams?.category;

  // Fetch categorized data sets
  const allListings = await getListings({
    destination: searchParams?.destination,
  });

  const homeListings = allListings.filter((l) => l.category === "home");
  const vehicleListings = await getVehicles();
  const experienceListings = await getExperiences();
  const featuredListings = await getFeaturedListings();

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

  return (
    <main className="relative min-h-[100dvh] flex flex-col bg-darnaBg overflow-x-hidden">
      {/* Authentic Algerian Hero Section */}
      <HomeHero />

      {/* 3. Horizontal Scrollable Category Tabs Bar */}
      <div className="sticky top-0 z-30 bg-darnaBg/95 backdrop-blur-md border-b border-tertiary/50 shadow-2xs">
        <Container>
          <MainCategoryTabs />
        </Container>
      </div>

      {/* 4. Main Feed Section */}
      <Container className="py-8 space-y-12">
        {categoryFilter ? (
          /* When category filtered: Grid View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  {categoryFilter} in Algeria
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Showing {filteredListings.length} authentic properties and experiences
                </p>
              </div>
            </div>

            {filteredListings.length === 0 ? (
              <EmptyState
                title="No listings found for this category"
                subtitle="Try selecting another category or clear your filter to browse all stays."
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
          /* Default Themed Carousel Feeds */
          <>
            {/* Section 1: Popular Homes in Algiers & Coastal Escapes */}
            <ListingCarouselSection
              title="Popular homes in Algiers & the Mediterranean coast"
              subtitle="Restored Ottoman Riads, cliffside sea-view villas, and city penthouses"
              badge="Guest favorites in Algiers, Tipaza & Oran"
              listings={homeListings}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=home"
            />

            {/* Section 2: Desert & Sahara Expeditions */}
            <ListingCarouselSection
              title="Desert & Saharan Expeditions"
              subtitle="Guided treks through Tassili n'Ajjer, golden dunes of Taghit, and ancient M'zab ksars"
              badge="✦ Top rated experiences in the Algerian Sahara"
              listings={experienceListings}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=experience"
            />

            {/* Section 3: All-Terrain Vehicles & 4x4s */}
            <ListingCarouselSection
              title="Explore vehicles for your Algerian road trip"
              subtitle="Dune-ready Toyota 4x4s, rugged mountain crossovers, and city hatchbacks"
              badge="Comprehensive insurance & unlimited mileage options"
              listings={vehicleListings}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=vehicle"
            />

            {/* Section 4: Available This Weekend */}
            <ListingCarouselSection
              title="Available this weekend across Algeria"
              subtitle="Instant book stays with five-star verified local hosts"
              listings={featuredListings}
              currentUser={currentUser}
              viewMoreHref="/search?instantBook=true"
            />
          </>
        )}
      </Container>
    </main>
  );
}
