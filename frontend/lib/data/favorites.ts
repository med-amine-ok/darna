// TODO: replace with Supabase query
import { Listing } from "@/types";
import { mockListings } from "@/lib/mock-data/listings";
import { currentUserMock } from "@/lib/mock-data/users";

export async function getFavoriteListings(): Promise<Listing[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const favIds = currentUserMock.favoriteIds || [];
  return mockListings.filter((listing) => favIds.includes(listing.id));
}
