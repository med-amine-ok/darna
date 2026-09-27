import { SafeReview } from "@/types";
import { mockListingsStore, mockReviewsStore, mockUsersStore, updateMockStores } from "../mock-data";

const delay = (ms: number = 20) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrieves reviews for a specific listing or all reviews for admin moderation.
 * // TODO: replace with Supabase query
 */
export async function getReviews(listingId?: string): Promise<SafeReview[]> {
  await delay();
  // TODO: replace with Supabase query
  // let query = supabase.from('reviews').select('*, user:profiles(*), listing:listings(*)');
  // if (listingId) query = query.eq('listing_id', listingId);
  // const { data } = await query;

  let reviews = [...mockReviewsStore];
  if (listingId) {
    reviews = reviews.filter((r) => r.listingId === listingId);
  }

  return reviews.map((r) => ({
    ...r,
    user: mockUsersStore.find((u) => u.id === r.userId),
    listing: mockListingsStore.find((l) => l.id === r.listingId),
  }));
}

/**
 * Deletes a review (moderation).
 * // TODO: replace with Supabase query
 */
export async function deleteReview(id: string): Promise<boolean> {
  await delay();
  // TODO: replace with Supabase query
  // const { error } = await supabase.from('reviews').delete().eq('id', id);
  updateMockStores.deleteReview(id);
  return true;
}

/**
 * Updates review moderation status.
 * // TODO: replace with Supabase query
 */
export async function updateReviewStatus(
  id: string,
  status: "published" | "pending" | "flagged"
): Promise<boolean> {
  await delay();
  // TODO: replace with Supabase query
  // const { error } = await supabase.from('reviews').update({ status }).eq('id', id);
  updateMockStores.updateReviewStatus(id, status);
  return true;
}
