import "server-only";

import type { HostType, Listing, ListingStatus, ListingVertical, RoomType } from "@/lib/types";
import { isExperienceType } from "@/lib/catalog-types";
import { normalizeListingStatus } from "@/lib/domain/transitions";
import { dzd, type ApiMoney } from "./mapping";

/**
 * Mappers between the Django catalog API (apps/catalog, /admin/listings) and
 * the admin `Listing` type. Money arrives in centimes and is shown in dinars.
 */

export interface ApiHostCard {
  id: string;
  display_name: string;
  host_type: string;
  rating_avg: number | null;
  review_count: number;
  verified: boolean;
}

export interface ApiCommuneRef {
  id: number | string;
  name: string;
  wilaya_code: number | string;
  wilaya_name: string;
}

/** Row of GET /admin/listings (AdminListingRowSerializer). */
export interface ApiAdminListingRow {
  id: string;
  reference: string | null;
  vertical: string;
  title: string;
  status: string;
  host: ApiHostCard;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface ApiPhoto {
  url: string;
  caption?: string;
  is_cover?: boolean;
  sort_order?: number;
}

interface ApiAmenity {
  id: string;
  slug: string;
  name_en: string;
  name_fr: string;
  name_ar: string;
}

interface ApiRoomType {
  id: string;
  name: string;
  description?: string | null;
  booking_unit: string;
  unit_count: number;
  capacity_per_unit: number;
  base_price: ApiMoney | null;
  beds_description?: string | null;
  amenity_ids?: string[];
  photos?: { thumb_url?: string; url?: string }[];
}

/** GET /admin/listings/{id} (AdminListingSerializer). */
export interface ApiAdminListing {
  id: string;
  reference: string | null;
  vertical: string;
  experience_type: string | null;
  title: string;
  description?: string;
  property_type: string | null;
  category: string | null;
  commune: ApiCommuneRef | null;
  location_public: { lat: number; lng: number } | null;
  price_from: ApiMoney | null;
  price_unit?: string;
  rating_avg: number | null;
  review_count: number;
  instant_bookable: boolean;
  host_type: string;
  capacity_guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: string | number | null;
  surface_m2: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  house_rules: unknown;
  amenities: ApiAmenity[];
  photos: ApiPhoto[];
  room_types: ApiRoomType[];
  host: ApiHostCard;
  status: string;
  moderation_note: string | null;
  address_line: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  approval_mode: string | null;
  base_price_minor?: number | null;
  cleaning_fee?: ApiMoney | null;
  weekly_discount_bp?: number | null;
  monthly_discount_bp?: number | null;
  min_nights?: number | null;
  cancellation_policy?: { code: string; name_en: string; name_fr: string; name_ar: string } | null;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  status_before_delete: string | null;
  is_featured: boolean;
  vehicle_detail?: Record<string, unknown> | null;
  experience_detail?: Record<string, unknown> | null;
}

const HOST_TYPES: HostType[] = ["individual", "agency", "hotel", "hostel"];

export function toHostType(value: string | null | undefined): HostType {
  return (HOST_TYPES as string[]).includes(value ?? "") ? (value as HostType) : "individual";
}

/** Backend vertical (home, hotel, hostel, experience, vehicle) to the admin vertical. */
export function toVertical(value: string): ListingVertical {
  if (value === "hostel") return "hotel";
  if (value === "home" || value === "hotel" || value === "experience" || value === "vehicle" || value === "trip") return value;
  return "home";
}

/** Admin vertical to the backend filter (hotel covers hotels and hostels). */
export function toApiVertical(value: string): string {
  return value === "hotel" ? "hotel,hostel" : value;
}

/**
 * Backend status to the admin status. "published" is the canonical "approved".
 * The admin model has no "paused" (hidden by the host): it is shown as
 * "archived" with a note, which offers the same admin moves (republish, delete).
 */
export function toListingStatus(status: string, deletedAt?: string | null): ListingStatus {
  if (deletedAt) return "deleted";
  switch (status) {
    case "published":
      return "approved";
    case "paused":
      return "archived";
    case "draft":
    case "pending_review":
    case "changes_requested":
    case "rejected":
    case "suspended":
    case "archived":
    case "deleted":
      return status;
    default:
      return "draft";
  }
}

/** Admin status to the backend status of POST .../status. */
export function toApiStatus(status: ListingStatus): string {
  const canonical = normalizeListingStatus(status);
  return canonical === "approved" ? "published" : canonical;
}

/** Display id (#H..., #EXP..., #V..., #T...): the backend reference when there is one. */
function displayId(id: string, reference: string | null | undefined, vertical: ListingVertical): string {
  if (reference) return reference;
  const tail = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const prefix = vertical === "experience" ? "EXP" : vertical === "trip" ? "T" : vertical === "vehicle" ? "V" : "H";
  return `#${prefix}${tail}`;
}

function num(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function baseListing(input: {
  id: string;
  reference: string | null;
  vertical: string;
  title: string;
  status: string;
  host: ApiHostCard | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}): Listing {
  const vertical = toVertical(input.vertical);
  return {
    id: input.id,
    formattedId: displayId(input.id, input.reference, vertical),
    title: input.title,
    description: "",
    category: vertical,
    vertical,
    propertyType: input.vertical,
    hostId: input.host?.id ?? "",
    hostName: input.host?.display_name ?? "",
    hostType: toHostType(input.host?.host_type),
    status: toListingStatus(input.status, input.deletedAt),
    price: 0,
    imageSrc: [],
    createdAt: input.createdAt,
    updatedAt: input.updatedAt || input.createdAt,
    wilayaCode: "",
    city: "",
    coordinates: { lat: 0, lng: 0 },
    guestCapacity: 0,
    rating: 0,
    reviewsCount: 0,
    bookingsCount: 0,
    amenities: [],
    bookingApprovalMode: "request",
    isFeatured: false,
    isReported: false,
    adminNotes: input.status === "paused" ? ["Paused by the host"] : [],
  };
}

/** A queue row: only the light fields the list endpoint returns. */
export function toListingFromRow(row: ApiAdminListingRow): Listing {
  return baseListing({
    id: row.id,
    reference: row.reference,
    vertical: row.vertical,
    title: row.title,
    status: row.status,
    host: row.host,
    createdAt: row.submitted_at || row.created_at,
    updatedAt: row.published_at || row.submitted_at,
    deletedAt: row.deleted_at,
  });
}

function toRoomType(listingId: string, room: ApiRoomType): RoomType {
  return {
    id: room.id,
    propertyListingId: listingId,
    name: room.name,
    description: room.description ?? undefined,
    price: dzd(room.base_price),
    bookingUnit: room.booking_unit === "bed" ? "bed" : "room",
    totalInventory: room.unit_count,
    capacity: room.capacity_per_unit,
    bedsDescription: room.beds_description ?? undefined,
    amenities: room.amenity_ids ?? [],
    imageSrc: (room.photos ?? []).map((p) => p.thumb_url || p.url || "").filter(Boolean),
  };
}

/** The full admin listing (detail endpoint and action answers). */
export function toListing(raw: ApiAdminListing): Listing {
  const base = baseListing({
    id: raw.id,
    reference: raw.reference,
    vertical: raw.vertical,
    title: raw.title,
    status: raw.status,
    host: raw.host,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    deletedAt: raw.deleted_at,
  });
  const photos = [...(raw.photos ?? [])].sort(
    (a, b) => Number(Boolean(b.is_cover)) - Number(Boolean(a.is_cover)) || (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const images = photos.map((p) => p.url).filter(Boolean);
  const lat = num(raw.latitude) ?? raw.location_public?.lat ?? 0;
  const lng = num(raw.longitude) ?? raw.location_public?.lng ?? 0;
  const price = raw.base_price_minor !== undefined && raw.base_price_minor !== null ? dzd(raw.base_price_minor) : dzd(raw.price_from);
  const notes = [...base.adminNotes];
  if (raw.moderation_note) notes.push(raw.moderation_note);
  const specs: Record<string, unknown> = {};
  if (raw.vehicle_detail) Object.assign(specs, raw.vehicle_detail);
  if (raw.experience_detail) Object.assign(specs, raw.experience_detail);
  if (Array.isArray(raw.house_rules) && raw.house_rules.length) specs.houseRules = raw.house_rules;
  // Pricing and stay terms read by the detail panels (ListingPanelSpecs in the list clients).
  specs.cleaningFeeDzd = raw.cleaning_fee ? dzd(raw.cleaning_fee) : null;
  specs.weeklyDiscountBp = raw.weekly_discount_bp ?? null;
  specs.monthlyDiscountBp = raw.monthly_discount_bp ?? null;
  specs.minNights = raw.min_nights ?? null;
  specs.cancellationPolicy = raw.cancellation_policy ?? null;
  return {
    ...base,
    description: raw.description ?? "",
    propertyType: raw.property_type || raw.category || raw.vertical,
    experienceType: isExperienceType(raw.experience_type) ? raw.experience_type : undefined,
    statusBeforeDelete: raw.status_before_delete ? toListingStatus(raw.status_before_delete) : undefined,
    price,
    priceDzd: price,
    imageSrc: images,
    images,
    wilayaCode: raw.commune ? String(raw.commune.wilaya_code).padStart(2, "0") : "",
    city: raw.commune?.name ?? "",
    address: raw.address_line ?? undefined,
    coordinates: { lat, lng },
    guestCapacity: raw.capacity_guests ?? 0,
    bedroomCount: raw.bedrooms ?? undefined,
    bathroomCount: num(raw.bathrooms),
    surfaceM2: raw.surface_m2 ?? undefined,
    rating: raw.rating_avg ?? 0,
    reviewsCount: raw.review_count ?? 0,
    amenities: (raw.amenities ?? []).map((a) => a.slug),
    bookingApprovalMode: raw.instant_bookable ? "instant" : "request",
    isFeatured: Boolean(raw.is_featured),
    adminNotes: notes,
    rooms: raw.room_types?.length ? raw.room_types.map((r) => toRoomType(raw.id, r)) : undefined,
    houseRules:
      raw.check_in_time || raw.check_out_time
        ? {
            checkInTime: (raw.check_in_time ?? "").slice(0, 5),
            checkOutTime: (raw.check_out_time ?? "").slice(0, 5),
            petsAllowed: hasRule(raw.house_rules, "pets_allowed"),
            partiesAllowed: hasRule(raw.house_rules, "parties_allowed"),
            smokingAllowed: hasRule(raw.house_rules, "smoking_allowed"),
            childrenAllowed: hasRule(raw.house_rules, "children_allowed"),
          }
        : undefined,
    specs,
  };
}

/** house_rules is a free list of rule codes or short texts: a flag is true only when its code is listed. */
function hasRule(rules: unknown, code: string): boolean {
  return Array.isArray(rules) && rules.some((r) => typeof r === "string" && r === code);
}
