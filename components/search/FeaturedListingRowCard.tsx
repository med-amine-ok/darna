"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { safeListing, SafeUser } from "@/types";
import HeartButton from "../HeartButton";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useTranslations } from "next-intl";
import PriceDisplay from "../common/PriceDisplay";

interface Props {
  listing: safeListing;
  currentUser?: SafeUser | null;
  onClick?: () => void;
}

export default function FeaturedListingRowCard({
  listing,
  currentUser,
  onClick,
}: Props) {
  const router = useRouter();
  const t = useTranslations("nav");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : [listing.imageSrc];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const twoNightsPrice = listing.price * 2;
  const rating = listing.rating
    ? listing.rating.toFixed(2).replace(/\.00$/, ".0")
    : "4.91";
  const reviewCount = listing.reviewCount || 608;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/listings/${listing.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="w-full bg-white rounded-3xl border border-neutral-200/90 shadow-xs hover:shadow-lg transition-all duration-200 p-3.5 sm:p-4 flex flex-col md:flex-row gap-5 cursor-pointer group select-none"
    >
      {/* Left: Image Container with carousel controls */}
      <div className="relative w-full md:w-[320px] lg:w-[360px] aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0">
        <Image
          src={images[currentImageIndex] || listing.imageSrc}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-102 transition duration-300"
          sizes="(max-width: 768px) 100vw, 360px"
          priority
        />

        {/* Guest favorite Badge */}
        {(listing.isGuestFavorite || listing.featured) && (
          <div className="absolute top-3 start-3 z-10 bg-white/95 backdrop-blur-xs text-neutral-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5">
            <span className="text-amber-500 text-xs">🏆</span>
            <span>{t("guestFavorite") || "Guest favorite"}</span>
          </div>
        )}

        {/* Heart Favorite Button */}
        <div
          className="absolute top-3 end-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <HeartButton listingId={listing.id} currentUser={currentUser} />
        </div>

        {/* Image Carousel Arrows (visible on hover) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={handlePrev}
              className="absolute start-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
            >
              <MdChevronLeft size={20} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={handleNext}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
            >
              <MdChevronRight size={20} className="rtl:rotate-180" />
            </button>
          </>
        )}

        {/* Dots indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10">
            {images.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right: Listing Details */}
      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 leading-tight group-hover:text-black">
            {listing.title}
          </h2>
          <p className="text-sm font-medium text-neutral-600 mt-1 flex items-center gap-1.5">
            <Image
              src="/assets/location.png"
              alt=""
              width={13}
              height={18}
              className="object-contain inline-block flex-shrink-0"
            />
            <span>{listing.subtitle || `${listing.category} in ${listing.city || "Paris"}`}</span>
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            {listing.roomCount || 1} bedroom · {listing.roomCount || 1} bed ·{" "}
            {listing.bathroomCount || 1}{" "}
            {listing.bathroomCount === 1 ? "bath" : "baths"}
          </p>
          <p className="text-sm text-neutral-500 mt-0.5">Nov 27 – 29</p>
        </div>

        {/* Price & Rating Row (Matching Screenshot 1) */}
        <div className="pt-4 mt-2 sm:mt-0 flex items-baseline justify-between border-t sm:border-t-0 border-neutral-100">
          <div className="text-sm sm:text-base text-neutral-900 font-medium">
            <PriceDisplay
              price={twoNightsPrice}
              period="for 2 nights"
              priceClassName="font-bold underline text-neutral-900 text-base sm:text-lg"
            />
          </div>
          <div className="text-sm font-semibold text-neutral-900 flex items-center gap-1">
            <span>★</span>
            <span>{rating}</span>
            <span className="text-neutral-500 font-normal">
              ({reviewCount})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
