"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/navigation";
import { Listing, User } from "@/types";
import HeartButton from "@/components/HeartButton";
import { useLocale, useTranslations } from "next-intl";
import { formatRating } from "@/lib/i18n/date-locale";
import PriceDisplay from "@/components/common/PriceDisplay";
import { listingHref, priceSuffixKey } from "@/components/listing/cardLabels";
import { BrandStarIcon, BrandPinIcon, CategoryVehicleIcon } from "@/components/icons";

interface ListingCarouselCardProps {
  listing: Listing;
  currentUser?: User | null;
  customHref?: string;
  /** Called instead of navigating when the card is activated. */
  onClick?: () => void;
}

export default function ListingCarouselCard({
  listing,
  currentUser,
  customHref,
  onClick,
}: ListingCarouselCardProps) {
  const tNav = useTranslations("nav");
  const t = useTranslations("listing");
  const locale = useLocale();
  const rating = formatRating(listing.rating, locale);

  const href = customHref ?? listingHref(listing, { onSearchPage: false });

  const hasRoomTypes = Boolean(listing.roomTypes && listing.roomTypes.length > 0);
  const isHostel = listing.businessCategory === "hostel" || listing.roomTypes?.some((r) => r.bookingUnit === "bed");

  const displayImage = Array.isArray(listing.imageSrc) ? listing.imageSrc[0] : listing.imageSrc;

  return (
    <div className="relative flex-shrink-0 w-52 sm:w-60 group select-none transition-transform card-hover-lift">
      {/* Image Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 border border-tertiary/40 mb-2">
        <Image
          src={displayImage || "/assets/template.jpeg"}
          alt=""
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 208px, 240px"
        />

        {/* Guest favorite Badge */}
        {listing.isGuestFavorite && (
          <div className="absolute top-2.5 start-2.5 z-[2] bg-white/95 backdrop-blur-xs text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {tNav("guestFavorite")}
          </div>
        )}

        {/* Heart Favorite Button (above the card link overlay) */}
        <div className="absolute top-2.5 end-2.5 z-10">
          <HeartButton listingId={listing.id} currentUser={currentUser} />
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="font-semibold text-xs sm:text-sm text-primary truncate flex items-center gap-1 min-w-0">
            <BrandPinIcon size={13} strokeWidth={1.8} className="shrink-0 text-accent" />
            {/* Stretched link: its ::after covers the whole card. */}
            <Link
              href={href}
              draggable={false}
              onClick={
                onClick
                  ? (e) => {
                      e.preventDefault();
                      onClick();
                    }
                  : undefined
              }
              className="truncate rounded after:absolute after:inset-0 after:z-[1] after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-600 focus-visible:after:ring-offset-2"
            >
              <span className="sr-only">{listing.title} – </span>
              {listing.city ? t("cityCountry", { city: listing.city }) : listing.title}
            </Link>
          </h3>
          <span className="flex items-center gap-0.5 text-xs font-semibold text-neutral-800 flex-shrink-0">
            {rating ? (
              <>
                <BrandStarIcon size={13} className="text-accent" />
                <span className="sr-only">{t("ratingLabel", { rating })}</span>
                <span aria-hidden="true">{rating}</span>
              </>
            ) : (
              t("ratingNew")
            )}
          </span>
        </div>

        <p className="text-[11px] text-neutral-600 font-normal truncate flex items-center gap-1">
          {hasRoomTypes ? (
            <>
              <span className="font-semibold text-secondary-700">{isHostel ? t("hostel") : t("hotel")}</span>
              <span aria-hidden="true">·</span>
              <span>{t("roomTypesCount", { count: listing.roomTypes?.length ?? 0 })}</span>
            </>
          ) : listing.category === "vehicle" ? (
            <>
              <CategoryVehicleIcon size={13} strokeWidth={1.8} className="shrink-0 text-accent" />
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
            period={t(priceSuffixKey(listing))}
            priceClassName="font-bold text-xs sm:text-sm text-primary"
          />
        </div>
      </div>
    </div>
  );
}
