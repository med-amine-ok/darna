import "server-only";
import type {
  CancellationPolicy,
  Listing,
  ListingStatus,
  ListingVertical,
  PublicOrganization,
  Review,
  RoomType,
  Trip,
  TripItineraryDay,
} from "@/types";
import { getTripCoordinates } from "@/lib/trip-coordinates";
import { isExperienceType, isTripType, EXPERIENCE_TYPE_LABELS } from "@/lib/catalog-types";
import { API_BASE, api } from "./client";

/**
 * Catalog mappers: backend JSON (apps/catalog, apps/trips, apps/reviews,
 * apps/search) -> the frontend types in types.ts. Money comes in integer
 * centimes (`amount_minor`); the frontend types use whole dinars.
 */

// ---------------------------------------------------------------------------
// Shapes of the API (only the fields the website reads)
// ---------------------------------------------------------------------------
export interface ApiMoney {
  amount_minor: number;
  currency: string;
}

export interface ApiCommuneRef {
  id: number;
  name: string;
  wilaya_code: number;
  wilaya_name: string;
}

export interface ApiHostCard {
  id: string;
  display_name: string;
  host_type: "individual" | "agency" | "hotel" | "hostel";
  rating_avg: number | null;
  review_count: number;
  verified: boolean;
  organization_id?: string | null;
  organization_slug?: string | null;
  user_id?: string | null;
}

export interface ApiPhoto {
  id?: string;
  url: string;
  caption?: string;
  sort_order?: number;
  is_cover?: boolean;
  room_type_id?: string | null;
}

export interface ApiRoomType {
  id: string;
  name: string;
  description: string;
  booking_unit: "room" | "bed";
  unit_count: number;
  capacity_per_unit: number;
  base_price: ApiMoney;
  beds_description: string;
  sort_order: number;
  is_active?: boolean;
  amenity_ids?: string[];
  photos?: { url: string; is_cover?: boolean }[];
}

export interface ApiListingCard {
  id: string;
  reference: string;
  vertical: "home" | "hotel" | "hostel" | "experience" | "vehicle";
  experience_type: string | null;
  title: string;
  property_type: string | null;
  commune: ApiCommuneRef | null;
  location_public: { lat: number; lng: number } | null;
  cover_photo: { url: string; caption: string } | null;
  price_from: ApiMoney;
  price_unit: string;
  rating_avg: number | null;
  review_count: number;
  instant_bookable: boolean;
  host_type: ApiHostCard["host_type"];
  capacity_guests?: number;
  bedrooms?: number | null;
  bathrooms?: string | number | null;
  amenity_slugs?: string[];
  cancellation_policy_code?: string | null;
  star_rating?: number | null;
  vehicle_summary?: { make: string; model: string; year: number; seats: number; transmission: string; fuel: string } | null;
  experience_summary?: { duration_minutes: number; languages: string[]; max_group: number } | null;
  host_card?: ApiHostCard;
}

export interface ApiListingDetail extends ApiListingCard {
  description: string;
  category: string | null;
  beds: number | null;
  cleaning_fee: ApiMoney;
  min_nights: number;
  max_nights: number;
  advance_notice_days: number;
  available_from: string | null;
  available_until: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  house_rules: string[];
  amenities: { slug: string }[];
  photos: ApiPhoto[];
  room_types: ApiRoomType[];
  cancellation_policy: { code: string } | null;
  host: ApiHostCard;
  vehicle_detail: {
    make: string;
    model: string;
    year: number;
    seats: number;
    transmission: string;
    fuel: string;
    daily_km_limit: number | null;
  } | null;
  experience_detail: {
    duration_minutes: number;
    languages: string[];
    meeting_point_text: string;
    max_group: number;
    includes: string[];
  } | null;
}

/** GET /host/listings/{id} (HostListingSerializer). */
export interface ApiHostListing extends ApiListingDetail {
  status: string;
  moderation_note: string;
  address_line: string;
  latitude: string | null;
  longitude: string | null;
  base_price_minor: number;
  cleaning_fee_minor: number;
  approval_mode: "instant" | "request" | null;
  allowed_status_changes: string[];
  created_at: string;
  updated_at: string;
}

export interface ApiDeparture {
  id: string;
  starts_on: string;
  ends_on: string;
  seats_total: number;
  seats_left: number;
  price_per_person: ApiMoney;
  status: string;
}

