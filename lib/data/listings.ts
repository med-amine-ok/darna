import { safeListing, SafeUser } from "@/types";
import { mockCurrentUserStore, mockListingsStore, mockUsersStore, updateMockStores } from "../mock-data";

const delay = (ms: number = 30) => new Promise((resolve) => setTimeout(resolve, ms));

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  city?: string;
  destination?: string;
  service?: string;
  category?: string;
  searchQuery?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  propertyType?: string;
  amenities?: string;
  instantBook?: boolean | string;
  superhost?: boolean | string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves all listings matching optional query filters.
 * // TODO: replace with Supabase query
 */
export async function getListings(params: IListingsParams = {}): Promise<safeListing[]> {
  await delay();
  // TODO: replace with Supabase query

  const {
    userId,
    roomCount,
    guestCount,
    bathroomCount,
    locationValue,
    city,
    destination,
    service,
    category,
    searchQuery,
    minPrice,
    maxPrice,
    propertyType,
    amenities,
    instantBook,
    superhost,
  } = params;

  let listings = [...mockListingsStore];

  if (userId) {
    listings = listings.filter((l) => l.userId === userId);
  }

  if (city) {
    const c = city.toLowerCase();
    listings = listings.filter((l) => l.city && l.city.toLowerCase() === c);
  }

  if (destination) {
    const d = destination.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(d) ||
        (l.city && l.city.toLowerCase().includes(d)) ||
        (l.locationValue && l.locationValue.toLowerCase().includes(d))
    );
  }

  if (service) {
    const s = service.toLowerCase();
    listings = listings.filter(
      (l) =>
        (l.service && l.service.toLowerCase().includes(s)) ||
        l.title.toLowerCase().includes(s) ||
        l.description.toLowerCase().includes(s)
    );
  }

  if (category && category.toLowerCase() !== "all") {
    listings = listings.filter(
      (l) =>
        l.category.toLowerCase() === category.toLowerCase() ||
        (l.type && l.type.toLowerCase() === category.toLowerCase())
    );
  }

  if (roomCount) {
    listings = listings.filter((l) => l.roomCount >= +roomCount);
  }

  if (guestCount) {
    listings = listings.filter((l) => l.guestCount >= +guestCount);
  }

  if (bathroomCount) {
    listings = listings.filter((l) => l.bathroomCount >= +bathroomCount);
  }

  if (locationValue) {
    listings = listings.filter((l) => l.locationValue === locationValue);
  }

  if (minPrice) {
    listings = listings.filter((l) => l.price >= +minPrice);
  }

  if (maxPrice) {
    listings = listings.filter((l) => l.price <= +maxPrice);
  }

  if (propertyType && propertyType !== "any") {
    const pt = propertyType.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.category.toLowerCase() === pt ||
        (l.type && l.type.toLowerCase() === pt) ||
        l.title.toLowerCase().includes(pt)
    );
  }

  if (amenities) {
    const amenityList = amenities.split(",").map((a) => a.trim().toLowerCase());
    listings = listings.filter((l) => {
      const listingAmenities = (l.amenities || []).map((a) => a.toLowerCase());
      return amenityList.every((req) => listingAmenities.includes(req));
    });
  }

  if (instantBook === true || instantBook === "true") {
    listings = listings.filter((l) => l.instantBook);
  }

  if (superhost === true || superhost === "true") {
    listings = listings.filter((l) => l.isSuperhost);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.locationValue.toLowerCase().includes(q)
    );
  }

  return listings.map((l) => ({
    ...l,
    user: mockUsersStore.find((u) => u.id === l.userId) || mockCurrentUserStore,
  }));
}

/**
 * Retrieves a single listing by ID including host information.
 * // TODO: replace with Supabase query
 */
export async function getListingById(params: {
  listingId?: string;
}): Promise<(safeListing & { user: SafeUser }) | null> {
  await delay();
  const { listingId } = params;
  if (!listingId) return null;

  // TODO: replace with Supabase query
  // const { data, error } = await supabase.from('listings').select('*, user:profiles(*)').eq('id', listingId).single();

  const listing = mockListingsStore.find((l) => l.id === listingId);
  if (!listing) return null;

  const hostUser = mockUsersStore.find((u) => u.id === listing.userId) || mockCurrentUserStore;

  return {
    ...listing,
    user: hostUser,
  };
}

/**
 * Retrieves listings bookmarked by the current user.
 * // TODO: replace with Supabase query
 */
export async function getFavoriteListings(): Promise<safeListing[]> {
  await delay();
  // TODO: replace with Supabase query
  // const { data } = await supabase.from('favorites').select('listing:listings(*)').eq('user_id', currentUser.id);

  const favoriteIds = mockCurrentUserStore.favoriteIds || [];
  const favorites = mockListingsStore.filter((l) => favoriteIds.includes(l.id));

  return favorites.map((l) => ({
    ...l,
    user: mockUsersStore.find((u) => u.id === l.userId) || mockCurrentUserStore,
  }));
}

/**
 * Creates a new listing.
 * // TODO: replace with Supabase query
 */
export async function createListing(data: {
  title: string;
  description: string;
  imageSrc: string;
  images?: string[];
  category: string;
  roomCount: number;
  bathroomCount: number;
  guestCount: number;
  location: { value: string; latlng?: [number, number] };
  price: number | string;
  userId?: string;
  city?: string;
  amenities?: string[];
  instantBook?: boolean;
  freeCancellation?: boolean;
}): Promise<safeListing> {
  await delay();
  // TODO: replace with Supabase query
  // const { data: newListing, error } = await supabase.from('listings').insert({...}).select().single();

  const newListing: safeListing = {
    id: `listing-${Date.now()}`,
    title: data.title,
    description: data.description,
    imageSrc: data.imageSrc,
    images: data.images && data.images.length > 0 ? data.images : [data.imageSrc],
    category: data.category,
    roomCount: data.roomCount,
    bathroomCount: data.bathroomCount,
    guestCount: data.guestCount,
    locationValue: data.location?.value || "US",
    city: data.city || "New York",
    coordinates: data.location?.latlng || [40.7128, -74.006],
    amenities: data.amenities || ["Wifi", "Kitchen", "Air conditioning", "Free parking"],
    instantBook: data.instantBook !== undefined ? data.instantBook : true,
    freeCancellation: data.freeCancellation !== undefined ? data.freeCancellation : true,
    price: parseInt(String(data.price), 10) || 100,
    userId: data.userId || mockCurrentUserStore.id,
    createdAt: new Date().toISOString(),
    rating: 5.0,
    reviewCount: 0,
    user: mockCurrentUserStore,
  };

  updateMockStores.addListing(newListing);
  return newListing;
}

/**
 * Deletes a listing by ID.
 * // TODO: replace with Supabase query
 */
export async function deleteListing(id: string): Promise<boolean> {
  await delay();
  // TODO: replace with Supabase query
  // const { error } = await supabase.from('listings').delete().eq('id', id);

  updateMockStores.deleteListing(id);
  return true;
}
