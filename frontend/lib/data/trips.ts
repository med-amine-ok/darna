// TODO: replace with Supabase query
import { Trip } from "@/types";
import { mockTrips, getTripCoordinates } from "@/lib/mock-data/trips";
import { getOrganizationById } from "@/lib/data/organizations";

export { getTripCoordinates };

let tripsState: Trip[] = [...mockTrips];

export interface TripSearchParams {
  organizationId?: string;
  destination?: string;
  city?: string;
  status?: "active" | "draft" | "all";
  maxPrice?: number;
  duration?: number;
}

export async function getTrips(params?: TripSearchParams): Promise<Trip[]> {
  let filtered = [...tripsState];

  if (params?.organizationId) {
    filtered = filtered.filter((t) => t.organizationId === params.organizationId);
  }

  if (params?.status && params.status !== "all") {
    filtered = filtered.filter((t) => t.status === params.status);
  } else if (!params?.status && !params?.organizationId) {
    // By default public queries only see active
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

  // Populate organizations
  const populated = await Promise.all(
    filtered.map(async (t) => {
      const org = await getOrganizationById(t.organizationId);
      return {
        ...t,
        organization: org || undefined,
      };
    })
  );

  return populated;
}

export async function getTripById(idOrSlug: string): Promise<Trip | null> {
  const trip = tripsState.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
  if (!trip) return null;

  const org = await getOrganizationById(trip.organizationId);
  return {
    ...trip,
    organization: org || undefined,
  };
}

export async function createTrip(
  data: Omit<Trip, "id" | "createdAt" | "slug"> & { slug?: string }
): Promise<Trip> {
  const newTrip: Trip = {
    ...data,
    latlng: data.latlng || getTripCoordinates(data),
    id: `trip_${Date.now()}`,
    slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    createdAt: new Date().toISOString(),
  };

  tripsState = [newTrip, ...tripsState];
  return newTrip;
}

export async function updateTrip(
  id: string,
  updates: Partial<Trip>
): Promise<Trip | null> {
  const index = tripsState.findIndex((t) => t.id === id);
  if (index === -1) return null;

  tripsState[index] = {
    ...tripsState[index],
    ...updates,
  };

  return tripsState[index];
}

export async function deleteTrip(id: string): Promise<boolean> {
  const initialLength = tripsState.length;
  tripsState = tripsState.filter((t) => t.id !== id);
  return tripsState.length < initialLength;
}
