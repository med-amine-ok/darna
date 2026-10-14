import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";
import { getListings } from "@/lib/data/listings";
import { SearchParams } from "@/types";
import Navbar from "@/components/navbar/Navbar";
import SearchResultsClient from "@/components/search/SearchResultsClient";

import { getTrips } from "@/lib/data/trips";

interface SearchPageProps {
  searchParams: SearchParams & {
    instantBook?: string;
    isGuestFavorite?: string;
    propertyType?: string;
    amenities?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  // Load listings matching search parameters
  let [listings, trips] = await Promise.all([
    getListings(searchParams),
    getTrips({
      destination: searchParams.destination,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    }),
  ]);

  // Filter by instantBook if specified
  if (searchParams.instantBook === "true") {
    listings = listings.filter((l) => l.instantBook);
  }

  // Filter by guestFavorite if specified
  if (searchParams.isGuestFavorite === "true") {
    listings = listings.filter((l) => l.isGuestFavorite);
  }

  // Filter by propertyType if specified
  if (searchParams.propertyType && searchParams.propertyType !== "any") {
    const pt = searchParams.propertyType.toLowerCase();
    if (pt === "hotel") {
      listings = listings.filter(
        (l) => l.businessCategory === "hotel" || l.type.toLowerCase().includes("hotel")
      );
    } else if (pt === "hostel") {
      listings = listings.filter(
        (l) => l.businessCategory === "hostel" || l.type.toLowerCase().includes("hostel")
      );
    } else if (pt === "entire home" || pt === "entire") {
      listings = listings.filter(
        (l) =>
          l.businessCategory !== "hotel" &&
          l.businessCategory !== "hostel" &&
          !l.roomTypes?.some((r) => r.bookingUnit === "bed")
      );
    } else if (pt === "private room" || pt === "private_room") {
      listings = listings.filter(
        (l) =>
          l.type?.toLowerCase().includes("room") ||
          l.roomTypes?.some((r) => r.bookingUnit === "room")
      );
    } else {
      listings = listings.filter((l) => l.type.toLowerCase().includes(pt));
    }
  }

  // Filter by amenities if specified
  if (searchParams.amenities) {
    const amenityFilters = searchParams.amenities.toLowerCase().split(",");
    listings = listings.filter((l) =>
      amenityFilters.every((am) =>
        l.amenities?.some((a) => a.toLowerCase().includes(am))
      )
    );
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-darnaBg">
      {/* Two-Column Search Results Client */}
      <SearchResultsClient
        listings={listings}
        trips={trips}
        currentUser={currentUser}
        destination={searchParams.destination}
        activeVertical={searchParams.vertical}
      />
    </main>
  );
}
