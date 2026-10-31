/**
 * Booking price quotes, pure and client-safe, so the booking widgets preview
 * exactly what the server charges. The SERVER recomputes every quote when a
 * booking is created (app/actions/bookings.ts); client totals are display-only.
 *
 * Pricing models:
 *  - homes ("stays")      price per night × nights (per-date host overrides apply)
 *  - hotel room types     room price × rooms × nights
 *  - hostel bed types     bed price × beds × nights
 *  - experiences          price per person × guests (one date; overrides apply)
 *  - vehicles             price per day × days (per-date overrides apply)
 *  - trips                price per traveller × travellers (per departure)
 *
 * Fees: cleaning fee once per booking (listing.cleaningFee ?? default, 0 is
 * valid); DARNA service fee = rate × subtotal; taxes = rate × (subtotal +
 * cleaning) and only shown when the rate is > 0. All amounts are integer DZD,
 * rounded in exactly one place (roundDzd).
 */
import type { Listing, RoomType, Trip } from "@/types";
import {
  DEFAULT_CLEANING_FEES,
  PLATFORM_TAX_RATE,
  SERVICE_FEE_RATES,
} from "./config";
import { eachNightKey, nightsBetween, type DateKey } from "./dates";

export type PricingModel =
  | "per_night"
  | "per_room_night"
  | "per_bed_night"
  | "per_person"
  | "per_day"
  | "per_traveller";

export interface BookingQuote {
  model: PricingModel;
  /** Nights (stays, rooms, beds) or rental days (vehicles); 1 for experiences and trips. */
  nights: number;
  /** Rooms, beds, persons or travellers; 1 for homes and vehicles. */
  quantity: number;
  /** Standard unit price (before per-date overrides). */
  unitPrice: number;
  /** subtotal / (nights × quantity), rounded, equals unitPrice without overrides. */
  averageUnitPrice: number;
  hasPriceOverrides: boolean;
  subtotal: number;
  cleaningFee: number;
  serviceFeeRate: number;
  serviceFee: number;
  taxRate: number;
  taxes: number;
  total: number;
}

