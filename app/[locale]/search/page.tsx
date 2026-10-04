import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";
import getListingById from "@/app/actions/getListingById";
import SearchResultsClient from "@/components/search/SearchResultsClient";

interface SearchPageProps {
  searchParams: IListingsParams & { selectedId?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  let selectedListing = null;
  if (searchParams.selectedId) {
    selectedListing = await getListingById({ listingId: searchParams.selectedId });
  }

  const queryParams: IListingsParams = { ...searchParams };
  if (selectedListing) {
    if (!queryParams.destination && selectedListing.city) {
      queryParams.destination = selectedListing.city;
    }
    if (!queryParams.category && (selectedListing.type === "Vehicles" || selectedListing.category === "Vehicles")) {
      queryParams.category = "Vehicles";
    }
  }

  let listings = await getListings(queryParams);
  const currentUser = await getCurrentUser();

  // If a selectedId is provided, ensure it is placed at the top of the list
  if (selectedListing) {
    const exists = listings.some((l) => l.id === selectedListing!.id);
    if (!exists) {
      listings = [selectedListing, ...listings];
    } else {
      listings = [
        selectedListing,
        ...listings.filter((l) => l.id !== selectedListing!.id),
      ];
    }
  }

  // If no listings found, fallback to city listings or default listings
  if (listings.length === 0) {
    listings = await getListings({
      destination: searchParams.destination || selectedListing?.city || "Paris",
    });
    if (listings.length === 0) {
      listings = await getListings();
    }
  }

  let title: string | undefined = undefined;
  if (selectedListing) {
    const city = selectedListing.city || searchParams.destination || "Algeria";
    if (selectedListing.type === "Vehicles" || selectedListing.category === "Vehicles") {
      title = `Vehicles for rent in ${city}`;
    } else {
      title = `Stays in ${city}`;
    }
  }

  return (
    <ClientOnly>
      <SearchResultsClient
        listings={listings}
        currentUser={currentUser}
        title={title}
      />
    </ClientOnly>
  );
}
