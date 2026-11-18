"use server";

import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { failFromError } from "@/lib/api/errors";
import { isUuid } from "@/lib/api/catalog";
import { getSessionUser } from "@/lib/server/session";
import { getFavoriteIds, setFavorite } from "@/lib/data/favorites";

/**
 * Adds/removes a listing (or a trip, with `targetType`) from the current
 * user's wishlist (PUT / DELETE /me/favorites/{type}/{id}). Returns the new
 * list of saved ids.
 */
export async function setFavoriteAction(
  listingId: string,
  favorite: boolean,
  targetType: "listing" | "trip" = "listing",
): Promise<ActionResult<string[]>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!isUuid(listingId) || typeof favorite !== "boolean" || (targetType !== "listing" && targetType !== "trip")) {
    return actionFail("INVALID_INPUT");
  }
  try {
    await setFavorite(targetType, listingId, favorite);
    return actionOk(await getFavoriteIds());
  } catch (error) {
    return failFromError(error, "setFavoriteAction");
  }
}
