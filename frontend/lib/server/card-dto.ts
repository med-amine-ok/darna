import "server-only";
import type { Listing, RoomType, Trip } from "@/types";

/**
 * Slim projections for card rails. Server components pass props to client components
 * through the RSC payload, which is embedded in the HTML; sending whole listings
 * (descriptions, amenities, coordinates, room details, policies) for every card made
 * the home page ~500 KB. Cards only read the fields below
 * (components/home/ListingCarouselCard.tsx, components/listing/cardLabels.ts,
 * components/trips/TripCard.tsx), so keep exactly those.
 */
export function toCardListing(l: Listing): Listing {
  const images = Array.isArray(l.imageSrc) ? l.imageSrc : [l.imageSrc];
  return {
    id: l.id,
    title: l.title,
    city: l.city,
    category: l.category,
    businessCategory: l.businessCategory,
    imageSrc: images.slice(0, 1),
    price: l.price,
    originalPrice: l.originalPrice,
    rating: l.rating,
    reviewCount: l.reviewCount,
    isGuestFavorite: l.isGuestFavorite,
    roomTypes: l.roomTypes?.map((r) => ({ id: r.id, bookingUnit: r.bookingUnit }) as RoomType),
  } as Listing;
}

export function toCardTrip(t: Trip): Trip {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    city: t.city,
    coverPhoto: t.coverPhoto,
    durationDays: t.durationDays,
    maxGroupSize: t.maxGroupSize,
    pricePerPerson: t.pricePerPerson,
    rating: t.rating,
    organization: t.organization ? ({ name: t.organization.name } as Trip["organization"]) : t.organization,
  } as Trip;
}
