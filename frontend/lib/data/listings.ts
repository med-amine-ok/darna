import "server-only";
import type { Listing, ListingVertical, RoomType, SearchParams } from "@/types";
import { addDaysToKey, eachNightKey, normalizeDateKey, todayKey } from "@/lib/booking/dates";
import type { ListingAvailability } from "@/lib/booking/availability";
import { WILAYAS } from "@/lib/algeria";
import { ApiError, api, apiAll, apiOrNull, currentApiToken, rowsOf, type Query } from "@/lib/api/client";
import {
  amenitySlugsFor,
  apiVerticalsFor,
  getReference,
  isUuid,
  propertyTypeIdFor,
  toListing,
  toMinor,
  type ApiHostListing,
  type ApiListingCard,
  type ApiListingDetail,
  type ApiReference,
} from "@/lib/api/catalog";

/**
 * Listings, read from and written to the Django API (apps/catalog):
 * - public: GET /listings (search), GET /listings/{id};
 * - host (active workspace of the session): /host/listings and its
 *   /status, /photos and /room-types sub-resources.
 * Reads never throw: an API failure gives an empty list or null and is logged.
 */

/** Only active (published) listings are public and bookable. */
export function isPublicListing(listing: Pick<Listing, "status">): boolean {
  return listing.status === "active";
}

/** Most rows one search page reads (the search page counts its filters on this pool). */
const SEARCH_POOL_MAX = 200;

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** A wilaya code when the destination is a wilaya name (any language), else undefined. */
function wilayaCodeFor(destination: string): number | undefined {
  const d = norm(destination);
  return WILAYAS.find((w) => [w.name, w.nameEn, w.nameAr].some((n) => n && norm(n) === d))?.code;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

export interface ListingSearch extends SearchParams {
  /** Only the listings of one host account. */
  hostAccount?: string;
  /** Only the listings of one individual host (user id). */
  hostUser?: string;
  featured?: boolean;
  /** Most rows to read (default 200, pages of 50). */
  limit?: number;
}

/** Query string of GET /listings for frontend search params (prices in dinars become centimes). */
export function listingSearchQuery(params: ListingSearch = {}): Query {
  const query: Query = {};
  const vertical = apiVerticalsFor(params.vertical);
  if (vertical) query.vertical = vertical;
  const destination = params.destination?.trim();
  if (destination) {
    const wilaya = wilayaCodeFor(destination);
    if (wilaya) query.wilaya = wilaya;
    else if (destination.length >= 2) query.q = destination.slice(0, 100);
  }
  const start = normalizeDateKey(params.startDate || params.checkIn);
  const end = normalizeDateKey(params.endDate || params.checkOut);
  if (start && end && start < end) {
    query.check_in = start;
    query.check_out = end;
  }
  const guests = Number(params.guests ?? (params as { guestCount?: number }).guestCount);
  if (Number.isFinite(guests) && guests > 1) query.guests = clamp(guests, 1, 50);
  if (params.minPrice && params.minPrice > 0) query.min_price_minor = toMinor(params.minPrice);
  if (params.maxPrice && params.maxPrice > 0) query.max_price_minor = toMinor(params.maxPrice);
  if (params.instantBook) query.instant = true;
  if (params.hostAccount && isUuid(params.hostAccount)) query.host_account = params.hostAccount;
  if (params.hostUser && isUuid(params.hostUser)) query.host_user = params.hostUser;
  if (params.featured) query.featured = true;
  return query;
}

/** Public search (published listings only). Trips are not listings: the "trip" vertical gives []. */
export async function getListings(params?: ListingSearch): Promise<Listing[]> {
  if (params?.vertical === "trip") return [];
  try {
    const limit = Math.max(1, Math.min(params?.limit ?? SEARCH_POOL_MAX, SEARCH_POOL_MAX));
    const [rows, ref] = await Promise.all([
      apiAll<ApiListingCard>(
        "/listings",
        { anonymous: true, query: { ...listingSearchQuery(params), page_size: Math.min(50, limit) } },
        Math.ceil(limit / 50),
      ),
      getReference(),
    ]);
    return rows.slice(0, limit).map((row) => toListing(row, ref));
  } catch (error) {
    console.error("[listings.search]", error);
    return [];
  }
}

async function publicDetail(id: string): Promise<Listing | null> {
  if (!id) return null;
  try {
    const [raw, ref] = await Promise.all([
      apiOrNull<ApiListingDetail>(`/listings/${encodeURIComponent(id)}`, { anonymous: true }),
      getReference(),
    ]);
    return raw ? toListing(raw, ref) : null;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 400)) console.error("[listings.detail]", error);
    return null;
  }
}

