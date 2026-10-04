"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { MdFavorite, MdStar, MdLocationOn, MdArrowForward } from "react-icons/md";
import { safeListing, SafeUser } from "@/types";
import HeartButton from "@/components/HeartButton";
import PriceDisplay from "@/components/common/PriceDisplay";

interface ProfileFavoritesTabProps {
  favorites: safeListing[];
  currentUser?: SafeUser | null;
}

export default function ProfileFavoritesTab({
  favorites,
  currentUser,
}: ProfileFavoritesTabProps) {
  const t = useTranslations("profile.favoritesSection");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-primary tracking-tight">
            {t("title")} ({favorites.length})
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-surface p-12 rounded-3xl border border-tertiary/40 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-accent/10 text-accent mx-auto flex items-center justify-center">
            <MdFavorite size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">{t("noFavorites")}</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              {t("explorePrompt")}
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-600 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            <span>{t("browse")}</span>
            <MdArrowForward size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((listing) => (
            <div
              key={listing.id}
              className="group bg-surface rounded-3xl border border-tertiary/40 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-4/3 w-full bg-neutral-100 overflow-hidden">
                  <Image
                    src={listing.imageSrc}
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 end-3 z-10">
                    <HeartButton listingId={listing.id} currentUser={currentUser} />
                  </div>
                  {listing.isGuestFavorite && (
                    <div className="absolute top-3 start-3 px-2.5 py-1 bg-surface/90 text-primary text-[10px] font-extrabold rounded-full backdrop-blur-xs shadow-xs">
                      Guest Favorite
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-500 flex items-center gap-1">
                      <MdLocationOn className="text-accent" size={14} />
                      <span className="truncate max-w-[130px]">
                        {listing.city || listing.locationValue}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 font-bold text-neutral-800">
                      <MdStar className="text-amber-500" size={14} />
                      <span>{listing.rating || "4.9"}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-neutral-900 text-sm truncate group-hover:text-accent transition">
                    {listing.title}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-1">
                    {listing.category} · {listing.guestCount} guests
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <div>
                  <PriceDisplay
                    price={listing.price}
                    currency="DZD"
                    className="text-sm font-extrabold text-primary"
                  />
                  <span className="text-[10px] text-neutral-400"> / night</span>
                </div>
                <Link
                  href={`/listings/${listing.id}`}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition"
                >
                  View Stay
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
