import "server-only";
// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { Listing, ListingStatus, PaginatedResult, AdminActor, Permission } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import {
  canTransitionListing,
  isValidReason,
  normalizeListingStatus,
  LISTING_STATUSES_REQUIRING_REASON,
  type CanonicalListingStatus,
} from "@/lib/domain/transitions";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { logAudit, logExport } from "./audit";
import { DomainError, ValidationError } from "./errors";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ListingFilterParams {
  status?: string; // "all" | ListingStatus
  vertical?: string; // "all" | ListingVertical
  hostType?: string;
  wilayaCode?: string | string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  approvalMode?: "all" | "instant" | "request";
  isFeatured?: boolean;
  isReported?: boolean;
  minCapacity?: number;
  minBedrooms?: number;
  amenity?: string;
  /** Canonical experience type id (EXPERIENCE_TYPES); "all" or empty = any. */
  experienceType?: string;
  /** Canonical trip type id (TRIP_TYPES); "all" or empty = any. */
  tripType?: string;
  sortBy?: "created" | "price" | "rating" | "bookings";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

function countBy(rows: Listing[], key: (l: Listing) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of rows) {
    const k = key(l);
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function matchListingStatus(listingStatus: string, filterStatus: string): boolean {
  if (!filterStatus || filterStatus === "all") return true;

  if (filterStatus.includes(",")) {
    const list = filterStatus.split(",").map((s) => s.trim().toLowerCase());
    return list.some((s) => matchListingStatus(listingStatus, s));
  }

  const lStatus = (listingStatus || "").toLowerCase();
  const fStatus = filterStatus.toLowerCase();

  // "pending" <===> "pending_review"
  if (fStatus === "pending" || fStatus === "pending_review") {
    return lStatus === "pending" || lStatus === "pending_review";
  }

  // "published" <===> "approved"
  if (fStatus === "published" || fStatus === "approved") {
    return lStatus === "published" || lStatus === "approved";
  }

  // "refused" <===> "rejected"
  if (fStatus === "refused" || fStatus === "rejected") {
    return lStatus === "refused" || lStatus === "rejected";
  }

  return lStatus === fStatus;
}

export async function listListings(
  params: ListingFilterParams = {}
): Promise<PaginatedResult<Listing>> {
  await delay(200);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  let filtered = [...store.listings];

  // 1. Status Filter (Bidirectional normalization between DB and UI terms)
  if (params.status && params.status !== "all") {
    filtered = filtered.filter((l) => matchListingStatus(l.status, params.status!));
  }

  // 2. Vertical Filter
  if (params.vertical && params.vertical !== "all") {
    filtered = filtered.filter((l) => l.category === params.vertical);
  }

  // 3. Host Type
  if (params.hostType && params.hostType !== "all") {
    filtered = filtered.filter((l) => l.hostType === params.hostType);
  }

  // 4. Wilaya
  if (params.wilayaCode && params.wilayaCode !== "all") {
    const codes = Array.isArray(params.wilayaCode) ? params.wilayaCode : [params.wilayaCode];
    if (codes.length > 0) {
      filtered = filtered.filter((l) => codes.includes(l.wilayaCode));
    }
  }

  // 5. Price Range
  if (params.minPrice !== undefined && params.minPrice > 0) {
    filtered = filtered.filter((l) => l.price >= params.minPrice!);
  }
  if (params.maxPrice !== undefined && params.maxPrice > 0) {
    filtered = filtered.filter((l) => l.price <= params.maxPrice!);
  }

  // 6. Search
  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((l) => {
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchHost = l.hostName.toLowerCase().includes(q);
      const matchCity = l.city.toLowerCase().includes(q);
      const matchType = l.propertyType.toLowerCase().includes(q);
      return matchTitle || matchHost || matchCity || matchType;
    });
  }

  // 7. Flags & Features
  if (params.approvalMode && params.approvalMode !== "all") {
    filtered = filtered.filter((l) => l.bookingApprovalMode === params.approvalMode);
  }
  if (params.isFeatured !== undefined) {
    filtered = filtered.filter((l) => l.isFeatured === params.isFeatured);
  }
  if (params.isReported !== undefined) {
    filtered = filtered.filter((l) => l.isReported === params.isReported);
  }
  if (params.minCapacity && params.minCapacity > 0) {
    filtered = filtered.filter((l) => l.guestCapacity >= params.minCapacity!);
  }
  if (params.minBedrooms && params.minBedrooms > 0) {
    filtered = filtered.filter((l) => (l.bedroomCount || 0) >= params.minBedrooms!);
  }
  if (params.amenity && params.amenity !== "all") {
    filtered = filtered.filter((l) => l.amenities.includes(params.amenity!));
  }
  if (params.experienceType && params.experienceType !== "all") {
    filtered = filtered.filter((l) => l.experienceType === params.experienceType);
  }
  if (params.tripType && params.tripType !== "all") {
    filtered = filtered.filter((l) => l.tripType === params.tripType);
  }

  // Facets - Scoped to vertical if provided, with alias support for both UI and DB keys
  const scopedListings = params.vertical && params.vertical !== "all"
    ? store.listings.filter((l) => l.category === params.vertical)
    : store.listings;

  const countByStatus = (statusKey: string) =>
    scopedListings.filter((l) => matchListingStatus(l.status, statusKey)).length;

  const facets: Record<string, Record<string, number>> = {
    status: {
      all: scopedListings.length,
      pending: countByStatus("pending"),
      pending_review: countByStatus("pending_review"),
      approved: countByStatus("approved"),
      published: countByStatus("published"),
      changes_requested: countByStatus("changes_requested"),
      rejected: countByStatus("rejected"),
      refused: countByStatus("refused"),
      suspended: countByStatus("suspended"),
      archived: countByStatus("archived"),
      draft: countByStatus("draft"),
    },
    vertical: {
      all: store.listings.length,
      home: store.listings.filter((l) => l.category === "home").length,
      hotel: store.listings.filter((l) => l.category === "hotel").length,
      experience: store.listings.filter((l) => l.category === "experience").length,
      vehicle: store.listings.filter((l) => l.category === "vehicle").length,
      trip: store.listings.filter((l) => l.category === "trip").length,
    },
    // Counts per canonical type (lib/catalog-types.ts), scoped like the status facet.
    experienceType: countBy(scopedListings, (l) => l.experienceType),
    tripType: countBy(scopedListings, (l) => l.tripType),
  };

  // Sorting
  const sortBy = params.sortBy || "created";
  const order = params.sortOrder === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === "price") return (a.price - b.price) * order;
    if (sortBy === "rating") return (a.rating - b.rating) * order;
    if (sortBy === "bookings") return (a.bookingsCount - b.bookingsCount) * order;
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize).map((l) => {
    let formattedId = l.formattedId;
    if (!formattedId) {
      const numPart = l.id.replace("lst_", "").padStart(5, "0");
      if (l.category === "home" || l.category === "hotel") formattedId = `#H${numPart}`;
      else if (l.category === "experience") formattedId = `#EXP${numPart.slice(-4)}`;
      else if (l.category === "trip") formattedId = `#T${numPart.slice(-4)}`;
      else if (l.category === "vehicle") formattedId = `#V${numPart.slice(-4)}`;
      else formattedId = `#L${numPart}`;
    }
    return {
      ...l,
      formattedId,
    };
  });

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    facets,
  };
}

