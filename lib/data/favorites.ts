import { mockCurrentUserStore, updateMockStores } from "../mock-data";

const delay = (ms: number = 20) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Toggles a listing in the current user's favorites list.
 * // TODO: replace with Supabase query
 */
export async function toggleFavorite(listingId: string): Promise<string[]> {
  await delay();
  // TODO: replace with Supabase query
  // const { data } = await supabase.from('favorites').upsert/delete...
  return updateMockStores.toggleFavorite(listingId);
}

/**
 * Adds a listing to the current user's favorites.
 * // TODO: replace with Supabase query
 */
export async function addFavorite(listingId: string): Promise<string[]> {
  await delay();
  // TODO: replace with Supabase query
  const list = mockCurrentUserStore.favoriteIds || [];
  if (!list.includes(listingId)) {
    return updateMockStores.toggleFavorite(listingId);
  }
  return list;
}

/**
 * Removes a listing from the current user's favorites.
 * // TODO: replace with Supabase query
 */
export async function removeFavorite(listingId: string): Promise<string[]> {
  await delay();
  // TODO: replace with Supabase query
  const list = mockCurrentUserStore.favoriteIds || [];
  if (list.includes(listingId)) {
    return updateMockStores.toggleFavorite(listingId);
  }
  return list;
}
