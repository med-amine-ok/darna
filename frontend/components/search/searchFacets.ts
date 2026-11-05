import { create } from "zustand";
import type { Listing, ListingVertical, Trip } from "@/types";
import { locatePlace } from "@/lib/algeria";
import { isExperienceType, isTripType } from "@/lib/catalog-types";

/**
 * Lightweight facts about the results of the current search *before* the side filters.
 * The search page publishes them so the filter sidebar and the filter modal can show counts
 * per option, a price histogram and "Show N stays" without another request. The same
 * matchers run on the server (app/[locale]/search/page.tsx), so counts always agree with
 * the results.
 */
export interface ListingFacet {
  price: number;
  vertical: ListingVertical;
  /** Lower-cased subtype ("villa", "suv / 4x4"). */
  type: string;
  /** Subtype as written by the host, for display ("SUV / 4x4"). */
  rawType: string;
  businessCategory?: string;
  /** Normalised amenity strings ("air conditioning", "high speed wi fi"). */
  amenities: string[];
  units: string[];
  wilaya?: number;
  commune?: string;
  bedrooms: number;
  bathrooms: number;
  rating: number;
  instant: boolean;
  favorite: boolean;
  cancellation?: string;
  owner?: string;
  stars: number;
  transmission?: string;
  fuel?: string;
  seats: number;
  hours: number;
  languages: string[];
  /** Canonical experience type id (EXPERIENCE_TYPES), experiences only. */
  expType?: string;
}

export interface TripFacet {
  price: number;
  wilaya?: number;
  commune?: string;
  days: number;
  /** Departure months (1 to 12). */
  months: number[];
  rating: number;
  group: number;
  agency?: string;
  /** Canonical trip type id (TRIP_TYPES). */
  tripType?: string;
}

const normText = (v: string) => v.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

/** Same rules as lib/data/listings (vertical filter). */
export function verticalOf(l: Pick<Listing, "category" | "businessCategory" | "type">): ListingVertical {
  const type = (l.type || "").toLowerCase();
  if (l.businessCategory === "hotel" || l.businessCategory === "hostel" || l.category === "hotel" || type.includes("hotel") || type.includes("hostel")) {
    return "hotel";
  }
  return l.category;
}

export function toFacet(l: Listing): ListingFacet {
  const place = locatePlace(l);
  return {
    price: l.price,
    vertical: verticalOf(l),
    type: (l.type || "").toLowerCase(),
    rawType: l.type || "",
    businessCategory: l.businessCategory,
    amenities: Array.from(
      new Set([...(l.amenities || []), ...(l.roomTypes || []).flatMap((r) => r.amenities || [])].map(normText))
    ),
    units: (l.roomTypes || []).map((r) => r.bookingUnit || ""),
    wilaya: place.wilaya,
    commune: place.commune,
    bedrooms: l.bedroomCount ?? l.roomCount ?? 0,
    bathrooms: l.bathroomCount ?? 0,
    rating: l.rating ?? 0,
    instant: Boolean(l.instantBook || l.bookingApprovalMode === "instant"),
    favorite: Boolean(l.isGuestFavorite),
    cancellation: l.cancellationPolicy,
    owner: l.ownerType,
    stars: l.hotelStarRating ?? 0,
    transmission: l.transmission,
    fuel: l.fuelType,
    seats: l.seats ?? 0,
    hours: l.durationHours ?? 0,
    languages: l.experienceLanguages ?? [],
    expType: l.category === "experience" && isExperienceType(l.experienceType) ? l.experienceType : undefined,
  };
}

export function toTripFacet(t: Trip): TripFacet {
  const months = new Set<number>();
  for (const d of t.departureDates ?? []) {
    const month = Number(String(d).slice(5, 7));
    if (month >= 1 && month <= 12) months.add(month);
  }
  const place = locatePlace(t);
  return {
    price: t.pricePerPerson,
    wilaya: place.wilaya,
    commune: place.commune,
    days: t.durationDays,
    months: Array.from(months),
    rating: t.rating ?? 0,
    group: t.maxGroupSize,
    agency: t.organization?.name,
    tripType: isTripType(t.tripType) ? t.tripType : undefined,
  };
}

interface SearchFacetsStore {
  pool: ListingFacet[];
  tripPool: TripFacet[];
  setPool: (pool: ListingFacet[], tripPool?: TripFacet[]) => void;
}

export const useSearchFacets = create<SearchFacetsStore>((set) => ({
  pool: [],
  tripPool: [],
  setPool: (pool, tripPool = []) => set({ pool, tripPool }),
}));

