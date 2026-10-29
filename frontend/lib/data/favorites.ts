// TODO: replace with Supabase query
import "server-only";
import { Listing } from "@/types";
import { clone } from "./_store";
import { listingsTable, usersTable } from "./_tables";

export async function getFavoriteListings(userId: string): Promise<Listing[]> {
  const user = usersTable.find((u) => u.id === userId);
  const favIds = new Set(user?.favoriteIds || []);
  return clone(listingsTable.filter((listing) => favIds.has(listing.id)));
}
