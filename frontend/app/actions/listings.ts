"use server";

import { revalidatePath } from "next/cache";
import type { Listing } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getHostContext } from "@/lib/server/host-context";
import { hostOwnsListing } from "@/lib/server/authz";
import {
  deleteListing,
  getListingById,
  updateListing,
} from "@/lib/data/listings";
import { ListingInputError } from "@/lib/data/_sanitize";

/**
 * Owner edits one of their listings. Only whitelisted content fields are
 * applied (see lib/data/_sanitize.ts), never ids, ownership or stats.
 */
export async function updateMyListingAction(
  listingId: string,
  patch: unknown,
): Promise<ActionResult<Listing>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");

  const listing =
    typeof listingId === "string" ? await getListingById(listingId) : null;
  if (!listing || !hostOwnsListing(ctx, listing))
    return actionFail("NOT_FOUND");

  let updated: Listing | null;
  try {
    updated = await updateListing(listing.id, patch);
  } catch (err) {
    if (err instanceof ListingInputError)
      return actionFail(err.code, err.params);
    throw err;
  }
  if (!updated) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk(updated);
}

export async function deleteMyListingAction(
  listingId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");

  const listing =
    typeof listingId === "string" ? await getListingById(listingId) : null;
  if (!listing || !hostOwnsListing(ctx, listing))
    return actionFail("NOT_FOUND");

  const ok = await deleteListing(listing.id);
  if (!ok) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk({ id: listing.id });
}