/* ------------------------------------------------------------------ Options */

/** Amenity filter keys (also the label keys in `amenities`) and the text they match. */
export const AMENITY_GROUPS: Record<string, string[]> = {
  wifi: ["wifi", "wi fi"],
  airConditioning: ["air conditioning"],
  pool: ["pool"],
  freeParking: ["parking", "valet"],
  kitchen: ["kitchen"],
  seaView: ["sea view", "bay view"],
  breakfast: ["breakfast"],
  spa: ["spa", "hammam", "jacuzzi", "hot tub"],
  gym: ["gym"],
  restaurant: ["restaurant"],
  rooftop: ["rooftop"],
  garden: ["garden", "balcony", "patio"],
  courtyard: ["courtyard"],
  fireplace: ["fireplace"],
  heating: ["heating"],
  elevator: ["elevator"],
  tv: ["tv"],
  washer: ["laundry", "washer"],
  lockers: ["locker"],
  airportTransfer: ["airport transfer"],
};

/** Older URL values (labels) still found in shared links. */
const LEGACY_AMENITY: Record<string, string> = {
  wifi: "wifi",
  pool: "pool",
  "air conditioning": "airConditioning",
  "sea view": "seaView",
  kitchen: "kitchen",
  "free parking": "freeParking",
  fireplace: "fireplace",
  courtyard: "courtyard",
};

export function hasAmenity(f: Pick<ListingFacet, "amenities">, key: string): boolean {
  const group = AMENITY_GROUPS[key] ?? AMENITY_GROUPS[LEGACY_AMENITY[normText(key)] ?? ""] ?? [normText(key)];
  return f.amenities.some((a) => group.some((alias) => a.includes(alias)));
}

export const DURATION_BUCKETS = [
  { id: "1-3", min: 1, max: 3 },
  { id: "4-7", min: 4, max: 7 },
  { id: "8-14", min: 8, max: 14 },
  { id: "15+", min: 15, max: Infinity },
] as const;

export const EXPERIENCE_LENGTHS = [
  { id: "upTo4h", min: 0, max: 4 },
  { id: "halfDay", min: 4.01, max: 12 },
  { id: "multiDay", min: 12.01, max: Infinity },
] as const;

/* ------------------------------------------------------------------ Filters */

/** Side filters as they live in the URL (lists are comma separated). */
export interface SideFilters {
  wilayas: number[];
  communes: string[];
  /** Stay types, any of them (`propertyType=Villa,Riad`). */
  types: string[];
  /** Vehicle or experience subtypes as written by hosts (`subtype=SUV / 4x4`). */
  subtypes: string[];
  minPrice?: number;
  maxPrice?: number;
  /** All of them (keys of AMENITY_GROUPS). */
  amenities: string[];
  minBedrooms?: number;
  minBathrooms?: number;
  minRating?: number;
  instant: boolean;
  favorite: boolean;
  freeCancel: boolean;
  hosts: string[];
  minStars?: number;
  transmissions: string[];
  fuels: string[];
  minSeats?: number;
  expLengths: string[];
  /** Canonical experience types, any of them (`expType=desert,gastronomy`). */
  expTypes: string[];
  languages: string[];
  /** Canonical trip types, any of them (`tripType=cultural,hiking`). */
  tripTypes: string[];
  durations: string[];
  months: number[];
  minGroup?: number;
  agencies: string[];
}

export type FilterGroup =
  | "wilayas"
  | "communes"
  | "types"
  | "subtypes"
  | "price"
  | "amenities"
  | "bedrooms"
  | "bathrooms"
  | "rating"
  | "instant"
  | "favorite"
  | "freeCancel"
  | "hosts"
  | "stars"
  | "transmissions"
  | "fuels"
  | "seats"
  | "expLengths"
  | "expTypes"
  | "languages"
  | "tripTypes"
  | "durations"
  | "months"
  | "group"
  | "agencies";

/** URL parameter of each group (price uses minPrice and maxPrice). */
export const FILTER_PARAMS: Record<Exclude<FilterGroup, "price">, string> = {
  wilayas: "wilayas",
  communes: "communes",
  types: "propertyType",
  subtypes: "subtype",
  amenities: "amenities",
  bedrooms: "roomCount",
  bathrooms: "bathroomCount",
  rating: "minRating",
  instant: "instantBook",
  favorite: "isGuestFavorite",
  freeCancel: "freeCancellation",
  hosts: "host",
  stars: "stars",
  transmissions: "transmission",
  fuels: "fuel",
  seats: "seats",
  expLengths: "expLength",
  expTypes: "expType",
  languages: "lang",
  tripTypes: "tripType",
  durations: "duration",
  months: "months",
  group: "groupSize",
  agencies: "agency",
};

