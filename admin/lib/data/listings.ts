import "server-only";

import { ApiError, api, apiAll, apiOrNull } from "@/lib/api/client";
import { logReadError, write } from "@/lib/api/mapping";
import {
  toApiStatus,
  toApiVertical,
  toListing,
  toListingFromRow,
  type ApiAdminListing,
  type ApiAdminListingRow,
} from "@/lib/api/listings";
import { toListingFromTrip, type ApiAdminTrip } from "@/lib/api/trips";
import { Listing, ListingStatus, PaginatedResult, AdminActor } from "@/lib/types";
import { normalizeListingStatus } from "@/lib/domain/transitions";
import { toCsv, type CsvExport } from "@/lib/utils/csv";
import { logExport } from "./audit";
import { DomainError } from "./errors";

/**
 * Listings and trips of the admin console, read from and written to the
 * Django API (/admin/listings, /admin/trips). Status changes, permissions,
 * reasons and the audit trail are enforced by the backend.
 *
 * The queue endpoint only filters by status, vertical and host and its rows
 * are light (no price, place, rating). The other filters of the screens are
 * applied here: rows are read in full (page by page) and, when a filter or
 * sort needs detail fields, the detail of each candidate row is read (capped).
 */

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

/** Pages of 50 rows read from a queue endpoint (2,000 rows). */
const MAX_QUEUE_PAGES = 40;
/** Most listing details read for one list request (filters and sorts on detail fields). */
const DETAIL_CAP = 120;
const DETAIL_CONCURRENCY = 8;

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

  if (fStatus === "pending" || fStatus === "pending_review") {
    return lStatus === "pending" || lStatus === "pending_review";
  }
  if (fStatus === "published" || fStatus === "approved") {
    return lStatus === "published" || lStatus === "approved";
  }
  if (fStatus === "refused" || fStatus === "rejected") {
    return lStatus === "refused" || lStatus === "rejected";
  }
  return lStatus === fStatus;
}

// ------------------------------------------------------------------- reads

async function listingRows(vertical: string | undefined, deleted: boolean): Promise<Listing[]> {
  const rows = await apiAll<ApiAdminListingRow>(
    "/admin/listings",
    { query: { vertical: vertical ? toApiVertical(vertical) : undefined, deleted: deleted ? "true" : undefined } },
    MAX_QUEUE_PAGES,
  );
  return rows.map(toListingFromRow);
}

async function tripRows(deleted: boolean): Promise<Listing[]> {
  const rows = await apiAll<ApiAdminTrip>(
    "/admin/trips",
    { query: { deleted: deleted ? "true" : undefined } },
    MAX_QUEUE_PAGES,
  );
  return rows.map(toListingFromTrip);
}

/** Every row of one vertical ("all" = listings and trips). */
async function rowsOf(vertical: string | undefined, deleted: boolean): Promise<Listing[]> {
  if (vertical === "trip") return tripRows(deleted);
  if (vertical) return listingRows(vertical, deleted);
  const [listings, trips] = await Promise.all([listingRows(undefined, deleted), tripRows(deleted)]);
  return [...listings, ...trips];
}

async function fetchListingDetail(id: string): Promise<Listing | null> {
  const raw = await apiOrNull<ApiAdminListing>(`/admin/listings/${encodeURIComponent(id)}`);
  return raw ? toListing(raw) : null;
}

/** Replaces queue rows by their full detail (trips are already complete), a few at a time. */
async function enrich(rows: Listing[]): Promise<Listing[]> {
  const out = [...rows];
  const todo = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.category !== "trip");
  for (let i = 0; i < todo.length; i += DETAIL_CONCURRENCY) {
    const chunk = todo.slice(i, i + DETAIL_CONCURRENCY);
    const details = await Promise.all(
      chunk.map(({ row }) =>
        fetchListingDetail(row.id).catch((error) => {
          logReadError(`listing ${row.id}`, error);
          return null;
        }),
      ),
    );
    chunk.forEach(({ index }, k) => {
      const detail = details[k];
      if (detail) out[index] = detail;
    });
  }
  return out;
}

/** enrich() on the first DETAIL_CAP rows; the rest stay light (very large exports). */
async function enrichCapped(rows: Listing[]): Promise<Listing[]> {
  if (rows.length <= DETAIL_CAP) return enrich(rows);
  return [...(await enrich(rows.slice(0, DETAIL_CAP))), ...rows.slice(DETAIL_CAP)];
}

const active = (v: string | undefined | null) => Boolean(v && v !== "all");

/** Filters and sorts that need fields the queue rows do not carry. */
function needsDetail(params: ListingFilterParams): boolean {
  const wilaya = Array.isArray(params.wilayaCode) ? params.wilayaCode.length > 0 : active(params.wilayaCode);
  return (
    wilaya ||
    (params.minPrice ?? 0) > 0 ||
    (params.maxPrice ?? 0) > 0 ||
    active(params.approvalMode) ||
    params.isFeatured !== undefined ||
    (params.minCapacity ?? 0) > 0 ||
    (params.minBedrooms ?? 0) > 0 ||
    active(params.amenity) ||
    active(params.experienceType) ||
    params.sortBy === "price" ||
    params.sortBy === "rating"
  );
}

