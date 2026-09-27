import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";
import getListingById from "@/app/actions/getListingById";
import SearchResultsClient from "@/components/search/SearchResultsClient";

interface SearchPageProps {
  searchParams: IListingsParams & { selectedId?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  let listings = await getListings(searchParams);
  const currentUser = await getCurrentUser();

  // If a selectedId is provided, ensure it is included in the list
  if (searchParams.selectedId) {
    const exists = listings.some((l) => l.id === searchParams.selectedId);
    if (!exists) {
      const selected = await getListingById({ listingId: searchParams.selectedId });
      if (selected) {
        listings = [selected, ...listings];
      }
    }
  }

  // If no listings found, fallback to city listings or default listings
  if (listings.length === 0) {
    listings = await getListings({ destination: searchParams.destination || "Paris" });
    if (listings.length === 0) {
      listings = await getListings();
    }
  }

  return (
    <ClientOnly>
      <SearchResultsClient
        listings={listings}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
}
