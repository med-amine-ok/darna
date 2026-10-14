// TODO: replace with Supabase query
import { Listing, ListingVertical, SearchParams } from "@/types";
import { mockListings } from "@/lib/mock-data/listings";

const g = globalThis as unknown as { __darna_listings__?: Listing[] };
if (!g.__darna_listings__) {
  g.__darna_listings__ = [...mockListings];
}
let listingsStore: Listing[] = g.__darna_listings__;

export async function getListings(params?: SearchParams): Promise<Listing[]> {
  // Simulate realistic network latency for skeletons/loading states
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Ensure mockListings additions are present
  listingsStore = Array.from(new Map([...mockListings, ...listingsStore].map((item) => [item.id, item])).values());
  g.__darna_listings__ = listingsStore;

  let results = [...listingsStore];

  if (!params) return results;

  if (params.vertical) {
    results = results.filter((item) => item.category === params.vertical);
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

  if (params.guests && params.guests > 1) {
    results = results.filter(
      (item) => !item.guestCount || item.guestCount >= (params.guests || 1)
    );
  }

  // Date range overlap matching logic (Section 6)
  const rawSearchStart = params.startDate || params.checkIn;
  const rawSearchEnd = params.endDate || params.checkOut;

  if (rawSearchStart && rawSearchEnd) {
    const sStart = new Date(rawSearchStart);
    const sEnd = new Date(rawSearchEnd);

    if (!isNaN(sStart.getTime()) && !isNaN(sEnd.getTime()) && sStart < sEnd) {
      results = results
        .map((item) => {
          if (item.availableFrom && item.availableTo) {
            const lStart = new Date(item.availableFrom);
            const lEnd = new Date(item.availableTo);

            if (!isNaN(lStart.getTime()) && !isNaN(lEnd.getTime())) {
              // Calculate overlap window: [overlapStart, overlapEnd]
              const overlapStartTime = Math.max(lStart.getTime(), sStart.getTime());
              const overlapEndTime = Math.min(lEnd.getTime(), sEnd.getTime());

              // Valid overlap exists if start < end
              if (overlapStartTime < overlapEndTime) {
                const overlapStart = new Date(overlapStartTime);
                const overlapEnd = new Date(overlapEndTime);

                // Is it a partial overlap? (listing does not cover full searched interval)
                const isPartial =
                  lStart.getTime() > sStart.getTime() || lEnd.getTime() < sEnd.getTime();

                return {
                  ...item,
                  matchedAvailability: {
                    isPartial,
                    overlapStart: overlapStart.toISOString().split("T")[0],
                    overlapEnd: overlapEnd.toISOString().split("T")[0],
                    listingAvailableFrom: item.availableFrom,
                    listingAvailableTo: item.availableTo,
                    searchedStart: rawSearchStart,
                    searchedEnd: rawSearchEnd,
                  },
                };
              } else {
                // Zero overlap: completely outside the listing's availability window
                return null;
              }
            }
          }

          // If listing does not specify fixed bounds, it has full standard availability
          return item;
        })
        .filter((item): item is Listing => item !== null);
    }
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
  g.__darna_listings__ = listingsStore;
  if (!mockListings.some((l) => l.id === newListing.id)) {
    mockListings.unshift(newListing);
  }
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
