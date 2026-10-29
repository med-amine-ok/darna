"use server";

import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import { setUserFavorite } from "@/lib/data/auth";
import { getListingById } from "@/lib/data/listings";

/** Adds/removes a listing from the current user's wishlist. Returns the new id list. */
export async function setFavoriteAction(listingId: string, favorite: boolean): Promise<ActionResult<string[]>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof listingId !== "string" || typeof favorite !== "boolean") return actionFail("INVALID_INPUT");
  if (favorite && !(await getListingById(listingId))) return actionFail("NOT_FOUND");

  const ids = await setUserFavorite(user.id, listingId, favorite);
  return ids ? actionOk(ids) : actionFail("NOT_FOUND");
}