export interface ApiTripCard {
  id: string;
  reference: string;
  slug: string;
  trip_type: string | null;
  title: string;
  duration_days: number;
  group_min: number;
  group_max: number;
  price_per_person: ApiMoney;
  start_commune: ApiCommuneRef | null;
  cover_photo: { url: string; caption: string } | null;
  agency: ApiHostCard;
  next_departure: ApiDeparture | null;
  rating_avg: number | null;
  review_count: number;
}

export interface ApiTripDetail extends ApiTripCard {
  description: string;
  inclusions: string[];
  exclusions: string[];
  meeting_point_text: string;
  itinerary: { day_number: number; title: string; description: string }[];
  departures: ApiDeparture[];
  photos: ApiPhoto[];
  cancellation_policy: { code: string } | null;
  instant_bookable: boolean;
}

export interface ApiHostTrip extends ApiTripDetail {
  status: string;
  price_per_person_minor: number;
  meeting_point_latitude: string | null;
  meeting_point_longitude: string | null;
  allowed_status_changes: string[];
  created_at: string;
}

export interface ApiReview {
  id: string;
  author: { id: string; display_name: string; avatar_url: string | null } | null;
  listing_id: string | null;
  trip_id: string | null;
  rating_overall: number;
  rating_cleanliness: number | null;
  rating_accuracy: number | null;
  rating_communication: number | null;
  rating_location: number | null;
  rating_value: number | null;
  comment: string;
  published_at: string | null;
}

interface ApiLabeled {
  id?: string;
  slug?: string;
  vertical?: string;
  labels: { en: string; fr: string; ar: string };
}