export async function getListingById(id: string): Promise<Listing | null> {
  await delay(150);
  const listing = store.listings.find((l) => l.id === id);
  return listing ? { ...listing } : null;
}

/** Full filtered listing list (all pages) as CSV; audited. */
export async function exportListings(params: ListingFilterParams, actor: AdminActor): Promise<CsvExport> {
  const result = await listListings({ ...params, page: 1, pageSize: Number.MAX_SAFE_INTEGER });
  const rows = result.rows;
  const csv = toCsv(
    ["ID", "Title", "Vertical", "Property Type", "Experience / Trip Type", "Host", "Host Type", "Status", "Price (DZD)", "Wilaya", "City", "Capacity", "Rating", "Reviews", "Bookings", "Featured", "Reported", "Created"],
    rows.map((l) => [
      l.formattedId || l.id, l.title, l.category, l.propertyType, l.experienceType ?? l.tripType ?? "", l.hostName, l.hostType, l.status, l.price,
      l.wilayaCode, l.city, l.guestCapacity, l.rating, l.reviewsCount, l.bookingsCount, l.isFeatured, l.isReported, l.createdAt,
    ])
  );
  await logExport(actor, "listings", rows.length, { ...params });
  return { filename: `darna_listings_${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length };
}

function permissionForListingTarget(status: CanonicalListingStatus): Permission {
  switch (status) {
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

/**
 * Single guarded entry point for listing status changes: permission for the
 * target status, mandatory reason (reject / suspend / request changes), and
 * the allowed-transition map. Soft delete remembers the previous status.
 */
async function transitionListing(
  id: string,
  target: ListingStatus,
  actor: AdminActor,
  opts: { reason?: string; auditAction: string; notePrefix?: string }
): Promise<Listing> {
  const to = normalizeListingStatus(target);
  assertCan(actor.role, permissionForListingTarget(to));
  if (LISTING_STATUSES_REQUIRING_REASON.includes(to) && !isValidReason(opts.reason)) {
    throw new ValidationError(`A reason is required to move a listing to ${to}`);
  }
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new DomainError("Listing not found");
  const prev = { ...store.listings[idx] };
  if (!canTransitionListing(prev.status, to)) {
    throw new DomainError(`Cannot move a listing from ${prev.status} to ${to}`);
  }

  const next: Listing = {
    ...prev,
    status: to,
    statusBeforeDelete: to === "deleted" ? prev.status : prev.statusBeforeDelete,
    updatedAt: new Date().toISOString(),
    adminNotes: opts.reason?.trim()
      ? [...prev.adminNotes, `${opts.notePrefix ?? to}: ${opts.reason.trim()}`]
      : prev.adminNotes,
  };
  store.listings[idx] = next;

  await logAudit(
    actor,
    opts.auditAction,
    "listing",
    id,
    `Listing "${prev.title}": ${prev.status} -> ${to}${opts.reason?.trim() ? ` (${opts.reason.trim()})` : ""}`,
    { status: prev.status },
    { status: to }
  );

  return { ...next };
}

export async function approveListing(id: string, actor: AdminActor): Promise<Listing> {
  return transitionListing(id, "approved", actor, { auditAction: "LISTING_APPROVE" });
}

export async function rejectListing(id: string, reason: string, actor: AdminActor): Promise<Listing> {
  return transitionListing(id, "rejected", actor, { reason, auditAction: "LISTING_REJECT", notePrefix: "Rejected" });
}

export async function requestChangesListing(id: string, notes: string, actor: AdminActor): Promise<Listing> {
  return transitionListing(id, "changes_requested", actor, {
    reason: notes,
    auditAction: "LISTING_REQUEST_CHANGES",
    notePrefix: "Changes requested",
  });
}

export async function suspendListing(id: string, reason: string, actor: AdminActor): Promise<Listing> {
  return transitionListing(id, "suspended", actor, { reason, auditAction: "LISTING_SUSPEND", notePrefix: "Suspended" });
}

export async function deleteListing(id: string, actor: AdminActor): Promise<Listing> {
  return transitionListing(id, "deleted", actor, { auditAction: "LISTING_DELETE" });
}

/** deleted → the status the listing had before deletion (pending_review if unknown). */
export async function restoreListing(id: string, actor: AdminActor): Promise<Listing> {
  assertCan(actor.role, "listings.delete");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new DomainError("Listing not found");
  const prev = { ...store.listings[idx] };
  if (prev.status !== "deleted") throw new DomainError(`Only deleted listings can be restored (status ${prev.status})`);

  const restored: ListingStatus =
    prev.statusBeforeDelete && prev.statusBeforeDelete !== "deleted" ? prev.statusBeforeDelete : "pending_review";
  const next: Listing = { ...prev, status: restored, statusBeforeDelete: undefined, updatedAt: new Date().toISOString() };
  store.listings[idx] = next;

  await logAudit(
    actor,
    "LISTING_RESTORE",
    "listing",
    id,
    `Restored listing "${prev.title}" to ${restored}`,
    { status: prev.status },
    { status: restored }
  );

  return { ...next };
}

export async function featureListing(
  id: string,
  isFeatured: boolean,
  actor: AdminActor
): Promise<Listing> {
  assertCan(actor.role, "listings.feature");
  await delay(200);

  const idx = store.listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new DomainError("Listing not found");

  const prev = { ...store.listings[idx] };
  if (isFeatured && normalizeListingStatus(prev.status) !== "approved") {
    throw new DomainError("Only approved listings can be featured");
  }
  store.listings[idx] = { ...prev, isFeatured };

  await logAudit(
    actor,
    isFeatured ? "LISTING_FEATURE" : "LISTING_UNFEATURE",
    "listing",
    id,
    `${isFeatured ? "Featured" : "Unfeatured"} listing: ${prev.title}`,
    { isFeatured: prev.isFeatured },
    { isFeatured }
  );

  return { ...store.listings[idx] };
}

/** Generic status change used by the vertical list pages (same guards as above). */
export async function updateListingStatus(
  id: string,
  status: ListingStatus,
  actor: AdminActor,
  reason?: string
): Promise<Listing> {
  if (normalizeListingStatus(status) === "deleted") return deleteListing(id, actor);
  return transitionListing(id, status, actor, { reason, auditAction: "LISTING_STATUS_CHANGE" });
}