function applyRowFilters(rows: Listing[], params: ListingFilterParams): Listing[] {
  let filtered = rows;
  if (params.status && params.status !== "all") {
    filtered = filtered.filter((l) => matchListingStatus(l.status, params.status!));
  }
  if (params.hostType && params.hostType !== "all") {
    filtered = filtered.filter((l) => l.hostType === params.hostType);
  }
  if (params.tripType && params.tripType !== "all") {
    filtered = filtered.filter((l) => l.tripType === params.tripType);
  }
  if (params.isReported === true) {
    // The backend has no "reported" flag on listings: nothing matches.
    filtered = [];
  }
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.hostName.toLowerCase().includes(q) ||
        (l.formattedId ?? "").toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.propertyType.toLowerCase().includes(q),
    );
  }
  return filtered;
}

function applyDetailFilters(rows: Listing[], params: ListingFilterParams): Listing[] {
  let filtered = rows;
  if (params.wilayaCode && params.wilayaCode !== "all") {
    const codes = Array.isArray(params.wilayaCode) ? params.wilayaCode : [params.wilayaCode];
    if (codes.length > 0) filtered = filtered.filter((l) => codes.includes(l.wilayaCode));
  }
  if (params.minPrice !== undefined && params.minPrice > 0) filtered = filtered.filter((l) => l.price >= params.minPrice!);
  if (params.maxPrice !== undefined && params.maxPrice > 0) filtered = filtered.filter((l) => l.price <= params.maxPrice!);
  if (params.approvalMode && params.approvalMode !== "all") {
    filtered = filtered.filter((l) => l.bookingApprovalMode === params.approvalMode);
  }
  if (params.isFeatured !== undefined) filtered = filtered.filter((l) => l.isFeatured === params.isFeatured);
  if (params.minCapacity && params.minCapacity > 0) filtered = filtered.filter((l) => l.guestCapacity >= params.minCapacity!);
  if (params.minBedrooms && params.minBedrooms > 0) {
    filtered = filtered.filter((l) => (l.bedroomCount || 0) >= params.minBedrooms!);
  }
  if (params.amenity && params.amenity !== "all") filtered = filtered.filter((l) => l.amenities.includes(params.amenity!));
  if (params.experienceType && params.experienceType !== "all") {
    filtered = filtered.filter((l) => l.experienceType === params.experienceType);
  }
  return filtered;
}

function sortRows(rows: Listing[], params: ListingFilterParams): Listing[] {
  const sortBy = params.sortBy || "created";
  const order = params.sortOrder === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === "price") return (a.price - b.price) * order;
    if (sortBy === "rating") return (a.rating - b.rating) * order;
    if (sortBy === "bookings") return (a.bookingsCount - b.bookingsCount) * order;
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
  });
}

function statusFacet(rows: Listing[]): Record<string, number> {
  const count = (key: string) => rows.filter((l) => matchListingStatus(l.status, key)).length;
  return {
    all: rows.length,
    pending: count("pending"),
    pending_review: count("pending_review"),
    approved: count("approved"),
    published: count("published"),
    changes_requested: count("changes_requested"),
    rejected: count("rejected"),
    refused: count("refused"),
    suspended: count("suspended"),
    archived: count("archived"),
    draft: count("draft"),
  };
}

function emptyResult(page: number, pageSize: number): PaginatedResult<Listing> {
  return { rows: [], total: 0, page, pageSize, totalPages: 1, facets: { status: {}, vertical: {}, experienceType: {}, tripType: {} } };
}

export async function listListings(params: ListingFilterParams = {}): Promise<PaginatedResult<Listing>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 12);
  const vertical = params.vertical && params.vertical !== "all" ? params.vertical : undefined;
  const wantsDeleted = Boolean(params.status && params.status.split(",").some((s) => s.trim() === "deleted"));

  try {
    // Every live row (all verticals, for the vertical facet), plus deleted rows when asked.
    const [all, deleted] = await Promise.all([
      rowsOf(undefined, false),
      wantsDeleted ? rowsOf(vertical, true) : Promise.resolve([] as Listing[]),
    ]);
    let scoped = vertical ? all.filter((l) => l.category === vertical) : all;

    // Experience types are only in the detail: read them for the experience screens.
    if (vertical === "experience") scoped = await enrichCapped(scoped);

    const facets: Record<string, Record<string, number>> = {
      status: statusFacet(scoped),
      vertical: {
        all: all.length,
        home: all.filter((l) => l.category === "home").length,
        hotel: all.filter((l) => l.category === "hotel").length,
        experience: all.filter((l) => l.category === "experience").length,
        vehicle: all.filter((l) => l.category === "vehicle").length,
        trip: all.filter((l) => l.category === "trip").length,
      },
      experienceType: countBy(scoped, (l) => l.experienceType),
      tripType: countBy(scoped, (l) => l.tripType),
    };

    let filtered = applyRowFilters([...scoped, ...deleted], params);
    if (needsDetail(params)) {
      if (filtered.length > DETAIL_CAP) {
        console.warn(`[listings] detail filters applied to the first ${DETAIL_CAP} of ${filtered.length} rows`);
      }
      filtered = applyDetailFilters(await enrich(filtered.slice(0, DETAIL_CAP)), params);
    }
    filtered = sortRows(filtered, params);

    const total = filtered.length;
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
    // Rows still light (no filter needed the detail): read the detail of this page only.
    const rows = needsDetail(params) || vertical === "experience" ? pageRows : await enrichCapped(pageRows);
    return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1, facets };
  } catch (error) {
    logReadError("listListings", error);
    return emptyResult(page, pageSize);
  }
}

