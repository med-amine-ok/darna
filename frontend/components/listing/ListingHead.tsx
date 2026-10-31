"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { formatRating } from "@/lib/i18n/date-locale";
import { Listing, User } from "@/types";
import HeartButton from "@/components/HeartButton";
import { toast } from "react-toastify";
import PhotoLightbox, { type PhotoGroup } from "./PhotoLightbox";
import { GuestFavoriteIcon, BrandStarIcon, BrandShareIcon, BrandGridIcon } from "@/components/icons";

interface ListingHeadProps {
  listing: Listing;
  currentUser?: User | null;
  /** Small labels above the title (hotel type, stars, verified). */
  badges?: React.ReactNode;
  /** Extra photo-tour sections after "Overview" (hotel room types). */
  extraPhotoGroups?: PhotoGroup[];
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg";

/**
 * Listing header. Desktop: serif title + 5-photo bento (others dim on hover) + glass
 * "Show all photos". Phones: full-bleed swipe carousel with the title on a rounded
 * sheet that overlaps the photo (Airbnb mobile pattern, docs/ux-research/RESEARCH.md §3).
 */
const STOCK_PADDING = [
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
];

/**
 * The five bento photos: the listing's own photos, then its room-type photos (hotels,
 * hostels), and only then neutral stock padding so the grid never has a hole.
 */
export function headImages(listing: Listing): string[] {
  const own = (Array.isArray(listing.imageSrc) ? listing.imageSrc : [listing.imageSrc]).filter(Boolean);
  const rooms = (listing.roomTypes ?? []).flatMap((r) => r.imageSrc ?? []).filter(Boolean);
  return Array.from(new Set([...own, ...rooms, ...STOCK_PADDING])).slice(0, 5);
}

export default function ListingHead({ listing, currentUser, badges, extraPhotoGroups }: ListingHeadProps) {
  const t = useTranslations("listing");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const displayImages = headImages(listing);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [startInTour, setStartInTour] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const openLightbox = (index: number, tour = false) => {
    setStartInTour(tour);
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

  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setMobileIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  const total = displayImages.length;
  const photoGroups: PhotoGroup[] | undefined =
    extraPhotoGroups && extraPhotoGroups.length > 0
      ? [{ id: "overview", label: t("tour.overview"), images: displayImages }, ...extraPhotoGroups]
      : undefined;
  const tourImages = photoGroups ? photoGroups.flatMap((g) => g.images) : displayImages;
  const rating = formatRating(listing.rating, locale);
  const reviewCount = listing.reviewCount ?? 0;
  const place = listing.city ? t("cityCountry", { city: listing.city }) : listing.locationValue;

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-body text-primary-600">
      <span className="flex items-center gap-1 font-semibold text-primary-900 tabular-nums">
        {rating ? (
          <>
            <BrandStarIcon size={16} className="text-accent-600" />
            <span className="sr-only">{t("ratingLabel", { rating })}</span>
            <span aria-hidden="true">{rating}</span>
          </>
        ) : (
          <span className="text-secondary-700">{t("ratingNew")}</span>
        )}
      </span>
      {reviewCount > 0 && (
        <>
          <span aria-hidden="true" className="text-primary-300">·</span>
          <a href="#reviews" className={`font-medium text-primary-900 underline underline-offset-4 decoration-primary/30 hover:decoration-primary rounded ${focusRing}`}>
            {t("reviewsCount", { count: reviewCount })}
          </a>
        </>
      )}
      {listing.isGuestFavorite && (
        <>
          <span aria-hidden="true" className="text-primary-300">·</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white shadow-e1 px-2.5 py-0.5 text-meta font-semibold text-primary-900">
            <GuestFavoriteIcon size={14} className="text-accent-600" />
            {tNav("guestFavorite")}
          </span>
        </>
      )}
      <span aria-hidden="true" className="text-primary-300">·</span>
      <span>{place}</span>
    </div>
  );

  const actionClass = `inline-flex items-center gap-2 h-10 ps-3 pe-4 rounded-full bg-white shadow-e1 text-sm font-semibold text-primary-900 hover:shadow-e2 hover:-translate-y-px active:scale-[0.97] transition duration-fast ease-standard cursor-pointer ${focusRing}`;

  return (
    <div id="photos" className="scroll-mt-28">
      {/* ── Phones: full-bleed swipe carousel + overlapping sheet ── */}
      <div className="md:hidden -mx-4 sm:-mx-6 -mt-6 sm:-mt-8 relative">
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none aspect-[4/3.4]"
        >
          {displayImages.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openLightbox(idx)}
              aria-label={t("openPhoto", { number: idx + 1, total })}
              className="relative snap-center shrink-0 w-full h-full bg-tertiary-100"
            >
              <Image src={src} alt="" fill priority={idx === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        <div className="absolute top-3 end-3 flex items-center gap-2">
          <button type="button" onClick={handleShare} aria-label={t("share")} className={`w-9 h-9 rounded-full glass-light shadow-e2 flex items-center justify-center text-primary-900 ${focusRing}`}>
            <BrandShareIcon size={17} />
          </button>
          <HeartButton listingId={listing.id} currentUser={currentUser} variant="circle" />
        </div>
        <div aria-live="polite" className="absolute bottom-10 end-4 glass-light shadow-e1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary-900 tabular-nums">
          {t("photoCount", { current: mobileIndex + 1, total })}
        </div>
        {/* Dots */}
        <div aria-hidden="true" className="absolute bottom-10 inset-x-0 flex justify-center gap-1.5">
          {displayImages.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full bg-white transition-all duration-base ease-out ${idx === mobileIndex ? "w-4 opacity-100" : "w-1.5 opacity-60"}`} />
          ))}
        </div>
      </div>

      <div
        className="enter-lift md:hidden relative -mt-7 -mx-4 sm:-mx-6 rounded-t-[1.75rem] bg-darnaBg px-5 pt-7 pb-2 text-center"
      >
        {badges && <div className="mb-3 flex flex-wrap justify-center gap-2">{badges}</div>}
        <h1 className="font-serif text-display-md text-primary-900">{listing.title}</h1>
        <div className="mt-3 flex justify-center">{meta}</div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden md:block space-y-6">
        <div className="enter-lift flex items-end justify-between gap-6">
          <div className="min-w-0 space-y-3">
            {badges && <div className="flex flex-wrap gap-2">{badges}</div>}
            <h1 className="font-serif text-display-lg text-primary-900 max-w-[22ch]">{listing.title}</h1>
            {meta}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button type="button" onClick={handleShare} className={actionClass}>
              <BrandShareIcon size={17} />
              <span>{t("share")}</span>
            </button>
            <span className={`${actionClass} ps-1`}>
              <HeartButton listingId={listing.id} currentUser={currentUser} />
              <span aria-hidden="true">{t("save")}</span>
            </span>
          </div>
        </div>

        <div
          style={{ animationDelay: "80ms" }}
          className="enter-lift group/gallery grid grid-cols-4 grid-rows-2 gap-2 h-[440px] lg:h-[520px] rounded-3xl overflow-hidden relative shadow-e2"
        >
          {displayImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openLightbox(idx)}
              aria-label={t("openPhoto", { number: idx + 1, total })}
              className={`relative overflow-hidden bg-tertiary-100 cursor-zoom-in transition-[filter] duration-base ease-standard group-hover/gallery:brightness-[0.82] hover:!brightness-100 focus-visible:!brightness-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white ${
                idx === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <Image
                src={imgUrl}
                alt=""
                fill
                priority={idx === 0}
                className="object-cover transition-transform [transition-duration:900ms] ease-out hover:scale-[1.04]"
                sizes={idx === 0 ? "(max-width: 1024px) 50vw, 680px" : "(max-width: 1024px) 25vw, 340px"}
              />
            </button>
          ))}

          <button
            type="button"
            onClick={() => openLightbox(0, true)}
            className={`absolute bottom-5 end-5 z-10 glass-light shadow-e3 text-primary-900 font-semibold text-sm h-10 px-4 rounded-full flex items-center gap-2 hover:-translate-y-px active:scale-[0.97] transition duration-fast ease-standard cursor-pointer ${focusRing}`}
          >
            <BrandGridIcon size={16} />
            <span>{t("showAllPhotos")}</span>
          </button>
        </div>
      </div>

      <PhotoLightbox
        isOpen={isLightboxOpen}
        startInTour={startInTour}
        onClose={closeLightbox}
        images={tourImages}
        groups={photoGroups}
        index={activePhotoIndex}
        onIndexChange={setActivePhotoIndex}
        title={listing.title}
      />
    </div>
  );
}