/** One listing of the session's host workspace (any status), or null. */
export async function getHostListingById(id: string): Promise<Listing | null> {
  if (!isUuid(id) || !currentApiToken()) return null;
  try {
    const [raw, ref] = await Promise.all([apiOrNull<ApiHostListing>(`/host/listings/${id}`), getReference()]);
    return raw ? toListing(raw, ref) : null;
  } catch (error) {
    if (!(error instanceof ApiError && error.status < 500)) console.error("[listings.hostDetail]", error);
    return null;
  }
}

/**
 * A listing by id or reference: the public page, else (draft, paused...) the
 * host view when the session's workspace owns it. Null otherwise.
 */
export async function getListingById(id: string): Promise<Listing | null> {
  return (await publicDetail(id)) ?? (await getHostListingById(id));
}

/**
 * Public lookup: published listings only, except that owners still see their
 * own drafts (pass `canSeeUnpublished`; the API itself only gives the host
 * view to the owning workspace).
 */
export async function getPublicListingById(
  id: string,
  canSeeUnpublished?: (listing: Listing) => boolean,
): Promise<Listing | null> {
  const listing = await publicDetail(id);
  if (listing) return listing;
  if (!canSeeUnpublished) return null;
  const own = await getHostListingById(id);
  return own && canSeeUnpublished(own) ? own : null;
}

/** Listings with a live featured placement (admin LST-09). */
export async function getFeaturedListings(vertical?: ListingVertical): Promise<Listing[]> {
  return getListings({ vertical, featured: true, limit: 24 });
}

/** Experiences and vehicles rails of the home page. */
export async function getListingsOfVertical(vertical: ListingVertical, limit = 24): Promise<Listing[]> {
  return getListings({ vertical, limit });
}

/**
 * Listings of the session's host workspace (every status). The owner key is
 * kept for the callers' signature: the API scopes by the active workspace.
 */
export async function getHostListings(_owner?: { userId?: string; organizationId?: string }): Promise<Listing[]> {
  if (!currentApiToken()) return [];
  try {
    const [rows, ref] = await Promise.all([apiAll<ApiHostListing>("/host/listings"), getReference()]);
    return rows.map((row) => toListing(row, ref));
  } catch (error) {
    if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
      console.error("[listings.host]", error);
    }
    return [];
  }
}

/** Published listings of one host (organisation page, public profile of an individual host). */
export async function getPublicListingsByHost(host: { hostAccountId?: string; userId?: string }): Promise<Listing[]> {
  if (!host.hostAccountId && !host.userId) return [];
  return getListings({ hostAccount: host.hostAccountId, hostUser: host.userId, limit: 100 });
}

// ---------------------------------------------------------------------------
// Writes (host)
// ---------------------------------------------------------------------------
export interface ListingOwner {
  hostUserId: string;
  organizationId?: string | null;
  businessCategory?: "agency" | "hotel" | "hostel";
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const int = (v: unknown, min: number, max: number) => {
  const n = num(v);
  return n === undefined ? undefined : clamp(n, min, max);
};
const hhmmss = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}/.test(v) ? `${v.slice(0, 5)}:00` : undefined);
const dateKey = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined);
const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v) && v.length <= 500;

/** Backend vertical of a frontend listing payload. */
function apiVerticalOf(d: Record<string, unknown>, businessCategory?: string): string {
  const category = d.category;
  const type = typeof d.type === "string" ? d.type.toLowerCase() : "";
  const hasRooms = Array.isArray(d.roomTypes) && d.roomTypes.length > 0;
  if (category === "vehicle" || category === "experience") return category;
  if (category === "hotel" || hasRooms || businessCategory === "hotel" || businessCategory === "hostel") {
    if (businessCategory === "hostel" || type.includes("hostel")) return "hostel";
    if (category === "hotel" || businessCategory === "hotel" || type.includes("hotel")) return "hotel";
  }
  return "home";
}

/** Commune id of a place ("Hydra, Algiers" or a commune name), through GET /geo/communes. */
async function communeIdFor(place: unknown): Promise<number | undefined> {
  if (typeof place !== "string" || !place.trim()) return undefined;
  const [communePart, wilayaPart] = place.split(",").map((p) => p.trim());
  const wilaya = wilayaPart ? wilayaCodeFor(wilayaPart) : undefined;
  try {
    const answer = await api<unknown>("/geo/communes", {
      anonymous: true,
      query: { q: communePart.slice(0, 60), wilaya, limit: 1 },
    });
    const row = rowsOf<{ id: number }>(answer)[0];
    return row?.id;
  } catch {
    return undefined;
  }
}

