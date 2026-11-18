import "server-only";
import { Trip } from "@/types";
import { WILAYAS } from "@/lib/algeria";
import { addDaysToKey } from "@/lib/booking/dates";
import { isTripType } from "@/lib/catalog-types";
import { ApiError, api, apiAll, apiOrNull, currentApiToken, type Query } from "@/lib/api/client";
import {
  isUuid,
  itineraryDescription,
  seatsSoldFrom,
  toMinor,
  toTrip,
  type ApiDeparture,
  type ApiHostTrip,
  type ApiTripCard,
  type ApiTripDetail,
} from "@/lib/api/catalog";

/**
 * Agency trips from the Django API (apps/trips):
 * - public: GET /trips (search), GET /trips/{id or slug};
 * - agency (active workspace of the session): /host/trips, its /status,
 *   /photos and /departures.
 * Reads never throw: failures give [] or null and are logged.
 */

export interface TripSearchParams {
  /** Kept for callers; the agency's own trips come from the session workspace (status "all" or "draft"). */
  organizationId?: string;
  /** Only the trips of one agency host account (public agency page). */
  hostAccountId?: string;
  destination?: string;
  city?: string;
  status?: "active" | "draft" | "all";
  maxPrice?: number;
  duration?: number;
  /** Canonical trip types (TRIP_TYPES); a trip matches when its type is in the list. */
  tripTypes?: string[];
  /** Most rows to read (default 200). */
  limit?: number;
}

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function wilayaCodeFor(place: string): number | undefined {
  const d = norm(place);
  return WILAYAS.find((w) => [w.name, w.nameEn, w.nameAr].some((n) => n && norm(n) === d))?.code;
}

/** The session agency's own trips, every status (GET /host/trips). */
export async function getHostTrips(): Promise<Trip[]> {
  if (!currentApiToken()) return [];
  try {
    return (await apiAll<ApiHostTrip>("/host/trips")).map(toTrip);
  } catch (error) {
    if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) console.error("[trips.host]", error);
    return [];
  }
}

export async function getTrips(params?: TripSearchParams): Promise<Trip[]> {
  if (params?.status === "all" || params?.status === "draft") {
    const own = await getHostTrips();
    return params.status === "draft" ? own.filter((t) => t.status === "draft") : own;
  }
  const query: Query = {};
  const types = (params?.tripTypes || []).filter(isTripType);
  if (types.length) query.trip_type = types.join(",");
  if (params?.maxPrice && params.maxPrice > 0) query.max_price = toMinor(params.maxPrice);
  if (params?.hostAccountId && isUuid(params.hostAccountId)) query.host_account = params.hostAccountId;
  // The trip search has no free text: a wilaya name filters on the API, other text here.
  const text = (params?.destination || params?.city || "").trim();
  const wilaya = text ? wilayaCodeFor(text) : undefined;
  if (wilaya) query.wilaya = wilaya;

  try {
    const limit = Math.max(1, Math.min(params?.limit ?? 200, 200));
    const rows = await apiAll<ApiTripCard>("/trips", { anonymous: true, query: { ...query, page_size: 50 } }, Math.ceil(limit / 50));
    let trips = rows.slice(0, limit).map(toTrip);
    if (text && !wilaya) {
      const q = norm(text);
      trips = trips.filter((t) => [t.title, t.city, t.locationValue].some((v) => norm(v || "").includes(q)));
    }
    if (params?.duration) trips = trips.filter((t) => t.durationDays === params.duration);
    return trips;
  } catch (error) {
    console.error("[trips.search]", error);
    return [];
  }
}

/** A public trip by id or slug, with every upcoming departure. */
async function publicTrip(key: string): Promise<{ trip: Trip; departures: ApiDeparture[] } | null> {
  if (!key) return null;
  try {
    const raw = await apiOrNull<ApiTripDetail>(`/trips/${encodeURIComponent(key)}`, { anonymous: true });
    return raw ? { trip: toTrip(raw), departures: raw.departures ?? [] } : null;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 400)) console.error("[trips.detail]", error);
    return null;
  }
}

