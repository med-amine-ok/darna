// TODO: replace with Supabase query
import { Listing, ListingVertical, SearchParams } from "@/types";
import { mockListings } from "@/lib/mock-data/listings";

let listingsStore: Listing[] = [...mockListings];

export async function getListings(params?: SearchParams): Promise<Listing[]> {
  // Simulate realistic network latency for skeletons/loading states
  await new Promise((resolve) => setTimeout(resolve, 100));

  let results = [...listingsStore];

  if (!params) return results;

  if (params.vertical) {
    results = results.filter((item) => item.category === params.vertical);
  }

  if (params.destination) {
    const dest = params.destination.toLowerCase();
    results = results.filter(
      (item) =>
        item.city.toLowerCase().includes(dest) ||
        item.locationValue.toLowerCase().includes(dest) ||
        item.country.toLowerCase().includes(dest)
    );
  }

  if (params.minPrice) {
    results = results.filter((item) => item.price >= (params.minPrice || 0));
  }

  if (params.maxPrice) {
    results = results.filter((item) => item.price <= (params.maxPrice || Infinity));
  }

  if (params.guests && params.guests > 1) {
    results = results.filter(
      (item) => !item.guestCount || item.guestCount >= (params.guests || 1)
    );
  }

  return results;
}

export async function getListingById(id: string): Promise<Listing | null> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 80));
  return listingsStore.find((l) => l.id === id) || null;
}

export async function getFeaturedListings(vertical?: ListingVertical): Promise<Listing[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return listingsStore.filter(
    (l) => l.featured && (!vertical || l.category === vertical)
  );
}

export async function getHostListings(hostIdOrOrgId: string): Promise<Listing[]> {
  await new Promise((resolve) => setTimeout(resolve, 90));
  return listingsStore.filter(
    (l) => l.hostUserId === hostIdOrOrgId || l.organizationId === hostIdOrOrgId
  );
}

export async function createListing(data: Partial<Listing>): Promise<Listing> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const newListing: Listing = {
    id: `lst_${Date.now()}`,
    title: data.title || "Untitled Algerian Stay",
    description: data.description || "",
    category: data.category || "home",
    type: data.type || "Villa",
    ownerType: data.ownerType || "individual",
    hostUserId: data.hostUserId || "usr_amina",
    organizationId: data.organizationId || null,
    status: data.status || "active",
    price: data.price || 15000,
    imageSrc: data.imageSrc && data.imageSrc.length > 0 ? data.imageSrc : ["/assets/hero.jpg"],
    createdAt: new Date().toISOString(),
    locationValue: data.locationValue || data.city || "Algiers",
    city: data.city || "Algiers",
    country: "Algeria",
    latlng: data.latlng || [36.7538, 3.0588],
    guestCount: data.guestCount || 4,
    bedroomCount: data.bedroomCount || 2,
    roomCount: data.roomCount || 3,
    bathroomCount: data.bathroomCount || 2,
    amenities: data.amenities || ["wifi", "air_conditioning", "kitchen", "free_parking"],
    houseRules: data.houseRules || ["No smoking", "Families welcome"],
    cancellationPolicy: data.cancellationPolicy || "flexible",
    instantBook: data.instantBook ?? true,
    rating: 5.0,
    reviewCount: 0,
    bookingsCount: 0,
    ...data,
  };

  listingsStore = [newListing, ...listingsStore];
  return newListing;
}

export async function updateListing(
  id: string,
  data: Partial<Listing>
): Promise<Listing | null> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const idx = listingsStore.findIndex((l) => l.id === id);
  if (idx !== -1) {
    listingsStore[idx] = {
      ...listingsStore[idx],
      ...data,
    };
    return listingsStore[idx];
  }
  return null;
}

export async function deleteListing(id: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const beforeLen = listingsStore.length;
  listingsStore = listingsStore.filter((l) => l.id !== id);
  return listingsStore.length < beforeLen;
}
