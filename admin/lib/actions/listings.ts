"use server";

import * as data from "@/lib/data/listings";
import { runAction, id, str, oneOf, obj, reason, requireAlso } from "@/lib/auth/run-action";
import type { ListingStatus, Permission } from "@/lib/types";
import { normalizeListingStatus, LISTING_STATUSES_REQUIRING_REASON } from "@/lib/domain/transitions";

type ListParams = data.ListingFilterParams;

const LISTING_STATUSES: readonly ListingStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "changes_requested",
  "rejected",
  "suspended",
  "archived",
  "deleted",
  "pending",
  "published",
  "refused",
];

/** Permission required to move a listing INTO the given status. */
function permissionForListingStatus(status: ListingStatus): Permission {
  switch (normalizeListingStatus(status)) {
    case "rejected":
      return "listings.reject";
    case "suspended":
    case "archived":
      return "listings.suspend";
    case "deleted":
      return "listings.delete";
    default:
      return "listings.approve";
  }
}

export async function listListings(params: ListParams = {}) {
  return runAction("listings.view", () => data.listListings(params ?? {}));
}

export async function getListingById(listingId: string) {
  return runAction("listings.view", () => data.getListingById(id(listingId)));
}

export async function approveListing(listingId: string) {
  return runAction("listings.approve", (actor) => data.approveListing(id(listingId), actor));
}

export async function rejectListing(listingId: string, rejectReason: string) {
  return runAction("listings.reject", (actor) => data.rejectListing(id(listingId), reason(rejectReason), actor));
}

export async function requestChangesListing(listingId: string, notes: string) {
  return runAction("listings.approve", (actor) =>
    data.requestChangesListing(id(listingId), reason(notes, "notes"), actor)
  );
}

export async function suspendListing(listingId: string, suspendReason: string) {
  return runAction("listings.suspend", (actor) => data.suspendListing(id(listingId), reason(suspendReason), actor));
}

export async function featureListing(listingId: string, isFeatured: boolean) {
  return runAction("listings.feature", (actor) => data.featureListing(id(listingId), isFeatured === true, actor));
}

export async function deleteListing(listingId: string) {
  return runAction("listings.delete", (actor) => data.deleteListing(id(listingId), actor));
}

export async function restoreListing(listingId: string) {
  return runAction("listings.delete", (actor) => data.restoreListing(id(listingId), actor));
}

/** Generic status change; `statusReason` is mandatory for rejected / suspended / changes_requested. */
export async function updateListingStatus(listingId: string, status: ListingStatus, statusReason?: string) {
  const permission = LISTING_STATUSES.includes(status) ? permissionForListingStatus(status) : "listings.approve";
  return runAction(permission, (actor) => {
    const s = oneOf(status, LISTING_STATUSES, "status");
    const needsReason = LISTING_STATUSES_REQUIRING_REASON.includes(normalizeListingStatus(s));
    const r = needsReason ? reason(statusReason) : statusReason === undefined ? undefined : str(statusReason, "reason", 1000);
    return data.updateListingStatus(id(listingId), s, actor, r);
  });
}

/** Full filtered listing list as CSV (all pages). Requires reports.export + listings.view. */
export async function exportListings(params: ListParams = {}) {
  return runAction("reports.export", (actor) => {
    requireAlso(actor, "listings.view");
    const p = obj<ListParams>(params ?? {}, "params");
    return data.exportListings({ ...p, page: undefined, pageSize: undefined }, actor);
  });
}
