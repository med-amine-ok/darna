import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getListings, getFeaturedListings } from "@/lib/data/listings";
import { getVehicles } from "@/lib/data/vehicles";
import { getExperiences } from "@/lib/data/experiences";
import { getTrips } from "@/lib/data/trips";

import Navbar from "@/components/navbar/Navbar";
import HomeHero from "@/components/home/HomeHero";
import ListingCarouselSection from "@/components/home/ListingCarouselSection";
import ListingCard from "@/components/listing/ListingCard";
import TripCard from "@/components/trips/TripCard";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import { Link } from "@/navigation";
import { BrandCompassIcon } from "@/components/icons";

interface HomePageProps {
  searchParams: {
    category?: string;
    vertical?: "home" | "experience" | "vehicle" | "trip";
    destination?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  // If a specific category chip is active
  const categoryFilter = searchParams?.category;

  // Fetch categorized data sets
  const allListings = await getListings({
    destination: searchParams?.destination,
  });

  const homeListings = allListings.filter((l) => l.category === "home");
  const hotelAndHostelListings = allListings.filter(
    (l) => l.businessCategory === "hotel" || l.businessCategory === "hostel" || (l.roomTypes && l.roomTypes.length > 0)
  );
  const vehicleListings = await getVehicles();
  const experienceListings = await getExperiences();
  const featuredListings = await getFeaturedListings();
  const agencyTrips = await getTrips({ destination: searchParams?.destination });

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

  return (
    <main className="relative min-h-[100dvh] flex flex-col bg-darnaBg overflow-x-hidden">
      {/* Authentic Algerian Hero Section */}
      <HomeHero />

      {/* Main Feed Section */}
      <Container className="pt-2 sm:pt-4 pb-8 space-y-10 sm:space-y-12">
        {isTripVertical ? (
          /* Trips vertical grid view */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  Curated Agency Trips & Circuits
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Showing {agencyTrips.length} multi-day guided expeditions by verified Algerian travel agencies
                </p>
              </div>
            </div>

            {agencyTrips.length === 0 ? (
              <EmptyState
                title="No agency trips found"
                subtitle="Try selecting another destination or clear filters."
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
              badge="Top rated experiences in the Algerian Sahara"
              listings={experienceListings}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=experience"
            />

            {/* Section 3: Agency-Curated Multi-Day Trips & Circuits (Section 5) */}
            <div className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-tertiary/60 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider mb-2">
                    <BrandCompassIcon size={14} />
                    <span>Exclusive Agency Expeditions</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-primary">
                    Agency-Curated Multi-Day Trips & Circuits
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                    Licensed Algerian tourism agencies organizing guided all-inclusive circuits across the Sahara, Atlas, and Mediterranean coast.
                  </p>
                </div>
                <Link
                  href="/search?vertical=trip"
                  className="text-xs font-bold text-primary hover:text-secondary flex items-center gap-1 underline underline-offset-4"
                >
                  Browse all circuits →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {agencyTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    customHref={`/search?vertical=trip&selectedId=${trip.id}`}
                  />
                ))}
              </div>
            </div>

            {/* Section 4: Hotels, Palaces & Heritage Hostels */}
            {hotelAndHostelListings.length > 0 && (
              <ListingCarouselSection
                title="Hotels, Palaces & Backpacker Hostels"
                subtitle="From prestigious 5-star botanical palaces to vibrant Medina rooftops and desert dunes"
                badge="Multiple room types, instant booking"
                listings={hotelAndHostelListings}
                currentUser={currentUser}
                viewMoreHref="/search?propertyType=Hotel"
              />
            )}

            {/* Section 5: All-Terrain Vehicles & 4x4s */}
            <ListingCarouselSection
              title="Explore vehicles for your Algerian road trip"
              subtitle="Dune-ready Toyota 4x4s, rugged mountain crossovers, and city hatchbacks"
              badge="Comprehensive insurance & unlimited mileage options"
              listings={vehicleListings}
              currentUser={currentUser}
              viewMoreHref="/search?vertical=vehicle"
            />

            {/* Section 5: Available This Weekend */}
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