/**
 * Body of POST/PATCH /host/listings from a frontend listing payload. Only the
 * keys present in `input` are sent (a PATCH never clears what it does not name).
 */
async function listingWriteBody(
  input: Record<string, unknown>,
  ref: ApiReference | null,
  { create, businessCategory, vertical: knownVertical }: { create: boolean; businessCategory?: string; vertical?: string },
): Promise<Record<string, unknown>> {
  const has = (k: string) => input[k] !== undefined;
  const body: Record<string, unknown> = {};
  const vertical = knownVertical ?? apiVerticalOf(input, businessCategory);
  if (create) body.vertical = vertical;

  const title = str(input.title, 120);
  if (title) body.title = title;
  else if (create) body.title = "Untitled listing";
  if (has("description")) body.description = str(input.description, 8000) ?? "";
  if (vertical === "experience" && typeof input.experienceType === "string") body.experience_type = input.experienceType;
  if (has("type")) {
    const propertyType = propertyTypeIdFor(input.type, vertical, ref);
    if (propertyType) body.property_type = propertyType;
  }
  if (has("commune") || has("city")) {
    const commune = await communeIdFor(input.commune ?? input.city);
    if (commune) body.commune = commune;
  }
  if (Array.isArray(input.latlng) && input.latlng.length === 2) {
    const [lat, lng] = input.latlng.map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      body.latitude = lat.toFixed(6);
      body.longitude = lng.toFixed(6);
    }
  }
  if (has("address")) body.address_line = str(input.address, 255) ?? "";
  const guests = int(input.guestCount, 1, 500);
  if (guests !== undefined) body.capacity_guests = guests;
  const bedrooms = int(input.bedroomCount, 0, 100);
  if (bedrooms !== undefined) body.bedrooms = bedrooms;
  const bathrooms = num(input.bathroomCount);
  if (bathrooms !== undefined) body.bathrooms = Math.max(0, Math.round(bathrooms * 2) / 2).toFixed(1);
  const price = num(input.price);
  if (price !== undefined && price >= 0) body.base_price_minor = toMinor(price);
  const cleaning = num(input.cleaningFee);
  if (cleaning !== undefined && cleaning >= 0) body.cleaning_fee_minor = toMinor(cleaning);
  const minNights = int(input.minNights, 1, 365);
  if (minNights !== undefined) body.min_nights = minNights;
  const maxNights = int(input.maxNights, 1, 365);
  if (maxNights !== undefined) body.max_nights = maxNights;
  const notice = int(input.advanceNoticeDays, 0, 365);
  if (notice !== undefined) body.advance_notice_days = notice;
  if (has("checkInTime")) body.check_in_time = hhmmss(input.checkInTime) ?? null;
  if (has("checkOutTime")) body.check_out_time = hhmmss(input.checkOutTime) ?? null;
  if (has("availableFrom")) body.available_from = dateKey(input.availableFrom) ?? null;
  if (has("availableTo")) body.available_until = dateKey(input.availableTo) ?? null;
  if (input.bookingApprovalMode === "instant" || input.bookingApprovalMode === "request") {
    body.approval_mode = input.bookingApprovalMode;
  } else if (typeof input.instantBook === "boolean") {
    body.approval_mode = input.instantBook ? "instant" : "request";
  }
  if (input.cancellationPolicy === "flexible" || input.cancellationPolicy === "moderate" || input.cancellationPolicy === "strict") {
    body.cancellation_policy = input.cancellationPolicy;
  }
  if (Array.isArray(input.houseRules)) {
    body.house_rules = input.houseRules.filter((r): r is string => typeof r === "string").map((r) => r.slice(0, 200)).slice(0, 40);
  }
  if (Array.isArray(input.amenities)) body.amenities = amenitySlugsFor(input.amenities, ref);

  if (vertical === "vehicle") {
    const make = str(input.make, 40);
    const model = str(input.model, 60);
    const year = int(input.year, 1950, 2100);
    const seats = int(input.seats, 1, 60);
    const transmission = input.transmission === "manual" || input.transmission === "automatic" ? input.transmission : undefined;
    const fuel = str(input.fuelType, 12);
    if (make && model && year && seats && transmission && fuel) {
      body.vehicle_detail = { make, model, year, seats, transmission, fuel };
    }
  }
  if (vertical === "experience") {
    const hours = num(input.durationHours);
    const group = int(input.groupSize ?? input.guestCount, 1, 500);
    if (hours && hours > 0 && group) {
      body.experience_detail = {
        duration_minutes: Math.max(15, Math.round(hours * 60)),
        max_group: group,
        languages: (Array.isArray(input.experienceLanguages) ? input.experienceLanguages : [])
          .filter((l): l is string => typeof l === "string" && /^[a-z]{2}$/i.test(l))
          .map((l) => l.toLowerCase()),
        includes: (Array.isArray(input.includedItems) ? input.includedItems : [])
          .filter((i): i is string => typeof i === "string")
          .map((i) => i.slice(0, 120))
          .slice(0, 30),
      };
    }
  }
  return body;
}