/** The single rounding rule for money: integer DZD. */
export function roundDzd(amount: number): number {
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export type PriceOverrides = Record<DateKey, number>;

type QuotableListing = Pick<
  Listing,
  | "price"
  | "category"
  | "roomTypes"
  | "cleaningFee"
  | "serviceFeeRate"
  | "taxRate"
>;

export function roomTypePrice(
  roomType: Pick<RoomType, "price" | "basePrice">,
): number {
  return roomType.basePrice ?? roomType.price;
}

export function roomTypeInventory(
  roomType: Pick<RoomType, "inventoryCount" | "totalInventory">,
): number {
  return Math.max(0, roomType.inventoryCount ?? roomType.totalInventory ?? 0);
}

/** The room type a booking applies to (first one when none/unknown is selected). */
export function selectRoomType<T extends Pick<Listing, "roomTypes">>(
  listing: T,
  roomTypeId?: string | null,
): RoomType | null {
  if (!listing.roomTypes || listing.roomTypes.length === 0) return null;
  return (
    listing.roomTypes.find((r) => r.id === roomTypeId) || listing.roomTypes[0]
  );
}

export function pricingModelFor(
  listing: Pick<Listing, "category">,
  roomType?: Pick<RoomType, "bookingUnit"> | null,
): PricingModel {
  if (roomType)
    return roomType.bookingUnit === "bed" ? "per_bed_night" : "per_room_night";
  if (listing.category === "experience") return "per_person";
  if (listing.category === "vehicle") return "per_day";
  if (listing.category === "trip") return "per_traveller";
  return "per_night";
}

/** Short English unit label for "/ night"-style suffixes. */
export function unitLabel(model: PricingModel): string {
  switch (model) {
    case "per_bed_night":
      return "bed";
    case "per_room_night":
      return "room";
    case "per_person":
      return "person";
    case "per_traveller":
      return "traveler";
    case "per_day":
      return "day";
    default:
      return "night";
  }
}

function serviceFeeRateFor(
  listing: Pick<Listing, "category" | "serviceFeeRate">,
): number {
  const rate =
    listing.serviceFeeRate ?? SERVICE_FEE_RATES[listing.category] ?? 0;
  return Math.min(1, Math.max(0, rate));
}

function finishQuote(
  base: Omit<
    BookingQuote,
    | "serviceFee"
    | "taxes"
    | "total"
    | "averageUnitPrice"
    | "serviceFeeRate"
    | "taxRate"
  >,
  serviceFeeRate: number,
  taxRate: number,
): BookingQuote {
  const subtotal = roundDzd(base.subtotal);
  const cleaningFee = roundDzd(base.cleaningFee);
  const serviceFee = roundDzd(subtotal * serviceFeeRate);
  const taxes = roundDzd((subtotal + cleaningFee) * taxRate);
  const units = base.nights * base.quantity;
  return {
    ...base,
    subtotal,
    cleaningFee,
    serviceFeeRate,
    serviceFee,
    taxRate,
    taxes,
    averageUnitPrice: units > 0 ? roundDzd(subtotal / units) : base.unitPrice,
    total: subtotal + cleaningFee + serviceFee + taxes,
  };
}

/**
 * Quote for a listing booking. `startDate`/`endDate` are date keys. For
 * experiences only `startDate` matters. `unitCount` = rooms (hotels) or beds
 * (hostels; defaults to guestCount). Overrides are host per-date prices for
 * whole-listing pricing (homes, vehicles, experiences).
 */
export function quoteListingBooking(params: {
  listing: QuotableListing;
  startDate: DateKey;
  endDate: DateKey;
  guestCount: number;
  unitCount?: number;
  selectedRoomTypeId?: string | null;
  priceOverrides?: PriceOverrides;
}): BookingQuote {
  const { listing } = params;
  const overrides = params.priceOverrides || {};
  const guests = Math.max(1, Math.floor(params.guestCount || 1));
  const roomType = selectRoomType(listing, params.selectedRoomTypeId);
  const model = pricingModelFor(listing, roomType);
  const cleaningFee = Math.max(
    0,
    listing.cleaningFee ?? DEFAULT_CLEANING_FEES[listing.category] ?? 0,
  );
  const serviceFeeRate = serviceFeeRateFor(listing);
  const taxRate = Math.min(
    1,
    Math.max(0, listing.taxRate ?? PLATFORM_TAX_RATE),
  );

  if (model === "per_person") {
    const unitPrice = overrides[params.startDate] ?? listing.price;
    return finishQuote(
      {
        model,
        nights: 1,
        quantity: guests,
        unitPrice: listing.price,
        hasPriceOverrides: unitPrice !== listing.price,
        subtotal: unitPrice * guests,
        cleaningFee,
      },
      serviceFeeRate,
      taxRate,
    );
  }

  const nights = Math.max(0, nightsBetween(params.startDate, params.endDate));

  if (roomType) {
    const unitPrice = roomTypePrice(roomType);
    const quantity =
      model === "per_bed_night"
        ? Math.max(1, Math.floor(params.unitCount ?? guests))
        : Math.max(1, Math.floor(params.unitCount ?? 1));
    return finishQuote(
      {
        model,
        nights,
        quantity,
        unitPrice,
        hasPriceOverrides: false,
        subtotal: unitPrice * quantity * nights,
        cleaningFee,
      },
      serviceFeeRate,
      taxRate,
    );
  }

  let subtotal = 0;
  let hasPriceOverrides = false;
  for (const night of eachNightKey(params.startDate, params.endDate)) {
    const override = overrides[night];
    if (override !== undefined && override !== listing.price)
      hasPriceOverrides = true;
    subtotal += override ?? listing.price;
  }
  return finishQuote(
    {
      model,
      nights,
      quantity: 1,
      unitPrice: listing.price,
      hasPriceOverrides,
      subtotal,
      cleaningFee,
    },
    serviceFeeRate,
    taxRate,
  );
}

export function quoteTripBooking(params: {
  trip: Pick<Trip, "pricePerPerson">;
  guestCount: number;
}): BookingQuote {
  const quantity = Math.max(1, Math.floor(params.guestCount || 1));
  return finishQuote(
    {
      model: "per_traveller",
      nights: 1,
      quantity,
      unitPrice: params.trip.pricePerPerson,
      hasPriceOverrides: false,
      subtotal: params.trip.pricePerPerson * quantity,
      cleaningFee: 0,
    },
    SERVICE_FEE_RATES.trip,
    0,
  );
}

export function isRequestToBook(
  listing: Pick<Listing, "bookingApprovalMode" | "instantBook">,
): boolean {
  return (
    listing.bookingApprovalMode === "request" || listing.instantBook === false
  );
}
