"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { Listing, User } from "@/types";
import HeartButton from "@/components/HeartButton";
import { useTranslations } from "next-intl";
import PriceDisplay from "@/components/common/PriceDisplay";
import {
  BrandStarIcon,
  BrandPinIcon,
  CategoryVehicleIcon,
} from "@/components/icons";

interface ListingCarouselCardProps {
  listing: Listing;
  currentUser?: User | null;
  customHref?: string;
  onClick?: () => void;
}

export default function ListingCarouselCard({
  listing,
  currentUser,
  customHref,
  onClick,
}: ListingCarouselCardProps) {
  const router = useRouter();
  const tNav = useTranslations("nav");
  const rating = listing.rating ? listing.rating.toFixed(2).replace(/\.00$/, ".0") : "4.95";

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (customHref) {
      router.push(customHref);
      return;
    }
    const destParam = listing.city ? `&destination=${encodeURIComponent(listing.city)}` : "";
    const vertParam = listing.category ? `&vertical=${listing.category}` : "";
    router.push(`/search?selectedId=${listing.id}${destParam}${vertParam}`);
  };

  const hasRoomTypes = Boolean(listing.roomTypes && listing.roomTypes.length > 0);
  const isHostel = listing.businessCategory === "hostel" || listing.roomTypes?.some((r) => r.bookingUnit === "bed");

  const periodLabel = hasRoomTypes
    ? isHostel
      ? "from / bed"
      : "from / night"
    : listing.category === "vehicle"
    ? "/ day"
    : listing.category === "experience"
    ? "/ person"
    : "/ night";

  const displayImage = Array.isArray(listing.imageSrc)
    ? listing.imageSrc[0]
    : listing.imageSrc;

  return (
    <div
      onClick={handleClick}
      className="flex-shrink-0 w-52 sm:w-60 cursor-pointer group select-none transition-transform card-hover-lift"
    >
      {/* Image Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 border border-tertiary/40 mb-2">
        <Image
          src={displayImage || "/assets/template.jpeg"}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 208px, 240px"
        />

        {/* Guest favorite Badge */}
        {listing.isGuestFavorite && (
          <div className="absolute top-2.5 start-2.5 z-10 bg-white/95 backdrop-blur-xs text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {tNav("guestFavorite") || "Guest favorite"}
          </div>
        )}

        {/* Heart Favorite Button */}
        <div className="absolute top-2.5 end-2.5 z-10">
          <HeartButton listingId={listing.id} currentUser={currentUser} />
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="font-semibold text-xs sm:text-sm text-primary truncate flex items-center gap-1">
            <BrandPinIcon
              size={13}
              strokeWidth={1.8}
              className="shrink-0 text-accent"
            />
            <span className="truncate">{listing.city ? `${listing.city}, Algeria` : listing.title}</span>
          </h3>
          <span className="flex items-center gap-0.5 text-xs font-semibold text-neutral-800 flex-shrink-0">
            <BrandStarIcon size={13} className="text-accent" />
            <span>{rating}</span>
          </span>
        </div>

        <p className="text-[11px] text-neutral-500 font-normal truncate flex items-center gap-1">
          {hasRoomTypes ? (
            <>
              <span className="font-semibold text-secondary">
                {isHostel ? "Hostel" : "Hotel"}
              </span>
              <span>·</span>
              <span>{listing.roomTypes?.length} room types</span>
            </>
          ) : listing.category === "vehicle" ? (
            <>
              <CategoryVehicleIcon
                size={13}
                strokeWidth={1.8}
                className="shrink-0 text-accent"
              />
              <span className="truncate">{listing.title}</span>
            </>
          ) : (
            <span className="truncate">{listing.title}</span>
          )}
        </p>

        <div className="pt-0.5">
          <PriceDisplay
            price={listing.price}
            originalPrice={listing.originalPrice}
            period={periodLabel}
            priceClassName="font-bold text-xs sm:text-sm text-primary"
          />
        </div>
      </div>
    </div>
  );
}