/** Body of POST/PATCH /host/listings/{id}/room-types from a frontend room type. */
function roomTypeBody(room: Partial<RoomType>): Record<string, unknown> | null {
  const name = str(room.name, 80);
  const price = num(room.price ?? room.basePrice);
  if (!name || price === undefined || price <= 0) return null;
  return {
    name,
    description: str(room.description, 4000) ?? "",
    booking_unit: room.bookingUnit === "bed" ? "bed" : "room",
    unit_count: int(room.totalInventory ?? room.inventoryCount, 1, 10000) ?? 1,
    capacity_per_unit: int(room.capacity, 1, 50) ?? 1,
    base_price: { amount_minor: toMinor(price), currency: "DZD" },
    beds_description: str(room.bedsDescription, 120) ?? "",
  };
}

/** Make the listing's room types match `rooms`: create new ones, update kept ones, delete removed ones. */
async function syncRoomTypes(listingId: string, rooms: unknown): Promise<void> {
  if (!Array.isArray(rooms)) return;
  const existing = rowsOf<{ id: string }>(await api<unknown>(`/host/listings/${listingId}/room-types`));
  const existingIds = new Set(existing.map((r) => r.id));
  const keptIds = new Set<string>();
  for (const raw of rooms as Partial<RoomType>[]) {
    const body = roomTypeBody(raw ?? {});
    if (!body) continue;
    if (raw.id && existingIds.has(raw.id)) {
      keptIds.add(raw.id);
      await api(`/host/listings/${listingId}/room-types/${raw.id}`, { method: "PATCH", body });
    } else {
      await api(`/host/listings/${listingId}/room-types`, { method: "POST", body });
    }
  }
  for (const id of Array.from(existingIds)) {
    if (!keptIds.has(id)) await api(`/host/listings/${listingId}/room-types/${id}`, { method: "DELETE" });
  }
}

/** Add photos by URL (the API keeps URLs until media uploads exist); the first one is the cover. */
async function addPhotos(listingId: string, urls: unknown, coverFirst: boolean): Promise<void> {
  const list = (Array.isArray(urls) ? urls : []).filter(isHttpUrl).slice(0, 30);
  for (let i = 0; i < list.length; i++) {
    await api(`/host/listings/${listingId}/photos`, { method: "POST", body: { url: list[i], is_cover: coverFirst && i === 0 } });
  }
}

/**
 * Ask for "active" or "draft" with the moves the API allows now (BR-LST-03):
 * active = resume a paused listing, else submit it for review; draft = pause
 * a live listing, else withdraw it to draft.
 */
async function changeStatus(listingId: string, wanted: "active" | "draft", allowed: string[]): Promise<void> {
  const target =
    wanted === "active"
      ? (["published", "pending_review"].find((s) => allowed.includes(s)) ?? "pending_review")
      : (["paused", "draft"].find((s) => allowed.includes(s)) ?? "paused");
  await api(`/host/listings/${listingId}/status`, { method: "POST", body: { status: target } });
}

async function hostListing(id: string): Promise<Listing> {
  const [raw, ref] = await Promise.all([api<ApiHostListing>(`/host/listings/${id}`), getReference()]);
  return toListing(raw, ref);
}

/**
 * Create a listing in the session's workspace (POST /host/listings), add its
 * photos and room types, then send it to review unless it is a draft
 * (DEC-003: going live always passes review). An incomplete listing stays a
 * draft the host can finish later. Throws ApiError when the API refuses it.
 */
export async function createListing(owner: ListingOwner, input: unknown): Promise<Listing> {
  const d = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const ref = await getReference();
  const body = await listingWriteBody(d, ref, { create: true, businessCategory: owner.businessCategory });
  const created = await api<ApiHostListing>("/host/listings", { method: "POST", body });
  await addPhotos(created.id, d.imageSrc, true);
  if (Array.isArray(d.roomTypes) && d.roomTypes.length > 0) await syncRoomTypes(created.id, d.roomTypes);
  if (d.status !== "draft") {
    try {
      await changeStatus(created.id, "active", ["pending_review"]);
    } catch (error) {
      if (!(error instanceof ApiError && error.status < 500)) throw error;
    }
  }
  return hostListing(created.id);
}

