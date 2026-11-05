// TODO: replace with Supabase query
import "server-only";
import { Trip } from "@/types";
import { getTripCoordinates } from "@/lib/trip-coordinates";
import { newId, slugify } from "@/lib/ids";
import { getOrganizationById } from "@/lib/data/organizations";
import { toPublicOrganization } from "@/lib/server/dto";
import { clone, removeWhere } from "./_store";
import { tripsTable } from "./_tables";
import { isTripType, type TripTypeId } from "@/lib/catalog-types";

export interface TripSearchParams {
  organizationId?: string;
  destination?: string;
  city?: string;
  status?: "active" | "draft" | "all";
  maxPrice?: number;
  duration?: number;
  /** Canonical trip types (TRIP_TYPES); a trip matches when its type is in the list. */
  tripTypes?: string[];
}

export async function getTrips(params?: TripSearchParams): Promise<Trip[]> {
  let filtered = [...tripsTable];

  if (params?.organizationId) {
    filtered = filtered.filter((t) => t.organizationId === params.organizationId);
  }

  if (params?.status && params.status !== "all") {
    filtered = filtered.filter((t) => t.status === params.status);
  } else if (!params?.status) {
    // Public by default: only active trips. Owner pages pass status "all".
    filtered = filtered.filter((t) => t.status === "active");
  }

  if (params?.destination) {
    const q = params.destination.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.locationValue.toLowerCase().includes(q)
    );
  }

  if (params?.city) {
    const q = params.city.toLowerCase();
    filtered = filtered.filter((t) => t.city.toLowerCase().includes(q));
  }

  if (params?.maxPrice) {
    filtered = filtered.filter((t) => t.pricePerPerson <= params.maxPrice!);
  }

  // Same rule as matchesTrip in components/search/searchFacets.ts (search page).
  const wantedTypes = (params?.tripTypes || []).filter(isTripType) as TripTypeId[];
  if (wantedTypes.length) {
    filtered = filtered.filter((t) => Boolean(t.tripType && wantedTypes.includes(t.tripType)));
  }

  return Promise.all(
    filtered.map(async (t) => {
      const org = await getOrganizationById(t.organizationId);
      return { ...clone(t), organization: org ? toPublicOrganization(org) : undefined };
    })
  );
}

export async function getTripById(idOrSlug: string): Promise<Trip | null> {
  const trip = tripsTable.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
  if (!trip) return null;

  const org = await getOrganizationById(trip.organizationId);
  return { ...clone(trip), organization: org ? toPublicOrganization(org) : undefined };
}

/** Public lookup: active trips only, unless the caller verified ownership. */
export async function getPublicTripById(
  idOrSlug: string,
  canSeeUnpublished?: (trip: Trip) => boolean
): Promise<Trip | null> {
  const trip = await getTripById(idOrSlug);
  if (!trip) return null;
  if (trip.status === "active") return trip;
  return canSeeUnpublished?.(trip) ? trip : null;
}

export type TripInput = Omit<Trip, "id" | "createdAt" | "slug" | "organization" | "rating" | "reviewsCount">;

export async function createTrip(data: TripInput): Promise<Trip> {
  if (!isTripType(data.tripType)) throw new Error("createTrip: tripType must be one of TRIP_TYPES");
  const newTrip: Trip = {
    ...data,
    latlng: data.latlng || getTripCoordinates(data),
    id: newId("trip"),
    slug: slugify(data.title, (slug) => tripsTable.some((t) => t.slug === slug), "trip"),
    createdAt: new Date().toISOString(),
  };

  tripsTable.unshift(newTrip);
  return clone(newTrip);
}

export async function updateTrip(id: string, updates: Partial<TripInput>): Promise<Trip | null> {
  const trip = tripsTable.find((t) => t.id === id);
  if (!trip) return null;
  if (updates.tripType !== undefined && !isTripType(updates.tripType)) return null;
  Object.assign(trip, updates);
  return clone(trip);
}

export async function deleteTrip(id: string): Promise<boolean> {
  return removeWhere(tripsTable, (t) => t.id === id) > 0;
}