/** One trip of the session agency (any status), or null. */
export async function getHostTripById(id: string): Promise<Trip | null> {
  if (!isUuid(id) || !currentApiToken()) return null;
  try {
    const raw = await apiOrNull<ApiHostTrip>(`/host/trips/${id}`);
    return raw ? toTrip(raw) : null;
  } catch (error) {
    if (!(error instanceof ApiError && error.status < 500)) console.error("[trips.hostDetail]", error);
    return null;
  }
}

/** A trip by id or slug: the public page, else the agency's own view (drafts). */
export async function getTripById(idOrSlug: string): Promise<Trip | null> {
  return (await publicTrip(idOrSlug))?.trip ?? (await getHostTripById(idOrSlug));
}

/** Public lookup: published trips only, unless the agency itself asks (`canSeeUnpublished`). */
export async function getPublicTripById(
  idOrSlug: string,
  canSeeUnpublished?: (trip: Trip) => boolean,
): Promise<Trip | null> {
  const found = await publicTrip(idOrSlug);
  if (found) return found.trip;
  if (!canSeeUnpublished) return null;
  const own = await getHostTripById(idOrSlug);
  return own && canSeeUnpublished(own) ? own : null;
}

/** Seats taken per departure date of a public trip (from the departures' seats left). */
export async function getTripSeatsSold(trip: Trip): Promise<Record<string, number>> {
  const found = await publicTrip(trip.id);
  if (found) return seatsSoldFrom(trip, found.departures);
  try {
    const own = await api<ApiDeparture[]>(`/host/trips/${trip.id}/departures`);
    return seatsSoldFrom(trip, own);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Writes (agency)
// ---------------------------------------------------------------------------
export type TripInput = Omit<Trip, "id" | "createdAt" | "slug" | "organization" | "rating" | "reviewsCount">;

const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v) && v.length <= 500;

async function communeIdFor(place: string | undefined): Promise<number | undefined> {
  if (!place?.trim()) return undefined;
  const [communePart, wilayaPart] = place.split(",").map((p) => p.trim());
  try {
    const answer = await api<{ results?: { id: number }[] }>("/geo/communes", {
      anonymous: true,
      query: { q: communePart.slice(0, 60), wilaya: wilayaPart ? wilayaCodeFor(wilayaPart) : undefined, limit: 1 },
    });
    return answer.results?.[0]?.id;
  } catch {
    return undefined;
  }
}

/** Body of POST/PATCH /host/trips: only the keys present in `data`. */
async function tripWriteBody(data: Partial<TripInput>): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title.slice(0, 140);
  if (data.tripType !== undefined) body.trip_type = data.tripType;
  if (data.description !== undefined) body.description = data.description;
  if (data.durationDays !== undefined) body.duration_days = Math.min(60, Math.max(1, data.durationDays));
  if (data.minGroupSize !== undefined) body.group_min = data.minGroupSize;
  if (data.maxGroupSize !== undefined) body.group_max = data.maxGroupSize;
  if (data.pricePerPerson !== undefined) body.price_per_person_minor = toMinor(data.pricePerPerson);
  if (data.inclusions !== undefined) body.inclusions = data.inclusions.map((s) => s.slice(0, 200));
  if (data.exclusions !== undefined) body.exclusions = data.exclusions.map((s) => s.slice(0, 200));
  if (data.meetingPoint !== undefined) body.meeting_point_text = data.meetingPoint.slice(0, 255);
  if (data.cancellationPolicy !== undefined) body.cancellation_policy = data.cancellationPolicy;
  if (data.latlng) {
    body.meeting_point_latitude = data.latlng[0].toFixed(6);
    body.meeting_point_longitude = data.latlng[1].toFixed(6);
  }
  if (data.city !== undefined || data.commune !== undefined) {
    const commune = await communeIdFor(data.commune || data.city);
    if (commune) body.start_commune = commune;
  }
  if (data.itinerary !== undefined) {
    body.itinerary = data.itinerary.map((day, i) => ({
      day_number: i + 1,
      title: (day.title || `Day ${i + 1}`).slice(0, 120),
      description: itineraryDescription(day),
    }));
  }
  return body;
}

