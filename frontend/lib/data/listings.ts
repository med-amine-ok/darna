// TODO: replace with Supabase query
import "server-only";
import { Listing, ListingVertical, SearchParams } from "@/types";
import { newId } from "@/lib/ids";
import { isDateKey, normalizeDateKey } from "@/lib/booking/dates";
import { quoteListingBooking, roomTypePrice } from "@/lib/booking/pricing";
import { isListingFreeForRange } from "./reservations";
import { priceOverridesFor } from "./calendar";
import { clone, delay, removeWhere } from "./_store";
import { sanitizeListingInput } from "./_sanitize";
import { listingsTable as listingsStore } from "./_tables";

/** Only active listings are public and bookable. */
export function isPublicListing(listing: Pick<Listing, "status">): boolean {
  return listing.status === "active";
}

export async function getListings(params?: SearchParams): Promise<Listing[]> {
  // Simulate realistic network latency for skeletons/loading states
  await delay(60);

  // Public reads only ever return published (active) listings.
  let results = clone(listingsStore.filter(isPublicListing));

  if (!params) return results;

  if (params.vertical) {
    if (params.vertical === "hotel") {
      results = results.filter(
        (item) =>
          item.businessCategory === "hotel" ||
          item.businessCategory === "hostel" ||
          item.category === "hotel" ||
          item.type?.toLowerCase().includes("hotel") ||
          item.type?.toLowerCase().includes("hostel")
      );
    } else if (params.vertical === "home") {
      results = results.filter(
        (item) =>
          item.category === "home" &&
          item.businessCategory !== "hotel" &&
          item.businessCategory !== "hostel"
      );
    } else {
      results = results.filter((item) => item.category === params.vertical);
    }
  }

  if (params.category) {
    const cat = params.category.toLowerCase();
    results = results.filter(
      (item) =>
        item.type?.toLowerCase().includes(cat) ||
        item.amenities?.some((a) => a.toLowerCase().includes(cat)) ||
        (cat.includes("hotel") && (item.businessCategory === "hotel" || item.type?.toLowerCase().includes("hotel"))) ||
        (cat.includes("hostel") && (item.businessCategory === "hostel" || item.type?.toLowerCase().includes("hostel")))
    );
  }

  if (params.propertyType && params.propertyType !== "any") {
    const pt = params.propertyType.toLowerCase();
    if (pt === "hotel") {
      results = results.filter(
        (item) => item.businessCategory === "hotel" || item.type?.toLowerCase().includes("hotel")
      );
    } else if (pt === "hostel") {
      results = results.filter(
        (item) => item.businessCategory === "hostel" || item.type?.toLowerCase().includes("hostel")
      );
    } else if (pt === "entire home" || pt === "entire") {
      results = results.filter(
        (item) =>
          item.businessCategory !== "hotel" &&
          item.businessCategory !== "hostel" &&
          !item.roomTypes?.some((r) => r.bookingUnit === "bed")
      );
    } else if (pt === "private room" || pt === "private_room") {
      results = results.filter(
        (item) =>
          item.type?.toLowerCase().includes("room") ||
          item.roomTypes?.some((r) => r.bookingUnit === "room")
      );
    } else {
      results = results.filter(
        (item) => item.type?.toLowerCase() === pt || item.businessCategory === pt
      );
    }
  }

  if (params.amenities && params.amenities.length > 0) {
    const targetAmenities = Array.isArray(params.amenities)
      ? params.amenities.map((a) => a.toLowerCase())
      : typeof params.amenities === "string"
      ? (params.amenities as string).toLowerCase().split(",")
      : [];

    if (targetAmenities.length > 0) {
      results = results.filter((item) => {
        const itemAmenities = (item.amenities || []).map((a) => a.toLowerCase());
        return targetAmenities.every((target) =>
          itemAmenities.some((ia) => ia.includes(target) || target.includes(ia))
        );
      });
    }
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

  const guestCount = params.guests || (params as any).guestCount;
  if (guestCount && guestCount > 1) {
    results = results.filter(
      (item) => !item.guestCount || item.guestCount >= guestCount
    );
  }

  // Date range matching (half-open [checkIn, checkOut) date keys).
  const searchStart = normalizeDateKey(params.startDate || params.checkIn);
  const searchEnd = normalizeDateKey(params.endDate || params.checkOut);

  if (searchStart && searchEnd && searchStart < searchEnd) {
    results = results
      .map((item): Listing | null => {
        const from = item.availableFrom && isDateKey(item.availableFrom) ? item.availableFrom : null;
        const to = item.availableTo && isDateKey(item.availableTo) ? item.availableTo : null;
        if (!from && !to) return item;

        // availableTo is the last possible checkout date.
        const overlapStart = from && from > searchStart ? from : searchStart;
        const overlapEnd = to && to < searchEnd ? to : searchEnd;
        if (overlapStart >= overlapEnd) return null; // no overlap at all

        const isPartial = overlapStart !== searchStart || overlapEnd !== searchEnd;
        return isPartial
          ? {
              ...item,
              matchedAvailability: {
                isPartial,
                overlapStart,
                overlapEnd,
                listingAvailableFrom: item.availableFrom || "",
                listingAvailableTo: item.availableTo || "",
                searchedStart: searchStart,
                searchedEnd: searchEnd,
              },
            }
          : item;
      })
      .filter((item): item is Listing => item !== null)
      // Drop listings booked or blocked on the searched nights (back-to-back is fine).
      .filter((item) => {
        const start = item.matchedAvailability?.overlapStart ?? searchStart;
        const end = item.matchedAvailability?.overlapEnd ?? searchEnd;
        return isListingFreeForRange(item, start, end);
      })
      // Server-computed total for the "Show total price" display option.
      .map((item) => {
        const start = item.matchedAvailability?.overlapStart ?? searchStart;
        const end = item.matchedAvailability?.overlapEnd ?? searchEnd;
        const quote = quoteListingBooking({
          listing: item,
          startDate: start,
          endDate: item.category === "experience" ? start : end,
          guestCount: Math.max(1, Number(guestCount) || 1),
          // Cards show "from" prices: quote the cheapest room type.
          selectedRoomTypeId: item.roomTypes?.length
            ? [...item.roomTypes].sort((a, b) => roomTypePrice(a) - roomTypePrice(b))[0].id
            : undefined,
          unitCount: 1,
          priceOverrides: item.roomTypes?.length ? undefined : priceOverridesFor(item.id),
        });
        return { ...item, quotedTotal: quote.total };
      });
  }

  return results;
}

/** Raw lookup (any status) — for ownership checks and owner pages. */
export async function getListingById(id: string): Promise<Listing | null> {
  await delay(40);
  const listing = listingsStore.find((l) => l.id === id);
  return listing ? clone(listing) : null;
}

/**
 * Public lookup: only active listings, except that owners still see their
 * own drafts (pass `canSeeUnpublished` after an ownership check).
 */
export async function getPublicListingById(
  id: string,
  canSeeUnpublished?: (listing: Listing) => boolean
): Promise<Listing | null> {
  const listing = await getListingById(id);
  if (!listing) return null;
  if (isPublicListing(listing)) return listing;
  return canSeeUnpublished?.(listing) ? listing : null;
}

export async function getFeaturedListings(vertical?: ListingVertical): Promise<Listing[]> {
  await delay(40);
  return clone(listingsStore.filter((l) => isPublicListing(l) && l.featured && (!vertical || l.category === vertical)));
}

/** Listings owned by an individual host (hostUserId) or by an organization. */
export async function getHostListings(owner: { userId?: string; organizationId?: string }): Promise<Listing[]> {
  await delay(40);
  return clone(
    listingsStore.filter((l) =>
      owner.organizationId
        ? l.organizationId === owner.organizationId
        : Boolean(owner.userId) && l.hostUserId === owner.userId && !l.organizationId
    )
  );
}

export interface ListingOwner {
  hostUserId: string;
  organizationId?: string | null;
  businessCategory?: "agency" | "hotel" | "hostel";
}

/**
 * Creates a listing. Ownership, id, timestamps and stats are set here on the
 * server; everything else goes through the field whitelist.
 */
export async function createListing(owner: ListingOwner, input: unknown): Promise<Listing> {
  await delay(60);
  const id = newId("lst");
  const data = sanitizeListingInput(input, id);
  const now = new Date().toISOString();

  const newListing: Listing = {
    title: "Untitled Algerian Stay",
    description: "",
    category: "home",
    type: "Villa",
    price: 15000,
    imageSrc: ["/assets/hero.jpg"],
    locationValue: data.city || "Algiers",
    city: "Algiers",
    latlng: [36.7538, 3.0588],
    guestCount: 4,
    bedroomCount: 2,
    roomCount: 3,
    bathroomCount: 2,
    amenities: [],
    houseRules: [],
    cancellationPolicy: "flexible",
    instantBook: true,
    status: "active",
    ...data,
    // Server-controlled fields — never taken from the client.
    id,
    ownerType: owner.organizationId ? "organization" : "individual",
    hostUserId: owner.hostUserId,
    organizationId: owner.organizationId || null,
    businessCategory: owner.businessCategory,
    country: "Algeria",
    createdAt: now,
    updatedAt: now,
    rating: undefined,
    reviewCount: 0,
    bookingsCount: 0,
    featured: false,
    isGuestFavorite: false,
  };

  listingsStore.unshift(newListing);
  return clone(newListing);
}

/** Applies a whitelisted patch (see sanitizeListingInput). */
export async function updateListing(id: string, input: unknown): Promise<Listing | null> {
  await delay(40);
  const listing = listingsStore.find((l) => l.id === id);
  if (!listing) return null;
  Object.assign(listing, sanitizeListingInput(input, id), { updatedAt: new Date().toISOString() });
  return clone(listing);
}

/** Removes the listing from the store for good (it is not re-seeded on later reads). */
export async function deleteListing(id: string): Promise<boolean> {
  await delay(40);
  return removeWhere(listingsStore, (l) => l.id === id) > 0;
}
