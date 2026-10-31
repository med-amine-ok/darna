import "server-only";
import { Listing, RoomType } from "@/types";
import { newId } from "@/lib/ids";
import { normalizeDateKey } from "@/lib/booking/dates";
import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import type { ActionErrorCode, ActionErrorParams } from "@/lib/action-result";

/** Thrown for owner input that must be rejected rather than clamped (e.g. prices). */
export class ListingInputError extends Error {
  constructor(
    public readonly code: ActionErrorCode,
    public readonly params?: ActionErrorParams
  ) {
    super(code);
    this.name = "ListingInputError";
  }
}

/** undefined when absent; throws when present but not a positive integer DZD price in range. */
function price(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!isValidPriceDzd(n)) throw new ListingInputError("PRICE_RANGE", { min: PRICE_MIN_DZD, max: PRICE_MAX_DZD });
  return n;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function time(value: unknown): string | undefined {
  return typeof value === "string" && TIME_RE.test(value) ? value : undefined;
}

function int(value: unknown, min: number, max: number): number | undefined {
  const n = num(value, min, max);
  return n === undefined ? undefined : Math.round(n);
}

/** Hosts allowed by next.config.js `images.remotePatterns`. */
const ALLOWED_IMAGE_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  "ui-avatars.com",
  "avatars.githubusercontent.com",
  "images.unsplash.com",
  "picsum.photos",
]);

export function isAllowedImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function str(value: unknown, max = 500): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

function num(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

function strArray(value: unknown, maxItems = 50, maxLen = 120): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function latlng(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const lat = num(value[0], -90, 90);
  const lng = num(value[1], -180, 180);
  return lat === undefined || lng === undefined ? undefined : [lat, lng];
}

function sanitizeRoomTypes(value: unknown, listingId: string): RoomType[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 30).flatMap((raw): RoomType[] => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    const name = str(r.name, 120);
    const roomPrice = price(r.price);
    const capacity = num(r.capacity, 1, 50);
    const totalInventory = num(r.totalInventory ?? r.inventoryCount, 1, 10000);
    const bookingUnit = oneOf(r.bookingUnit, ["room", "bed"] as const);
    if (!name || !roomPrice || !capacity || !totalInventory || !bookingUnit) return [];
    // Keep an existing id only if it is a plausible id string; otherwise mint one.
    const id = typeof r.id === "string" && /^[\w-]{1,80}$/.test(r.id) ? r.id : newId("rt");
    return [
      {
        id,
        propertyListingId: listingId,
        name,
        description: str(r.description, 1000),
        price: roomPrice,
        // basePrice mirrors price (the nightly rate charged); kept for older readers.
        basePrice: roomPrice,
        bookingUnit,
        totalInventory: Math.round(totalInventory),
        inventoryCount: Math.round(num(r.inventoryCount, 0, 10000) ?? totalInventory),
        capacity: Math.round(capacity),
        bedsDescription: str(r.bedsDescription, 200),
        amenities: strArray(r.amenities) || [],
        imageSrc: (Array.isArray(r.imageSrc) ? r.imageSrc : []).filter(isAllowedImageUrl).slice(0, 20),
        isAvailable: typeof r.isAvailable === "boolean" ? r.isAvailable : undefined,
      },
    ];
  });
}

/** Statuses an owner may set; "pending"/"suspended" are moderation states set by admins. */
export const OWNER_SETTABLE_LISTING_STATUSES = ["active", "draft"] as const;

/**
 * Whitelists the owner-editable fields of a listing. Never returns id,
 * ownership, rating/review stats, featured flags or timestamps.
 */
export function sanitizeListingInput(input: unknown, listingId: string): Partial<Listing> {
  if (!input || typeof input !== "object") return {};
  const d = input as Record<string, unknown>;
  const out: Partial<Listing> = {};

  const set = <K extends keyof Listing>(key: K, value: Listing[K] | undefined) => {
    if (value !== undefined) out[key] = value;
  };

  set("title", str(d.title, 200));
  set("description", str(d.description, 5000));
  set("subtitle", str(d.subtitle, 200));
  set("category", oneOf(d.category, ["home", "hotel", "experience", "vehicle", "trip"] as const));
  set("type", str(d.type, 80));
  set("status", oneOf(d.status, OWNER_SETTABLE_LISTING_STATUSES));
  set("price", price(d.price));
  set("originalPrice", price(d.originalPrice));
  // Fees & stay rules (0 is a valid cleaning fee).
  set("cleaningFee", int(d.cleaningFee, 0, 1_000_000));
  set("minNights", int(d.minNights, 1, 365));
  set("maxNights", int(d.maxNights, 1, 365));
  set("advanceNoticeDays", int(d.advanceNoticeDays, 0, 365));
  set("checkInTime", time(d.checkInTime));
  set("checkOutTime", time(d.checkOutTime));
  if (out.minNights !== undefined && out.maxNights !== undefined && out.maxNights < out.minNights) {
    throw new ListingInputError("MAX_NIGHTS_BELOW_MIN");
  }
  if (Array.isArray(d.imageSrc)) {
    const images = d.imageSrc.filter(isAllowedImageUrl).slice(0, 30);
    if (images.length > 0) out.imageSrc = images;
  }
  set("locationValue", str(d.locationValue, 120));
  set("city", str(d.city, 120));
  set("commune", str(d.commune, 120));
  set("latlng", latlng(d.latlng));
  if (typeof d.instantBook === "boolean") out.instantBook = d.instantBook;
  set("bookingApprovalMode", oneOf(d.bookingApprovalMode, ["instant", "request"] as const));
  set("availableFrom", normalizeDateKey(d.availableFrom) ?? undefined);
  set("availableTo", normalizeDateKey(d.availableTo) ?? undefined);
  set("hotelStarRating", num(d.hotelStarRating, 1, 5));

  set("guestCount", num(d.guestCount, 1, 500));
  set("roomCount", num(d.roomCount, 0, 5000));
  set("bathroomCount", num(d.bathroomCount, 0, 5000));
  set("bedroomCount", num(d.bedroomCount, 0, 5000));
  set("amenities", strArray(d.amenities));
  set("houseRules", strArray(d.houseRules, 30, 300));
  set("cancellationPolicy", oneOf(d.cancellationPolicy, ["flexible", "moderate", "strict"] as const));

  set("make", str(d.make, 80));
  set("model", str(d.model, 80));
  set("year", num(d.year, 1950, 2100));
  set("transmission", oneOf(d.transmission, ["automatic", "manual"] as const));
  set("seats", num(d.seats, 1, 100));
  set("fuelType", oneOf(d.fuelType, ["petrol", "diesel", "electric", "hybrid"] as const));
  set("pickupLocation", str(d.pickupLocation, 200));
  set("mileagePolicy", str(d.mileagePolicy, 300));
  set("insuranceNotes", str(d.insuranceNotes, 500));

  set("activityName", str(d.activityName, 200));
  set("durationHours", num(d.durationHours, 0, 1000));
  set("groupSize", num(d.groupSize, 1, 1000));
  set("perPersonPrice", num(d.perPersonPrice, 0, 100_000_000));
  set("includedItems", strArray(d.includedItems));
  set("experienceLanguages", strArray(d.experienceLanguages, 20));

  set("roomTypes", sanitizeRoomTypes(d.roomTypes, listingId));

  return out;
}
