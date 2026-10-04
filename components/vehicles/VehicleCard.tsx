"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { safeListing, SafeUser } from "@/types";
import HeartButton from "../HeartButton";
import PriceDisplay from "../common/PriceDisplay";
import { MdChevronLeft, MdChevronRight, MdLocationOn } from "react-icons/md";
import { useTranslations } from "next-intl";

type Props = {
  vehicle: safeListing;
  currentUser?: SafeUser | null;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
};

export default function VehicleCard({
  vehicle,
  currentUser,
  onHover,
  isHovered = false,
  isSelected = false,
  onClick,
}: Props) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = vehicle.images && vehicle.images.length > 0
    ? vehicle.images
    : [vehicle.imageSrc];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/listings/${vehicle.id}`);
    }
  };

  // Derive specs from subtitle or data
  const is4x4 =
    vehicle.title.toLowerCase().includes("4x4") ||
    vehicle.title.toLowerCase().includes("4wd") ||
    vehicle.title.toLowerCase().includes("awd") ||
    (vehicle.amenities && vehicle.amenities.some((a) => a.toLowerCase().includes("4x4")));

  const isAutomatic =
    !vehicle.subtitle?.toLowerCase().includes("manual");

  const rating = vehicle.rating ? vehicle.rating.toFixed(2) : "4.95";

  return (
    <div
      onMouseEnter={() => onHover?.(vehicle.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={handleClick}
      className={`group flex flex-col bg-surface rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer select-none ${
        isHovered || isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.01]"
          : "border-tertiary/70 hover:border-primary/50 hover:shadow-md"
      }`}
    >
      {/* 1. Image Container */}
      <div className="relative aspect-[16/10] w-full bg-neutral-100 overflow-hidden">
        <Image
          src={images[currentImageIndex] || vehicle.imageSrc}
          alt={vehicle.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Top-Right Heart Button */}
        <div className="absolute top-2.5 end-2.5 z-10">
          <HeartButton listingId={vehicle.id} currentUser={currentUser} />
        </div>

        {/* Top-Left: Vehicle Badge with /assets/car.png */}
        <div className="absolute top-2.5 start-2.5 z-10 bg-surface/95 backdrop-blur-md text-primary text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-tertiary/60">
          <Image
            src="/assets/car.png"
            alt="Car"
            width={20}
            height={20}
            className="w-5 h-5 object-contain inline-block"
          />
          <span>{vehicle.city || "Algeria"}</span>
        </div>

        {/* Guest Favorite Badge */}
        {vehicle.isGuestFavorite && (
          <div className="absolute bottom-2.5 start-2.5 z-10 bg-primary/95 text-surface text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
            Guest Favorite
          </div>
        )}

        {/* Carousel Hover Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={handlePrevImage}
              className="hidden group-hover:flex items-center justify-center p-1.5 rounded-full bg-surface/90 hover:bg-surface text-primary shadow-md transition absolute top-1/2 -translate-y-1/2 start-2 hover:scale-105 active:scale-95 cursor-pointer z-10"
            >
              <MdChevronLeft size={16} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={handleNextImage}
              className="hidden group-hover:flex items-center justify-center p-1.5 rounded-full bg-surface/90 hover:bg-surface text-primary shadow-md transition absolute top-1/2 -translate-y-1/2 end-2 hover:scale-105 active:scale-95 cursor-pointer z-10"
            >
              <MdChevronRight size={16} className="rtl:rotate-180" />
            </button>
          </>
        )}

        {/* Carousel Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-1 z-10 pointer-events-none">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`rounded-full transition-all duration-200 ${
                  idx === currentImageIndex
                    ? "bg-white w-2 h-2 shadow-xs"
                    : "bg-white/60 w-1.5 h-1.5"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. Card Content */}
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 gap-2">
        <div>
          {/* Title & Rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm sm:text-base text-primary leading-tight truncate">
              {vehicle.title}
            </h3>
            <span className="flex items-center gap-1 font-bold text-xs text-primary flex-shrink-0">
              <span className="text-amber-500">★</span>
              <span>{rating}</span>
              {vehicle.reviewCount ? (
                <span className="font-normal text-primary/60">({vehicle.reviewCount})</span>
              ) : null}
            </span>
          </div>

          {/* Location Badge */}
          <div className="flex items-center gap-1 text-xs text-primary/70 font-medium mt-1">
            <MdLocationOn size={14} className="text-accent flex-shrink-0" />
            <span className="truncate">{vehicle.city}, Algeria</span>
          </div>

          {/* Vehicle Specs Badges */}
          <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
            <span className="px-2 py-0.5 rounded-md bg-tertiary/20 text-primary text-[11px] font-semibold">
              💺 {vehicle.guestCount} Seats
            </span>
            <span className="px-2 py-0.5 rounded-md bg-tertiary/20 text-primary text-[11px] font-semibold">
              ⚙️ {isAutomatic ? "Automatic" : "Manual"}
            </span>
            {is4x4 && (
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-bold">
                🧭 4WD / 4x4
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-tertiary/20 text-primary text-[11px] font-semibold">
              🛡️ Full Insurance
            </span>
          </div>

          {/* Highlights */}
          {vehicle.highlights && vehicle.highlights[0] && (
            <p className="text-xs text-primary/75 mt-2 line-clamp-1 italic">
              ✦ {vehicle.highlights[0].title}
            </p>
          )}
        </div>

        {/* Footer: Price + Button */}
        <div className="pt-2.5 mt-1 border-t border-tertiary/40 flex items-center justify-between">
          <PriceDisplay
            price={vehicle.price}
            originalPrice={vehicle.originalPrice}
            period={`/ ${tCommon("day") || "day"}`}
            priceClassName="text-base sm:text-lg font-black text-primary"
          />

          <span className="text-xs font-bold text-accent group-hover:underline flex items-center gap-0.5">
            Details &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}
