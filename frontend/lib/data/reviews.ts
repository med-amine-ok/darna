import "server-only";
import { Review } from "@/types";
import { ApiError, api, rowsOf } from "@/lib/api/client";
import { isUuid, toReview, type ApiReview } from "@/lib/api/catalog";

/**
 * Published reviews from the API (apps/reviews). Cursor pages of at most 50;
 * the pages show the newest 50. Reads never throw: failures give [].
 */
async function reviewPage(path: string, query: Record<string, string | number> = {}): Promise<Review[]> {
  try {
    const answer = await api<unknown>(path, { anonymous: true, query: { limit: 50, ...query } });
    return rowsOf<ApiReview>(answer).map(toReview);
  } catch (error) {
    if (!(error instanceof ApiError && (error.status === 404 || error.status === 400))) {
      console.error(`[reviews] ${path}`, error);
    }
    return [];
  }
}

export async function getReviewsByListingId(listingId: string): Promise<Review[]> {
  if (!listingId) return [];
  return reviewPage(`/listings/${encodeURIComponent(listingId)}/reviews`);
}

export async function getReviewsByTripId(tripId: string): Promise<Review[]> {
  if (!tripId) return [];
  return reviewPage(`/trips/${encodeURIComponent(tripId)}/reviews`);
}

/** Reviews received as a host plus reviews the person wrote, newest first, without duplicates. */
export async function getReviewsByUserId(userId: string): Promise<Review[]> {
  if (!isUuid(userId)) return [];
  const path = `/users/${userId}/reviews`;
  const [received, written] = await Promise.all([reviewPage(path, { role: "host" }), reviewPage(path, { role: "author" })]);
  const seen = new Set<string>();
  return [...received, ...written]
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
