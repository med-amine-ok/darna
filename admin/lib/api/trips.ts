import "server-only";

import type { Listing } from "@/lib/types";
import { isTripType } from "@/lib/catalog-types";
import { dzd, type ApiMoney } from "./mapping";
import { toHostType, toListingStatus, type ApiCommuneRef, type ApiHostCard } from "./listings";

/**
 * Mappers for organised trips (apps/trips, /admin/trips). The admin screens
 * show trips as listings of the "trip" vertical, so a trip maps to `Listing`.
 */

interface ApiDeparture {
  id: string;
  starts_on: string;
  ends_on: string;
  seats_total: number;
  seats_left: number;
  price_per_person: ApiMoney | null;
  status: string;
}

/** GET /admin/trips rows and /admin/trips/{id} (AdminTripSerializer). */
export interface ApiAdminTrip {
  id: string;
  reference: string | null;
  slug: string;
  trip_type: string;
  title: string;
  duration_days: number;
  group_min: number;
  group_max: number;
  price_per_person: ApiMoney | null;
  start_commune: ApiCommuneRef | null;
  cover_photo: { url: string; caption?: string } | null;
  agency: ApiHostCard;
  next_departure: ApiDeparture | null;
  rating_avg: number | null;
  review_count: number;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
  meeting_point_text?: string;
  itinerary?: { day_number: number; title: string; description: string }[];
  departures?: ApiDeparture[];
  photos?: { url: string; caption?: string; sort_order?: number; is_cover?: boolean }[];
  instant_bookable?: boolean;
  status: string;
  moderation_note: string | null;
  meeting_point_latitude?: string | number | null;
  meeting_point_longitude?: string | number | null;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  status_before_delete: string | null;
}

function coord(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function toListingFromTrip(raw: ApiAdminTrip): Listing {
  const photos = [...(raw.photos ?? [])].sort(
    (a, b) => Number(Boolean(b.is_cover)) - Number(Boolean(a.is_cover)) || (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const images = photos.length ? photos.map((p) => p.url) : raw.cover_photo ? [raw.cover_photo.url] : [];
  const price = dzd(raw.price_per_person);
  const notes = raw.status === "paused" ? ["Paused by the agency"] : [];
  if (raw.moderation_note) notes.push(raw.moderation_note);
  const departures = raw.departures ?? (raw.next_departure ? [raw.next_departure] : []);
  return {
    id: raw.id,
    formattedId: raw.reference || `#T${raw.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    title: raw.title,
    description: raw.description ?? "",
    category: "trip",
    vertical: "trip",
    propertyType: raw.trip_type,
    tripType: isTripType(raw.trip_type) ? raw.trip_type : undefined,
    hostId: raw.agency?.id ?? "",
    hostName: raw.agency?.display_name ?? "",
    hostType: toHostType(raw.agency?.host_type ?? "agency"),
    status: toListingStatus(raw.status, raw.deleted_at),
    statusBeforeDelete: raw.status_before_delete ? toListingStatus(raw.status_before_delete) : undefined,
    price,
    priceDzd: price,
    imageSrc: images,
    images,
    createdAt: raw.submitted_at || raw.created_at,
    updatedAt: raw.updated_at || raw.created_at,
    wilayaCode: raw.start_commune ? String(raw.start_commune.wilaya_code).padStart(2, "0") : "",
    city: raw.start_commune?.name ?? "",
    address: raw.meeting_point_text || undefined,
    coordinates: { lat: coord(raw.meeting_point_latitude), lng: coord(raw.meeting_point_longitude) },
    guestCapacity: raw.group_max ?? 0,
    rating: raw.rating_avg ?? 0,
    reviewsCount: raw.review_count ?? 0,
    bookingsCount: 0,
    amenities: [],
    bookingApprovalMode: raw.instant_bookable ? "instant" : "request",
    isFeatured: false,
    isReported: false,
    adminNotes: notes,
    programme: (raw.itinerary ?? []).map((d, i) => ({
      day: d.day_number,
      title: d.title,
      description: d.description,
      order: i + 1,
    })),
    specs: {
      durationDays: raw.duration_days,
      groupMin: raw.group_min,
      groupMax: raw.group_max,
      inclusions: raw.inclusions ?? [],
      exclusions: raw.exclusions ?? [],
      departures: departures.map((d) => ({
        id: d.id,
        startsOn: d.starts_on,
        endsOn: d.ends_on,
        seatsTotal: d.seats_total,
        seatsLeft: d.seats_left,
        priceDzd: dzd(d.price_per_person),
        status: d.status,
      })),
      nextDeparture: raw.next_departure?.starts_on ?? null,
    },
  };
}
