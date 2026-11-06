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
import { BrandStarIcon } from "@/components/icons";

interface ListingCarouselCardProps {
  listing: Listing;
  currentUser?: User | null;
  customHref?: string;
  /** Called instead of navigating when the card is activated. */
  onClick?: () => void;
}

/**
 * Editorial listing card (home rails): 20:19 photo with 20px radius, glass badge,
 * slow photo zoom + lift on hover, stretched link for keyboard/screen readers.
 */
export default function ListingCarouselCard({ listing, currentUser, customHref, onClick }: ListingCarouselCardProps) {
  const tNav = useTranslations("nav");
  const t = useTranslations("listing");
  const locale = useLocale();
  const rating = formatRating(listing.rating, locale);

  const href = customHref ?? listingHref(listing, { onSearchPage: false });
  const hasRoomTypes = Boolean(listing.roomTypes && listing.roomTypes.length > 0);
  const isHostel = listing.businessCategory === "hostel" || listing.roomTypes?.some((r) => r.bookingUnit === "bed");
  const displayImage = Array.isArray(listing.imageSrc) ? listing.imageSrc[0] : listing.imageSrc;

  const kicker = hasRoomTypes
    ? `${isHostel ? t("hostel") : t("hotel")} · ${t("roomTypesCount", { count: listing.roomTypes?.length ?? 0 })}`
    : listing.city
      ? t("cityCountry", { city: listing.city })
      : null;

  return (
    <article className="group relative select-none">
      <div className="relative z-[2] pointer-events-none aspect-[20/19] w-full rounded-2xl overflow-hidden bg-tertiary-100 shadow-e1 transition-[box-shadow,transform] duration-base ease-out group-hover:shadow-e3 group-hover:-translate-y-1">
        <Image
          src={displayImage || "/assets/template.jpeg"}
          alt=""
          fill
          sizes="(max-width: 640px) 72vw, 280px"
          className={`object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.045]`}
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary-900/25 to-transparent" />

        {listing.isGuestFavorite && (
          <div className="absolute top-3 start-3 z-[2] glass-chip text-primary-900 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-e1">
            {tNav("guestFavorite")}
          </div>
        )}

        <div className="pointer-events-auto absolute top-1.5 end-1.5 z-10">
          <HeartButton listingId={listing.id} currentUser={currentUser} />
        </div>
      </div>

      <div className="pt-3.5 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[0.9375rem] font-semibold text-primary-900 leading-snug line-clamp-1 min-w-0">
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
              className="rounded after:absolute after:inset-0 after:z-[1] after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-600 focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-darnaBg"
            >
              {listing.title}
            </Link>
          </h3>
          <span className="flex items-center gap-1 text-meta font-semibold text-primary-800 shrink-0 tabular-nums pt-0.5">
            {rating ? (
              <>
                <BrandStarIcon size={13} className="text-accent-600" />
                <span className="sr-only">{t("ratingLabel", { rating })}</span>
                <span aria-hidden="true">{rating}</span>
              </>
            ) : (
              <span className="text-secondary-700">{t("ratingNew")}</span>
            )}
          </span>
        </div>

        {kicker && <p className="text-meta text-primary-500 truncate">{kicker}</p>}

        <PriceDisplay
          price={listing.price}
          originalPrice={listing.originalPrice}
          period={t(priceSuffixKey(listing))}
          className="pt-1"
          priceClassName="font-semibold text-[0.9375rem] text-primary-900 tabular-nums"
          eurClassName="text-meta text-primary-500 tabular-nums"
        />
      </div>
    </article>
  );
}
