"use server";

import { revalidatePath } from "next/cache";
import type { Listing } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { ApiError } from "@/lib/api/client";
import { failFromError } from "@/lib/api/errors";
import { getHostContext, hostMayPublishListing } from "@/lib/server/host-context";
import { createListing, deleteListing, getHostListingById, updateListing } from "@/lib/data/listings";

/** Listing-specific API refusals with their own message; the rest go through failFromError. */
function listingFail<T>(error: unknown, where: string): ActionResult<T> {
  if (error instanceof ApiError) {
    if (error.code === "experience_type_required" || error.code === "experience_type_not_allowed") {
      return actionFail("EXPERIENCE_TYPE_REQUIRED");
    }
    if (error.code === "listing_incomplete") return actionFail("LISTING_INCOMPLETE");
  }
  return failFromError<T>(error, where);
}

/**
 * An existing host creates a listing from host mode (/host/listings/new).
 * The API creates it in the session's active workspace (POST /host/listings)
 * and re-checks the offer rule (403 host_offer_not_allowed); the check here
 * only answers early. It is sent to review unless it is a draft.
 */
export async function createMyListingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");
  if (ctx.isOrgHost && !ctx.organization) return actionFail("FORBIDDEN");
  if (!input || typeof input !== "object") return actionFail("INVALID_INPUT");
  if (!hostMayPublishListing(ctx.hostType, input)) return actionFail("HOST_OFFER_NOT_ALLOWED");

  try {
    const listing = await createListing(
      ctx.organization
        ? { hostUserId: ctx.user.id, organizationId: ctx.organization.id, businessCategory: ctx.organization.businessCategory }
        : { hostUserId: ctx.user.id },
      input,
    );
    revalidatePath("/", "layout");
    return actionOk({ id: listing.id });
  } catch (error) {
    return listingFail(error, "createMyListingAction");
  }
}

/**
 * Owner edits one of their listings: content fields (PATCH), `status`
 * ("active" submits or resumes, "draft" pauses or withdraws) and `roomTypes`
 * (synced with /room-types). The API decides ownership (404 for anyone else).
 */
export async function updateMyListingAction(listingId: string, patch: unknown): Promise<ActionResult<Listing>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");
  if (typeof listingId !== "string") return actionFail("INVALID_INPUT");
  const listing = await getHostListingById(listingId);
  if (!listing) return actionFail("NOT_FOUND");

  const p = patch && typeof patch === "object" ? (patch as Record<string, unknown>) : null;
  if (!p) return actionFail("INVALID_INPUT");
  if (p.category !== undefined && p.category !== listing.category) {
    // The API locks the vertical of an existing listing (vertical_locked).
    return actionFail("HOST_OFFER_NOT_ALLOWED");
  }

  try {
    const updated = await updateListing(listing.id, p);
    if (!updated) return actionFail("NOT_FOUND");
    revalidatePath("/", "layout");
    return actionOk(updated);
  } catch (error) {
    return listingFail(error, "updateMyListingAction");
  }
}

export async function deleteMyListingAction(listingId: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await getHostContext();
  if (!ctx) return actionFail("UNAUTHENTICATED");
  if (typeof listingId !== "string") return actionFail("INVALID_INPUT");
  try {
    const ok = await deleteListing(listingId);
    if (!ok) return actionFail("NOT_FOUND");
    revalidatePath("/", "layout");
    return actionOk({ id: listingId });
  } catch (error) {
    return listingFail(error, "deleteMyListingAction");
  }
}