const list = (v: unknown) =>
  (Array.isArray(v) ? v.join(",") : typeof v === "string" ? v : "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const num = (v: unknown) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const flag = (v: unknown) => (Array.isArray(v) ? v[0] : v) === "true";

/** Reads the side filters from search params (server `searchParams` object or a getter). */
export function parseSideFilters(get: (key: string) => unknown): SideFilters {
  return {
    wilayas: list(get("wilayas")).map(Number).filter((n) => n >= 1 && n <= 58),
    communes: list(get("communes")),
    types: list(get("propertyType")).filter((t) => t.toLowerCase() !== "any"),
    subtypes: list(get("subtype")),
    minPrice: num(get("minPrice")),
    maxPrice: num(get("maxPrice")),
    amenities: list(get("amenities")),
    minBedrooms: num(get("roomCount")),
    minBathrooms: num(get("bathroomCount")),
    minRating: num(get("minRating")),
    instant: flag(get("instantBook")),
    favorite: flag(get("isGuestFavorite")),
    freeCancel: flag(get("freeCancellation")),
    hosts: list(get("host")),
    minStars: num(get("stars")),
    transmissions: list(get("transmission")),
    fuels: list(get("fuel")),
    minSeats: num(get("seats")),
    expLengths: list(get("expLength")),
    expTypes: list(get("expType")).filter(isExperienceType),
    languages: list(get("lang")),
    tripTypes: list(get("tripType")).filter(isTripType),
    durations: list(get("duration")),
    months: list(get("months")).map(Number).filter((m) => m >= 1 && m <= 12),
    minGroup: num(get("groupSize")),
    agencies: list(get("agency")),
  };
}

/** Number of active filters (each ticked option counts). */
export function countSideFilters(f: SideFilters): number {
  return (
    f.wilayas.length +
    f.communes.length +
    f.types.length +
    f.subtypes.length +
    (f.minPrice || f.maxPrice ? 1 : 0) +
    f.amenities.length +
    (f.minBedrooms && f.minBedrooms > 1 ? 1 : 0) +
    (f.minBathrooms && f.minBathrooms > 1 ? 1 : 0) +
    (f.minRating ? 1 : 0) +
    (f.instant ? 1 : 0) +
    (f.favorite ? 1 : 0) +
    (f.freeCancel ? 1 : 0) +
    f.hosts.length +
    (f.minStars ? 1 : 0) +
    f.transmissions.length +
    f.fuels.length +
    (f.minSeats ? 1 : 0) +
    f.expLengths.length +
    f.expTypes.length +
    f.languages.length +
    f.tripTypes.length +
    f.durations.length +
    f.months.length +
    (f.minGroup ? 1 : 0) +
    f.agencies.length
  );
}

export const hasSideFilters = (f: SideFilters) => countSideFilters(f) > 0;

const sameText = (a: string, b: string) => normText(a.normalize("NFD").replace(/[̀-ͯ]/g, "")) === normText(b.normalize("NFD").replace(/[̀-ͯ]/g, ""));

/** Mirrors the property type rules used across search (hotel, hostel, entire home, private room, exact type). */
export function matchesType(f: Pick<ListingFacet, "type" | "businessCategory" | "units">, type: string): boolean {
  const pt = type.toLowerCase();
  if (pt === "hotel") return f.businessCategory === "hotel" || f.type.includes("hotel");
  if (pt === "hostel") return f.businessCategory === "hostel" || f.type.includes("hostel");
  if (pt === "entire home" || pt === "entire") return f.businessCategory !== "hotel" && f.businessCategory !== "hostel" && !f.units.includes("bed");
  if (pt === "private room" || pt === "private_room") return f.type.includes("room") || f.units.includes("room");
  if (pt === "riad") return f.type.includes("riad") || f.type.includes("ksar") || f.type.includes("heritage");
  return f.type === pt || f.businessCategory === pt;
}

type Skip = FilterGroup | FilterGroup[] | undefined;
const skipper = (skip: Skip) => {
  const set = new Set(Array.isArray(skip) ? skip : skip ? [skip] : []);
  return (g: FilterGroup) => !set.has(g);
};

function placeMatches(f: { wilaya?: number; commune?: string }, filters: SideFilters, use: (g: FilterGroup) => boolean) {
  if (use("wilayas") && filters.wilayas.length && !(f.wilaya && filters.wilayas.includes(f.wilaya))) return false;
  if (use("communes") && filters.communes.length && !(f.commune && filters.communes.some((c) => sameText(c, f.commune!)))) return false;
  return true;
}

/** `skip` leaves groups out, which gives the count each option of those groups would reach. */
export function matchesListing(f: ListingFacet, filters: SideFilters, skip?: Skip): boolean {
  const use = skipper(skip);
  if (!placeMatches(f, filters, use)) return false;
  if (use("types") && filters.types.length && !filters.types.some((t) => matchesType(f, t))) return false;
  if (use("subtypes") && filters.subtypes.length && !filters.subtypes.some((t) => sameText(t, f.rawType))) return false;
  if (use("price")) {
    if (filters.minPrice && f.price < filters.minPrice) return false;
    if (filters.maxPrice && f.price > filters.maxPrice) return false;
  }
  if (use("amenities") && !filters.amenities.every((a) => hasAmenity(f, a))) return false;
  if (use("bedrooms") && filters.minBedrooms && filters.minBedrooms > 1 && f.bedrooms < filters.minBedrooms) return false;
  if (use("bathrooms") && filters.minBathrooms && filters.minBathrooms > 1 && f.bathrooms < filters.minBathrooms) return false;
  if (use("rating") && filters.minRating && f.rating < filters.minRating) return false;
  if (use("instant") && filters.instant && !f.instant) return false;
  if (use("favorite") && filters.favorite && !f.favorite) return false;
  if (use("freeCancel") && filters.freeCancel && f.cancellation !== "flexible") return false;
  if (use("hosts") && filters.hosts.length && !(f.owner && filters.hosts.includes(f.owner))) return false;
  if (use("stars") && filters.minStars && f.stars < filters.minStars) return false;
  if (use("transmissions") && filters.transmissions.length && !(f.transmission && filters.transmissions.includes(f.transmission))) return false;
  if (use("fuels") && filters.fuels.length && !(f.fuel && filters.fuels.includes(f.fuel))) return false;
  if (use("seats") && filters.minSeats && f.seats < filters.minSeats) return false;
  if (use("expLengths") && filters.expLengths.length) {
    const ok = filters.expLengths.some((id) => {
      const b = EXPERIENCE_LENGTHS.find((x) => x.id === id);
      return b ? f.hours >= b.min && f.hours <= b.max : false;
    });
    if (!ok) return false;
  }
  if (use("expTypes") && filters.expTypes.length && !(f.expType && filters.expTypes.includes(f.expType))) return false;
  if (use("languages") && filters.languages.length && !filters.languages.some((l) => f.languages.some((x) => sameText(x, l)))) return false;
  return true;
}

export function matchesTrip(f: TripFacet, filters: SideFilters, skip?: Skip): boolean {
  const use = skipper(skip);
  if (!placeMatches(f, filters, use)) return false;
  if (use("price")) {
    if (filters.minPrice && f.price < filters.minPrice) return false;
    if (filters.maxPrice && f.price > filters.maxPrice) return false;
  }
  if (use("tripTypes") && filters.tripTypes.length && !(f.tripType && filters.tripTypes.includes(f.tripType))) return false;
  if (use("durations") && filters.durations.length) {
    const ok = filters.durations.some((id) => {
      const b = DURATION_BUCKETS.find((x) => x.id === id);
      return b ? f.days >= b.min && f.days <= b.max : false;
    });
    if (!ok) return false;
  }
  if (use("months") && filters.months.length && !filters.months.some((m) => f.months.includes(m))) return false;
  if (use("rating") && filters.minRating && f.rating < filters.minRating) return false;
  if (use("group") && filters.minGroup && f.group < filters.minGroup) return false;
  if (use("agencies") && filters.agencies.length && !(f.agency && filters.agencies.includes(f.agency))) return false;
  return true;
}

/* ------------------------------------------------------------------ Filter modal (phones and tablets) */

export interface ModalFilters {
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  amenities: string[];
  minBedrooms?: number;
  minBathrooms?: number;
}

/** Estimate for the filter modal's "Show N stays"; the sidebar-only filters from the URL stay applied. */
export function matchesFilters(f: ListingFacet, filters: ModalFilters, base: SideFilters): boolean {
  const pt = filters.propertyType && filters.propertyType !== "any" ? [filters.propertyType] : [];
  return matchesListing(f, {
    ...base,
    types: pt,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    amenities: filters.amenities,
    minBedrooms: filters.minBedrooms,
    minBathrooms: filters.minBathrooms,
  });
}