export async function getListingById(id: string): Promise<Listing | null> {
  try {
    const listing = await fetchListingDetail(id);
    if (listing) return listing;
    const trip = await apiOrNull<ApiAdminTrip>(`/admin/trips/${encodeURIComponent(id)}`);
    return trip ? toListingFromTrip(trip) : null;
  } catch (error) {
    logReadError(`getListingById ${id}`, error);
    return null;
  }
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

// ------------------------------------------------------------------ writes

const listingPath = (id: string) => `/admin/listings/${encodeURIComponent(id)}`;
const tripPath = (id: string) => `/admin/trips/${encodeURIComponent(id)}`;

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

/**
 * Runs a listing write; an id the listing endpoints do not know is tried as a
 * trip (the screens show trips as listings of the "trip" vertical).
 */
async function onListingOrTrip(
  id: string,
  listingCall: () => Promise<ApiAdminListing | null>,
  tripCall: () => Promise<ApiAdminTrip>,
): Promise<Listing> {
  return write(async () => {
    try {
      const raw = await listingCall();
      if (raw) return toListing(raw);
      const reread = await api<ApiAdminListing>(listingPath(id));
      return toListing(reread);
    } catch (error) {
      if (!isNotFound(error)) throw error;
      return toListingFromTrip(await tripCall());
    }
  });
}

function tripStatus(id: string, status: string, reason?: string): Promise<ApiAdminTrip> {
  return api<ApiAdminTrip>(`${tripPath(id)}/status`, { method: "POST", body: { status, reason: reason || undefined } });
}

function listingAction(id: string, action: string, reason?: string): Promise<ApiAdminListing> {
  return api<ApiAdminListing>(`${listingPath(id)}/${action}`, { method: "POST", body: reason ? { reason } : {} });
}

export async function approveListing(id: string, _actor: AdminActor): Promise<Listing> {
  return onListingOrTrip(id, () => listingAction(id, "approve"), () => tripStatus(id, "published"));
}

export async function rejectListing(id: string, reason: string, _actor: AdminActor): Promise<Listing> {
  return onListingOrTrip(id, () => listingAction(id, "reject", reason), () => tripStatus(id, "rejected", reason));
}

export async function requestChangesListing(id: string, notes: string, _actor: AdminActor): Promise<Listing> {
  return onListingOrTrip(
    id,
    () => listingAction(id, "request-changes", notes),
    () => tripStatus(id, "changes_requested", notes),
  );
}

export async function suspendListing(id: string, reason: string, _actor: AdminActor): Promise<Listing> {
  return onListingOrTrip(id, () => listingAction(id, "suspend", reason), () => tripStatus(id, "suspended", reason));
}

export async function deleteListing(id: string, _actor: AdminActor): Promise<Listing> {
  return onListingOrTrip(
    id,
    async () => {
      await api<null>(listingPath(id), { method: "DELETE" });
      return null; // 204: read the listing back
    },
    () => tripStatus(id, "deleted"),
  );
}

/** deleted -> the status the listing had before deletion (backend rule). */
export async function restoreListing(id: string, _actor: AdminActor): Promise<Listing> {
  return onListingOrTrip(
    id,
    () => listingAction(id, "restore"),
    async () => {
      const trip = await api<ApiAdminTrip>(tripPath(id));
      if (!trip.deleted_at) throw new DomainError("Only deleted trips can be restored");
      return tripStatus(id, trip.status_before_delete || "draft");
    },
  );
}

export async function featureListing(id: string, isFeatured: boolean, _actor: AdminActor): Promise<Listing> {
  return write(async () => {
    try {
      return toListing(
        await api<ApiAdminListing>(`${listingPath(id)}/featured`, { method: "PUT", body: { is_featured: isFeatured } }),
      );
    } catch (error) {
      if (isNotFound(error)) throw new DomainError("Trips cannot be featured");
      throw error;
    }
  });
}

/** Generic status change used by the vertical list pages (the backend checks the move and the reason). */
export async function updateListingStatus(
  id: string,
  status: ListingStatus,
  actor: AdminActor,
  reason?: string
): Promise<Listing> {
  const target = normalizeListingStatus(status);
  if (target === "deleted") return deleteListing(id, actor);
  const apiStatus = toApiStatus(target);
  const body = { status: apiStatus, reason: reason?.trim() || undefined };
  return onListingOrTrip(
    id,
    () => api<ApiAdminListing>(`${listingPath(id)}/status`, { method: "POST", body }),
    () => tripStatus(id, apiStatus, body.reason),
  );
}