export interface ApiReference {
  version: string;
  property_types: (ApiLabeled & { id: string; slug: string; vertical: string })[];
  amenities: (ApiLabeled & { id: string; slug: string })[];
  categories: (ApiLabeled & { id: string; slug: string; vertical: string })[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
/** Shown when a listing or trip has no photo yet (a neutral brand image, not a fake photo). */
export const NO_PHOTO = "/assets/og-logo.png";

/** Centimes -> whole dinars. */
export const dzd = (money: ApiMoney | null | undefined): number =>
  money ? Math.round(money.amount_minor / 100) : 0;

/** Whole dinars -> centimes. */
export const toMinor = (dinars: number): number => Math.round(dinars * 100);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);

/** Absolute URL for a photo the API may give as a path (/media/...). */
export function photoUrl(url: string | null | undefined): string {
  if (!url) return NO_PHOTO;
  if (/^https?:\/\//i.test(url) || url.startsWith("/assets/")) return url;
  try {
    return new URL(url, new URL(API_BASE).origin).toString();
  } catch {
    return NO_PHOTO;
  }
}

const hhmm = (value: string | null | undefined) => (value ? value.slice(0, 5) : undefined);

const POLICIES: CancellationPolicy[] = ["flexible", "moderate", "strict"];
const policyOf = (code: string | null | undefined): CancellationPolicy | undefined =>
  POLICIES.includes(code as CancellationPolicy) ? (code as CancellationPolicy) : undefined;

/** Backend listing/trip status -> the four states the frontend shows. */
export function toListingStatus(status: string | undefined): ListingStatus {
  if (!status || status === "published") return "active";
  if (status === "pending_review") return "pending";
  if (status === "suspended") return "suspended";
  return "draft";
}

/** Backend vertical -> frontend category (hotels and hostels share the "hotel" tab). */
export function toVertical(vertical: string): ListingVertical {
  if (vertical === "hostel" || vertical === "hotel") return "hotel";
  if (vertical === "experience" || vertical === "vehicle") return vertical;
  return "home";
}

/** Frontend category (and subtype) -> backend vertical list for search. */
export function apiVerticalsFor(category: ListingVertical | undefined): string | undefined {
  if (!category) return undefined;
  if (category === "hotel") return "hotel,hostel";
  if (category === "trip") return undefined;
  return category;
}

const FUELS = ["petrol", "diesel", "electric", "hybrid"] as const;
const fuelOf = (fuel: string | undefined): Listing["fuelType"] =>
  FUELS.includes(fuel as (typeof FUELS)[number]) ? (fuel as Listing["fuelType"]) : undefined;

const humanize = (slug: string) => slug.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// ---------------------------------------------------------------------------
// Reference data (GET /reference): labels of property types and amenities
// ---------------------------------------------------------------------------
let referenceCache: { at: number; data: ApiReference } | null = null;
const REFERENCE_TTL_MS = 60 * 60 * 1000;

/** The shared lists, cached for an hour (the API sends max-age=3600). Null when the API is down. */
export async function getReference(): Promise<ApiReference | null> {
  if (referenceCache && Date.now() - referenceCache.at < REFERENCE_TTL_MS) return referenceCache.data;
  try {
    const data = await api<ApiReference>("/reference", { anonymous: true });
    referenceCache = { at: Date.now(), data };
    return data;
  } catch (error) {
    console.error("[catalog.reference]", error);
    return referenceCache?.data ?? null;
  }
}

/** English label of a property type slug ("villa" -> "Villa"): the frontend matches subtypes on it. */
function propertyTypeName(slug: string | null, ref: ApiReference | null): string | undefined {
  if (!slug) return undefined;
  const row = ref?.property_types.find((p) => p.slug === slug);
  return row?.labels.en ?? humanize(slug);
}

/** Property type id for a frontend subtype ("Villa", "Hotel", "suv_4x4") inside one vertical. */
export function propertyTypeIdFor(type: unknown, vertical: string, ref: ApiReference | null): string | undefined {
  if (typeof type !== "string" || !type.trim() || !ref) return undefined;
  const wanted = type.trim().toLowerCase();
  const rows = ref.property_types.filter((p) => p.vertical === vertical);
  const hit =
    rows.find((p) => p.slug === wanted || p.slug === wanted.replace(/[\s/-]+/g, "_")) ??
    rows.find((p) => Object.values(p.labels).some((l) => l.toLowerCase() === wanted)) ??
    rows.find((p) => wanted.includes(p.slug.replace(/_/g, " ")) || wanted.includes(p.labels.en.toLowerCase()));
  return hit?.id;
}

/** Amenity slugs the API knows, for frontend amenity keys ("air_conditioning", "Wi-Fi"). */
export function amenitySlugsFor(keys: unknown, ref: ApiReference | null): string[] {
  if (!Array.isArray(keys) || !ref) return [];
  const out = new Set<string>();
  for (const key of keys) {
    if (typeof key !== "string") continue;
    const k = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const hit = ref.amenities.find((a) => a.slug === k || Object.values(a.labels).some((l) => l.toLowerCase() === key.trim().toLowerCase()));
    if (hit) out.add(hit.slug);
  }
  return Array.from(out);
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
export function toRoomType(room: ApiRoomType, listingId: string): RoomType {
  const price = dzd(room.base_price);
  return {
    id: room.id,
    propertyListingId: listingId,
    name: room.name,
    description: room.description || undefined,
    price,
    basePrice: price,
    bookingUnit: room.booking_unit,
    totalInventory: room.unit_count,
    inventoryCount: room.unit_count,
    capacity: room.capacity_per_unit,
    bedsDescription: room.beds_description || undefined,
    amenities: [],
    imageSrc: (room.photos ?? []).map((p) => photoUrl(p.url)),
    isAvailable: room.is_active !== false,
  };
}

function businessCategoryOf(vertical: string, hostType: string | undefined): Listing["businessCategory"] {
  if (vertical === "hotel" || vertical === "hostel") return vertical;
  if (hostType === "agency" || hostType === "hotel" || hostType === "hostel") return hostType;
  return undefined;
}

/**
 * Map a listing card, public page or host view onto the frontend Listing.
 * Fields the answer does not carry stay undefined (never invented).
 */
export function toListing(raw: ApiListingCard | ApiListingDetail | ApiHostListing, ref: ApiReference | null = null): Listing {
  const detail = "photos" in raw ? (raw as ApiListingDetail) : null;
  const host = "status" in raw ? (raw as ApiHostListing) : null;
  const hostCard: ApiHostCard | undefined = detail?.host ?? raw.host_card;
  const hostType = hostCard?.host_type ?? raw.host_type;
  const vertical = raw.vertical;

  const photos = detail?.photos?.length
    ? [...detail.photos]
        .filter((p) => !p.room_type_id)
        .sort((a, b) => Number(Boolean(b.is_cover)) - Number(Boolean(a.is_cover)) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((p) => photoUrl(p.url))
    : [];
  const imageSrc = photos.length ? photos : raw.cover_photo ? [photoUrl(raw.cover_photo.url)] : [NO_PHOTO];

  const city = raw.commune?.name ?? "";
  const exactPoint =
    host?.latitude && host?.longitude ? ([Number(host.latitude), Number(host.longitude)] as [number, number]) : null;
  const latlng: [number, number] =
    exactPoint ?? (raw.location_public ? [raw.location_public.lat, raw.location_public.lng] : getTripCoordinates({ city, locationValue: raw.commune?.wilaya_name }));

  const vehicle = detail?.vehicle_detail ?? raw.vehicle_summary ?? null;
  const experience = detail?.experience_detail ?? raw.experience_summary ?? null;
  const experienceType = isExperienceType(raw.experience_type) ? raw.experience_type : undefined;
  const typeName =
    propertyTypeName(raw.property_type, ref) ??
    (vertical === "hotel" ? "Hotel" : vertical === "hostel" ? "Hostel" : experienceType ? EXPERIENCE_TYPE_LABELS[experienceType].en : humanize(vertical));
  const price = dzd(raw.price_from);
  const instant = host ? (host.approval_mode ? host.approval_mode === "instant" : raw.instant_bookable) : raw.instant_bookable;
  const bathrooms = raw.bathrooms === null || raw.bathrooms === undefined ? undefined : Number(raw.bathrooms);

  return {
    id: raw.id,
    reference: raw.reference,
    title: raw.title,
    description: detail?.description ?? "",
    category: toVertical(vertical),
    type: typeName,
    experienceType,
    ownerType: hostType === "individual" ? "individual" : "organization",
    hostUserId: hostCard?.user_id ?? null,
    organizationId: hostCard?.organization_id ?? null,
    organizationSlug: hostCard?.organization_slug ?? undefined,
    hostAccountId: hostCard?.id,
    hostName: hostCard?.display_name,
    status: toListingStatus(host?.status),
    allowedStatusChanges: host?.allowed_status_changes,
    price,
    imageSrc,
    createdAt: host?.created_at ?? "",
    updatedAt: host?.updated_at,
    locationValue: raw.commune?.wilaya_name ?? "",
    city,
    commune: raw.commune?.name,
    wilayaCode: raw.commune?.wilaya_code,
    country: "Algeria",
    latlng,
    featured: undefined,
    isGuestFavorite: false,
    instantBook: instant,
    bookingApprovalMode: instant ? "instant" : "request",
    rating: raw.rating_avg ?? undefined,
    reviewCount: raw.review_count,
    availableFrom: detail?.available_from ?? undefined,
    availableTo: detail?.available_until ?? undefined,
    businessCategory: businessCategoryOf(vertical, hostType),
    hotelStarRating: raw.star_rating ?? undefined,
    roomTypes: detail?.room_types?.length
      ? detail.room_types.map((r) => {
          const room = toRoomType(r, raw.id);
          if (room.imageSrc.length === 0) {
            room.imageSrc = detail.photos.filter((p) => p.room_type_id === r.id).map((p) => photoUrl(p.url));
          }
          return room;
        })
      : undefined,
    guestCount: raw.capacity_guests,
    roomCount: raw.bedrooms ?? undefined,
    bathroomCount: bathrooms,
    bedroomCount: raw.bedrooms ?? undefined,
    amenities: detail ? detail.amenities.map((a) => a.slug) : raw.amenity_slugs ?? [],
    houseRules: detail?.house_rules,
    cancellationPolicy: policyOf(detail?.cancellation_policy?.code ?? raw.cancellation_policy_code),
    cleaningFee: detail ? dzd(detail.cleaning_fee) : undefined,
    minNights: detail?.min_nights,
    maxNights: detail?.max_nights,
    advanceNoticeDays: detail?.advance_notice_days,
    checkInTime: hhmm(detail?.check_in_time),
    checkOutTime: hhmm(detail?.check_out_time),
    make: vehicle?.make,
    model: vehicle?.model,
    year: vehicle?.year,
    transmission: vehicle?.transmission === "manual" || vehicle?.transmission === "automatic" ? vehicle.transmission : undefined,
    seats: vehicle?.seats,
    fuelType: fuelOf(vehicle?.fuel),
    pickupLocation: undefined,
    mileagePolicy:
      detail?.vehicle_detail?.daily_km_limit !== undefined && detail?.vehicle_detail?.daily_km_limit !== null
        ? `${detail.vehicle_detail.daily_km_limit} km/day`
        : undefined,
    durationHours: experience ? Math.round((experience.duration_minutes / 60) * 10) / 10 : undefined,
    groupSize: experience?.max_group,
    perPersonPrice: vertical === "experience" ? price : undefined,
    includedItems: detail?.experience_detail?.includes,
    experienceLanguages: experience?.languages,
  };
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------
/** Public card of the agency of a trip, as the PublicOrganization the trip pages read. */
export function agencyOf(card: ApiHostCard | undefined): PublicOrganization | undefined {
  if (!card) return undefined;
  return {
    id: card.organization_id ?? card.id,
    slug: card.organization_slug ?? undefined,
    hostAccountId: card.id,
    name: card.display_name,
    businessCategory: card.host_type === "hotel" || card.host_type === "hostel" ? card.host_type : "agency",
    isVerified: card.verified,
    createdAt: "",
    rating: card.rating_avg ?? undefined,
    reviewCount: card.review_count,
  };
}

/** Join the parts of a frontend itinerary day that the API has no column for into the description. */
export function itineraryDescription(day: Pick<TripItineraryDay, "description" | "activities" | "meals" | "accommodation">): string {
  const parts = [day.description?.trim() || ""];
  if (day.activities?.length) parts.push(day.activities.map((a) => `- ${a}`).join("\n"));
  if (day.meals) parts.push(day.meals);
  if (day.accommodation) parts.push(day.accommodation);
  return parts.filter(Boolean).join("\n\n");
}

export function toTrip(raw: ApiTripCard | ApiTripDetail | ApiHostTrip): Trip {
  const detail = "itinerary" in raw ? (raw as ApiTripDetail) : null;
  const host = "status" in raw ? (raw as ApiHostTrip) : null;
  const photos = detail?.photos?.length
    ? [...detail.photos]
        .sort((a, b) => Number(Boolean(b.is_cover)) - Number(Boolean(a.is_cover)) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((p) => photoUrl(p.url))
    : [];
  const cover = photos[0] ?? (raw.cover_photo ? photoUrl(raw.cover_photo.url) : NO_PHOTO);
  const departures = detail?.departures ?? (raw.next_departure ? [raw.next_departure] : []);
  const openDepartures = departures.filter((d) => d.status !== "cancelled");
  const city = raw.start_commune?.name ?? "";
  const point =
    host?.meeting_point_latitude && host?.meeting_point_longitude
      ? ([Number(host.meeting_point_latitude), Number(host.meeting_point_longitude)] as [number, number])
      : undefined;

  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    description: detail?.description ?? "",
    coverPhoto: cover,
    gallery: photos.slice(1),
    itinerary: (detail?.itinerary ?? []).map((d) => ({ day: d.day_number, title: d.title, description: d.description })),
    durationDays: raw.duration_days,
    maxGroupSize: raw.group_max,
    minGroupSize: raw.group_min,
    pricePerPerson: dzd(raw.price_per_person),
    inclusions: detail?.inclusions ?? [],
    exclusions: detail?.exclusions ?? [],
    meetingPoint: detail?.meeting_point_text ?? "",
    city,
    commune: raw.start_commune?.name,
    wilayaCode: raw.start_commune?.wilaya_code,
    hostAccountId: raw.agency?.id,
    locationValue: raw.start_commune?.wilaya_name ?? "",
    latlng: point,
    cancellationPolicy: policyOf(detail?.cancellation_policy?.code) ?? "moderate",
    organizationId: raw.agency?.organization_id ?? raw.agency?.id ?? "",
    tripType: isTripType(raw.trip_type) ? raw.trip_type : undefined,
    status: toListingStatus(host?.status) === "active" ? "active" : "draft",
    rating: raw.rating_avg ?? undefined,
    reviewsCount: raw.review_count,
    departureDates: Array.from(new Set(openDepartures.map((d) => d.starts_on))).sort(),
    createdAt: host?.created_at ?? "",
    organization: agencyOf(raw.agency),
  };
}

/** Seats taken per departure date, for the trip booking widget (capacity = trip group size). */
export function seatsSoldFrom(trip: Pick<Trip, "maxGroupSize">, departures: ApiDeparture[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of departures) {
    if (d.status === "cancelled") continue;
    out[d.starts_on] = Math.max(0, trip.maxGroupSize - Math.max(0, d.seats_left));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export function toReview(raw: ApiReview): Review {
  return {
    id: raw.id,
    listingId: raw.listing_id ?? raw.trip_id ?? "",
    userId: raw.author?.id ?? "",
    rating: raw.rating_overall,
    cleanliness: raw.rating_cleanliness ?? 0,
    accuracy: raw.rating_accuracy ?? 0,
    communication: raw.rating_communication ?? 0,
    location: raw.rating_location ?? 0,
    value: raw.rating_value ?? 0,
    comment: raw.comment,
    createdAt: raw.published_at ?? "",
    user: raw.author ? { id: raw.author.id, name: raw.author.display_name, image: raw.author.avatar_url } : undefined,
  };
}
