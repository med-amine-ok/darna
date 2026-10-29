"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { formatRating } from "@/lib/i18n/date-locale";
import { Listing, User } from "@/types";
import HeartButton from "@/components/HeartButton";
import { toast } from "react-toastify";
import PhotoLightbox from "./PhotoLightbox";
import {
  GuestFavoriteIcon,
  BrandStarIcon,
  BrandShareIcon,
  BrandGridIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
} from "@/components/icons";

interface ListingHeadProps {
  listing: Listing;
  currentUser?: User | null;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function ListingHead({ listing, currentUser }: ListingHeadProps) {
  const t = useTranslations("listing");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const images = Array.isArray(listing.imageSrc) ? listing.imageSrc : [listing.imageSrc];
  // Pad with images if fewer than 5 for rich bento layout
  const displayImages = [
    ...images,
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
  ].slice(0, 5);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);

  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setIsLightboxOpen(true);
  };
  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("linkCopied"));
    } catch {
      toast.info(t("linkReady"));
    }
  };

  const total = displayImages.length;
  const rating = formatRating(listing.rating, locale);
  const reviewCount = listing.reviewCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary tracking-tight">
            {listing.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-neutral-600">
            <span className="flex items-center gap-1 font-bold text-primary">
              {rating ? (
                <>
                  <BrandStarIcon size={16} className="text-accent fill-accent" />
                  <span className="sr-only">{t("ratingLabel", { rating })}</span>
                  <span aria-hidden="true">{rating}</span>
                </>
              ) : (
                t("ratingNew")
              )}
            </span>
            {reviewCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href="#reviews"
                  className={`underline font-semibold text-primary hover:text-accent-700 transition rounded ${focusRing}`}
                >
                  {t("reviewsCount", { count: reviewCount })}
                </a>
              </>
            )}
            {listing.isGuestFavorite && (
              <>
                <span aria-hidden="true">·</span>
                <span className="bg-primary/5 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-tertiary inline-flex items-center gap-1.5">
                  <GuestFavoriteIcon size={14} className="text-primary" />
                  <span>{tNav("guestFavorite")}</span>
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-neutral-700">
              {listing.city ? t("cityCountry", { city: listing.city }) : listing.locationValue}
            </span>
          </div>
        </div>

        {/* Share & Save Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition cursor-pointer ${focusRing}`}
          >
            <BrandShareIcon size={18} />
            <span>{t("share")}</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition">
            <HeartButton listingId={listing.id} currentUser={currentUser} />
            <span aria-hidden="true">{t("save")}</span>
          </div>
        </div>
      </div>

      {/* Desktop Bento Gallery (1 large on start, 2x2 grid on end) */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2.5 h-[420px] lg:h-[480px] rounded-3xl overflow-hidden relative group">
        {displayImages.map((imgUrl, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => openLightbox(idx)}
            aria-label={t("openPhoto", { number: idx + 1, total })}
            className={`relative cursor-pointer overflow-hidden bg-neutral-200 ${focusRing} ${
              idx === 0 ? "col-span-2 row-span-2" : ""
            }`}
          >
            <Image
              src={imgUrl}
              alt=""
              fill
              priority={idx === 0}
              className="object-cover hover:scale-105 transition-transform duration-300"
              sizes={idx === 0 ? "(max-width: 1024px) 50vw, 640px" : "(max-width: 1024px) 25vw, 320px"}
            />
          </button>
        ))}

        {/* "Show all photos" floating badge */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className={`absolute bottom-4 end-4 z-10 bg-white/95 backdrop-blur-md text-primary font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg border border-tertiary/70 flex items-center gap-2 hover:scale-105 transition cursor-pointer ${focusRing}`}
        >
          <BrandGridIcon size={16} />
          <span>{t("showAllPhotos")}</span>
        </button>
      </div>

      {/* Mobile Gallery with counter */}
      <div className="md:hidden relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-neutral-200">
        <button
          type="button"
          onClick={() => openLightbox(mobilePhotoIndex)}
          aria-label={t("openPhoto", { number: mobilePhotoIndex + 1, total })}
          className={`absolute inset-0 ${focusRing}`}
        >
          <Image
            src={displayImages[mobilePhotoIndex]}
            alt=""
            fill
            priority={mobilePhotoIndex === 0}
            sizes="100vw"
            className="object-cover"
          />
        </button>
        {/* Prev / Next mobile arrows */}
        <button
          type="button"
          aria-label={t("previousPhoto")}
          onClick={() => setMobilePhotoIndex((prev) => (prev - 1 + total) % total)}
          className={`absolute start-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-primary shadow-md cursor-pointer ${focusRing}`}
        >
          <BrandChevronLeftIcon size={20} strokeWidth={2.2} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          aria-label={t("nextPhoto")}
          onClick={() => setMobilePhotoIndex((prev) => (prev + 1) % total)}
          className={`absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-primary shadow-md cursor-pointer ${focusRing}`}
        >
          <BrandChevronRightIcon size={20} strokeWidth={2.2} className="rtl:rotate-180" />
        </button>
        {/* Photo counter */}
        <div
          aria-live="polite"
          className="absolute bottom-3 end-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-semibold"
        >
          {t("photoCount", { current: mobilePhotoIndex + 1, total })}
        </div>
      </div>

      <PhotoLightbox
        isOpen={isLightboxOpen}
        onClose={closeLightbox}
        images={displayImages}
        index={activePhotoIndex}
        onIndexChange={setActivePhotoIndex}
        title={listing.title}
      />
    </div>
  );
}
