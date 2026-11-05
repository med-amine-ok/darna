"use server";

import { revalidatePath } from "next/cache";
import type { Listing } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getHostContext, hostMayPublishListing } from "@/lib/server/host-context";
import { hostOwnsListing } from "@/lib/server/authz";
import {
  createListing,
  deleteListing,
  getListingById,
  updateListing,
} from "@/lib/data/listings";
import { ListingInputError } from "@/lib/data/_sanitize";

/**
 * An existing host creates a listing from host mode (/host/listings/new).
 * Ownership comes from the session: individuals own it personally, org hosts
 * publish under their active organization. The vertical must be one the
 * workspace may publish (lib/catalog-types.ts HOST_ALLOWED_OFFERS); experience
 * listings carry an `experienceType`, validated by the data layer.
 */
export async function createMyListingAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");
  if (ctx.isOrgHost && !ctx.organization) return actionFail("FORBIDDEN");
  if (!input || typeof input !== "object") return actionFail("INVALID_INPUT");
  if (!hostMayPublishListing(ctx.hostType, input))
    return actionFail("HOST_OFFER_NOT_ALLOWED");

  let listing: Listing;
  try {
    listing = await createListing(
      ctx.organization
        ? {
            hostUserId: ctx.user.id,
            organizationId: ctx.organization.id,
            businessCategory: ctx.organization.businessCategory,
          }
        : { hostUserId: ctx.user.id },
      input,
    );
  } catch (err) {
    if (err instanceof ListingInputError)
      return actionFail(err.code, err.params);
    throw err;
  }
  revalidatePath("/", "layout");
  return actionOk({ id: listing.id });
}

/**
 * Owner edits one of their listings. Only whitelisted content fields are
 * applied (see lib/data/_sanitize.ts), never ids, ownership or stats. A patch
 * may not move a listing into a vertical the workspace can't publish.
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

  const p =
    patch && typeof patch === "object" ? (patch as Record<string, unknown>) : null;
  if (p && p.category !== undefined && p.category !== listing.category) {
    const roomTypes = p.roomTypes !== undefined ? p.roomTypes : listing.roomTypes;
    if (!hostMayPublishListing(ctx.hostType, { category: p.category, roomTypes }))
      return actionFail("HOST_OFFER_NOT_ALLOWED");
  }

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