/**
 * Apply a patch from the host screens: content fields (PATCH), `status`
 * ("active" / "draft") and `roomTypes` (synced). Null when the listing is
 * not one of the workspace's. Throws ApiError when the API refuses a change.
 */
export async function updateListing(id: string, input: unknown): Promise<Listing | null> {
  if (!isUuid(id)) return null;
  const current = await getHostListingById(id);
  if (!current) return null;
  const d = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const ref = await getReference();
  const { status, roomTypes, imageSrc, ...content } = d;

  const vertical =
    current.category === "hotel" ? (current.businessCategory === "hostel" ? "hostel" : "hotel") : current.category;
  const body = await listingWriteBody(content, ref, { create: false, vertical });
  if (Object.keys(body).length > 0) await api(`/host/listings/${id}`, { method: "PATCH", body });
  if (roomTypes !== undefined) await syncRoomTypes(id, roomTypes);
  if (Array.isArray(imageSrc)) {
    const known = new Set(current.imageSrc);
    await addPhotos(id, imageSrc.filter((u) => !known.has(u as string)), current.imageSrc.length === 0);
  }
  if (status === "active" || status === "draft") {
    const fresh = await getHostListingById(id);
    const isLive = fresh?.status === "active";
    if ((status === "active") !== isLive) await changeStatus(id, status, fresh?.allowedStatusChanges ?? []);
  }
  return hostListing(id);
}

/** Soft-delete one of the workspace's listings (an admin can restore it). */
export async function deleteListing(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  try {
    await api(`/host/listings/${id}`, { method: "DELETE" });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Public calendar (GET /listings/{id}/availability, apps/inventory)
// ---------------------------------------------------------------------------
interface ApiAvailabilityNight {
  date: string;
  available: boolean;
  reason: string | null;
  units_left?: number;
  price: { amount_minor: number; currency: string };
}

interface ApiAvailability {
  today: string;
  nights?: ApiAvailabilityNight[];
  room_types?: { room_type_id: string; nights: ApiAvailabilityNight[] }[];
  slots?: { starts_at: string; seats_left: number; is_cancelled: boolean }[];
}

/** How far ahead the booking calendars look (the API allows 366 days per call). */
const CALENDAR_DAYS = 365;

/**
 * Unavailable nights and per-night prices of a public listing for the next
 * year, in the shapes the booking widgets read. Homes and vehicles: nights
 * not free; hotels and hostels: nights with no unit left, per room type;
 * experiences: days without an open slot with seats. Prices that differ from
 * the base price become overrides (whole-listing stays only). On failure the
 * calendar is open and the server re-checks at booking time.
 */
export async function getPublicAvailability(
  listing: Pick<Listing, "id" | "price" | "category" | "roomTypes">,
): Promise<{ availability: ListingAvailability; priceOverrides: Record<string, number> }> {
  const today = todayKey();
  const empty = { availability: { today, unavailable: [], unavailableByRoomType: {} }, priceOverrides: {} };
  if (!isUuid(listing.id)) return empty;
  try {
    const to = addDaysToKey(today, CALENDAR_DAYS);
    const body = await api<ApiAvailability>(`/listings/${listing.id}/availability`, {
      anonymous: true,
      query: { from: today, to },
    });
    const start = body.today || today;
    const unavailableByRoomType: Record<string, string[]> = {};
    for (const room of body.room_types ?? []) {
      unavailableByRoomType[room.room_type_id] = room.nights.filter((n) => !n.available && n.date >= start).map((n) => n.date);
    }
    let unavailable: string[] = [];
    const priceOverrides: Record<string, number> = {};
    if (body.nights) {
      unavailable = body.nights.filter((n) => !n.available && n.date >= start).map((n) => n.date);
      for (const n of body.nights) {
        const price = Math.round(n.price.amount_minor / 100);
        if (n.available && price > 0 && price !== listing.price) priceOverrides[n.date] = price;
      }
    } else if (body.slots) {
      const open = new Set(body.slots.filter((s) => !s.is_cancelled && s.seats_left > 0).map((s) => s.starts_at.slice(0, 10)));
      unavailable = eachNightKey(start, to).filter((d) => !open.has(d));
    }
    return { availability: { today: start, unavailable, unavailableByRoomType }, priceOverrides };
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) console.error("[listings.availability]", error);
    return empty;
  }
}
