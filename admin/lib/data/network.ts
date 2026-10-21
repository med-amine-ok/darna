// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { Listing, ListingVertical, HostType } from "@/lib/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface NetworkSearchParams {
  vertical?: ListingVertical;
  destination?: string;
  wilayaCode?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  hostType?: HostType | "all";
  propertyType?: string;
}

export async function searchNetwork(params: NetworkSearchParams = {}) {
  await delay(180);

  const vertical = params.vertical || "home";
  let results = store.listings.filter((l) => l.category === vertical);

  // Filter by Wilaya / destination
  if (params.wilayaCode && params.wilayaCode !== "all") {
    results = results.filter((l) => l.wilayaCode === params.wilayaCode);
  }

  if (params.destination?.trim()) {
    const dest = params.destination.toLowerCase();
    results = results.filter(
      (l) =>
        l.city.toLowerCase().includes(dest) ||
        l.title.toLowerCase().includes(dest) ||
        l.wilayaCode === dest
    );
  }

  // Filter by guests
  if (params.guests && params.guests > 1) {
    results = results.filter((l) => l.guestCapacity >= params.guests!);
  }

  // Filter by price
  if (params.minPrice) {
    results = results.filter((l) => l.price >= params.minPrice!);
  }
  if (params.maxPrice) {
    results = results.filter((l) => l.price <= params.maxPrice!);
  }

  // Filter by host type
  if (params.hostType && params.hostType !== "all") {
    results = results.filter((l) => l.hostType === params.hostType);
  }

  // Filter by property type
  if (params.propertyType && params.propertyType !== "all") {
    results = results.filter((l) => l.propertyType === params.propertyType);
  }

  return {
    results,
    total: results.length,
    vertical,
  };
}
