"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { safeListing, SafeUser } from "@/types";
import HeartButton from "../HeartButton";
import { useTranslations } from "next-intl";

interface Props {
  listing: safeListing;
  currentUser?: SafeUser | null;
}

export default function ListingCarouselCard({ listing, currentUser }: Props) {
  const router = useRouter();
  const t = useTranslations("nav");
  const twoNightsPrice = listing.price * 2;
  const rating = listing.rating ? listing.rating.toFixed(2).replace(/\.00$/, ".0") : "4.95";

  return (
    <div
      onClick={() =>
        router.push(
          `/search?destination=${encodeURIComponent(
            listing.city || "Paris"
          )}&selectedId=${listing.id}`
        )
      }
      className="flex-shrink-0 w-64 sm:w-72 cursor-pointer group select-none"
    >
      {/* Image Container with Guest Favorite badge and Heart */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-100 shadow-2xs mb-2.5">
        <Image
          src={listing.imageSrc}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition duration-300"
          sizes="(max-width: 640px) 256px, 288px"
        />

        {/* Guest favorite Badge */}
        {listing.isGuestFavorite && (
          <div className="absolute top-3 start-3 z-10 bg-white/95 backdrop-blur-xs text-neutral-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs">
            {t("guestFavorite")}
          </div>
        )}

        {/* Heart Favorite Button */}
        <div className="absolute top-3 end-3 z-10">
          <HeartButton listingId={listing.id} currentUser={currentUser} />
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-0.5">
        <h3 className="font-semibold text-sm sm:text-base text-neutral-900 truncate">
          {listing.title}
        </h3>
        <p className="text-xs sm:text-sm text-neutral-600 font-medium">
          <span className="font-bold text-neutral-900">${twoNightsPrice}</span> for 2 nights ·{" "}
          <span className="text-neutral-800">★ {rating}</span>
        </p>
      </div>
    </div>
  );
}
