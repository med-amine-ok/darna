import "server-only";
import { Listing, Trip } from "@/types";
import { ApiError, api, currentApiToken } from "@/lib/api/client";
import { getListingById } from "./listings";
import { getTripById } from "./trips";

interface FavoriteRow {
  target_type: "listing" | "trip";
  target_id: string;
}

interface FavoritePage {
  results: FavoriteRow[];
  next_cursor: string | null;
  has_more: boolean;
}

/** Most favourites read (4 cursor pages of 50). */
const MAX_PAGES = 4;

/** The signed-in user's favourites (GET /me/favorites), newest first. */
export async function getFavoriteRows(targetType?: "listing" | "trip"): Promise<FavoriteRow[]> {
  if (!currentApiToken()) return [];
  const rows: FavoriteRow[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const answer: FavoritePage = await api<FavoritePage>("/me/favorites", {
      query: { limit: 50, target_type: targetType, cursor },
    });
    rows.push(...(answer.results ?? []));
    if (!answer.has_more || !answer.next_cursor) break;
    cursor = answer.next_cursor;
  }
  return rows;
}

/** Ids of every saved listing and trip (User.favoriteIds). */
export async function getFavoriteIds(): Promise<string[]> {
  return (await getFavoriteRows()).map((row) => row.target_id);
}

/**
 * Saved listings that guests may still see. The API gives no card for a
 * saved item yet (the catalog does not register its favourite hook), so each
 * listing is read from its public page; hidden ones are left out.
 */
export async function getFavoriteListings(_userId?: string): Promise<Listing[]> {
  try {
    const rows = await getFavoriteRows("listing");
    const listings = await Promise.all(rows.map((row) => getListingById(row.target_id)));
    return listings.filter((l): l is Listing => Boolean(l && l.status === "active"));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) console.error("[favorites.listings]", error);
    return [];
  }
}

/** Saved trips that are still public. */
export async function getFavoriteTrips(): Promise<Trip[]> {
  try {
    const rows = await getFavoriteRows("trip");
    const trips = await Promise.all(rows.map((row) => getTripById(row.target_id)));
    return trips.filter((t): t is Trip => Boolean(t && t.status === "active"));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) console.error("[favorites.trips]", error);
    return [];
  }
}

/** Save or remove a listing or trip (PUT / DELETE /me/favorites/{type}/{id}, both idempotent). */
export async function setFavorite(targetType: "listing" | "trip", targetId: string, favorite: boolean): Promise<void> {
  await api(`/me/favorites/${targetType}/${encodeURIComponent(targetId)}`, { method: favorite ? "PUT" : "DELETE" });
}