/** Add departures for dates not yet planned (seats = group size; ends after the trip length). */
async function addDepartures(tripId: string, dates: string[] | undefined, durationDays: number, seats: number): Promise<void> {
  const wanted = Array.from(new Set((dates ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))));
  if (wanted.length === 0) return;
  const existing = await api<ApiDeparture[]>(`/host/trips/${tripId}/departures`).catch(() => [] as ApiDeparture[]);
  const planned = new Set(existing.map((d) => d.starts_on));
  for (const start of wanted) {
    if (planned.has(start)) continue;
    await api(`/host/trips/${tripId}/departures`, {
      method: "POST",
      body: { starts_on: start, ends_on: addDaysToKey(start, Math.max(0, durationDays - 1)), seats_total: Math.max(1, seats) },
    });
  }
}

async function addPhotos(tripId: string, cover: unknown, gallery: unknown): Promise<void> {
  const urls = [cover, ...(Array.isArray(gallery) ? gallery : [])].filter(isHttpUrl);
  const unique = Array.from(new Set(urls)).slice(0, 30);
  for (let i = 0; i < unique.length; i++) {
    await api(`/host/trips/${tripId}/photos`, { method: "POST", body: { url: unique[i], is_cover: i === 0 && isHttpUrl(cover) } });
  }
}

/** Ask for "active" (resume, else submit for review) or "draft" (pause, else withdraw). */
async function changeTripStatus(tripId: string, wanted: "active" | "draft"): Promise<void> {
  const current = await api<ApiHostTrip>(`/host/trips/${tripId}`);
  const allowed = current.allowed_status_changes ?? [];
  const target =
    wanted === "active"
      ? (["published", "pending_review"].find((s) => allowed.includes(s)) ?? "pending_review")
      : (["paused", "draft"].find((s) => allowed.includes(s)) ?? "paused");
  await api(`/host/trips/${tripId}/status`, { method: "POST", body: { status: target } });
}

/**
 * Create a trip in the session agency (draft), add photos and departures, then
 * send it to review unless it is a draft (DEC-003). An incomplete trip stays a
 * draft. Throws ApiError when the API refuses it.
 */
export async function createTrip(data: TripInput): Promise<Trip> {
  if (!isTripType(data.tripType)) throw new Error("createTrip: tripType must be one of TRIP_TYPES");
  const body = await tripWriteBody(data);
  const created = await api<ApiHostTrip>("/host/trips", { method: "POST", body });
  await addPhotos(created.id, data.coverPhoto, data.gallery);
  await addDepartures(created.id, data.departureDates, data.durationDays, data.maxGroupSize);
  if (data.status !== "draft") {
    try {
      await changeTripStatus(created.id, "active");
    } catch (error) {
      if (!(error instanceof ApiError && error.status < 500)) throw error;
    }
  }
  return toTrip(await api<ApiHostTrip>(`/host/trips/${created.id}`));
}

/** Patch one of the agency's trips (content, status, new departures). Null when it is not theirs. */
export async function updateTrip(id: string, updates: Partial<TripInput>): Promise<Trip | null> {
  if (!isUuid(id)) return null;
  if (updates.tripType !== undefined && !isTripType(updates.tripType)) return null;
  const current = await getHostTripById(id);
  if (!current) return null;
  const { status, departureDates, coverPhoto, gallery, ...content } = updates;
  const body = await tripWriteBody(content);
  if (Object.keys(body).length > 0) await api(`/host/trips/${id}`, { method: "PATCH", body });
  if (coverPhoto !== undefined || gallery !== undefined) {
    const known = new Set([current.coverPhoto, ...current.gallery]);
    await addPhotos(id, known.has(coverPhoto as string) ? undefined : coverPhoto, (gallery ?? []).filter((u) => !known.has(u)));
  }
  if (departureDates) {
    await addDepartures(id, departureDates, updates.durationDays ?? current.durationDays, updates.maxGroupSize ?? current.maxGroupSize);
  }
  if ((status === "active" || status === "draft") && status !== current.status) await changeTripStatus(id, status);
  return toTrip(await api<ApiHostTrip>(`/host/trips/${id}`));
}

/** Soft-delete one of the agency's trips. */
export async function deleteTrip(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  try {
    await api(`/host/trips/${id}`, { method: "DELETE" });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}
