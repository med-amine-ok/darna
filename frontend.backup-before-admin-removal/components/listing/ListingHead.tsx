"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Listing, User } from "@/types";
import HeartButton from "@/components/HeartButton";
import { toast } from "react-toastify";
import {
  GuestFavoriteIcon,
  BrandStarIcon,
  BrandShareIcon,
  BrandGridIcon,
  BrandCloseIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
} from "@/components/icons";

interface ListingHeadProps {
  listing: Listing;
  currentUser?: User | null;
}

export default function ListingHead({ listing, currentUser }: ListingHeadProps) {
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

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Listing link copied to clipboard!");
    } else {
      toast.info("Link ready to share!");
    }
  };

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
              <BrandStarIcon size={16} className="text-accent fill-accent" />
              <span>{listing.rating?.toFixed(2) || "4.95"}</span>
            </span>
            <span>·</span>
            <a
              href="#reviews"
              className="underline font-semibold text-primary hover:text-accent transition"
            >
              {listing.reviewCount || 34} reviews
            </a>
            {listing.isGuestFavorite && (
              <>
                <span>·</span>
                <span className="bg-primary/5 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-tertiary inline-flex items-center gap-1.5">
                  <GuestFavoriteIcon size={14} className="text-primary" />
                  <span>Guest favorite</span>
                </span>
              </>
            )}
            <span>·</span>
            <span className="font-semibold text-neutral-700">
              {listing.city ? `${listing.city}, Algeria` : listing.locationValue}
            </span>
          </div>
        </div>

        {/* Share & Save Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition cursor-pointer"
          >
            <BrandShareIcon size={18} />
            <span>Share</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-100 transition">
            <HeartButton listingId={listing.id} currentUser={currentUser} />
            <span>Save</span>
          </div>
        </div>
      </div>

      {/* Desktop Bento Gallery (1 large on start, 2x2 grid on end) */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2.5 h-[420px] lg:h-[480px] rounded-3xl overflow-hidden relative group">
        {/* Large Hero Image (col-span-2 row-span-2) */}
        <div
          onClick={() => {
            setActivePhotoIndex(0);
            setIsLightboxOpen(true);
          }}
          className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden bg-neutral-200"
        >
          <Image
            src={displayImages[0]}
            alt={listing.title}
            fill
            priority
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 1024px) 50vw, 60vw"
          />
        </div>

        {/* 4 smaller images in 2x2 grid */}
        {displayImages.slice(1, 5).map((imgUrl, idx) => (
          <div
            key={idx}
            onClick={() => {
              setActivePhotoIndex(idx + 1);
              setIsLightboxOpen(true);
            }}
            className="relative cursor-pointer overflow-hidden bg-neutral-200"
          >
            <Image
              src={imgUrl}
              alt={`${listing.title} view ${idx + 2}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              sizes="25vw"
            />
          </div>
        ))}

        {/* "Show all photos" floating badge */}
        <button
          type="button"
          onClick={() => {
            setActivePhotoIndex(0);
            setIsLightboxOpen(true);
          }}
          className="absolute bottom-4 end-4 z-10 bg-white/95 backdrop-blur-md text-primary font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg border border-tertiary/70 flex items-center gap-2 hover:scale-105 transition cursor-pointer"
        >
          <BrandGridIcon size={16} />
          <span>Show all photos</span>
        </button>
      </div>

      {/* Mobile Swipeable Gallery with counter */}
      <div className="md:hidden relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-neutral-200">
        <Image
          src={displayImages[mobilePhotoIndex]}
          alt={listing.title}
          fill
          className="object-cover"
        />
        {/* Prev / Next mobile arrows */}
        <button
          type="button"
          onClick={() =>
            setMobilePhotoIndex(
              (prev) => (prev - 1 + displayImages.length) % displayImages.length
            )
          }
          className="absolute start-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-primary shadow-md cursor-pointer"
        >
          <BrandChevronLeftIcon size={20} strokeWidth={2.2} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          onClick={() =>
            setMobilePhotoIndex((prev) => (prev + 1) % displayImages.length)
          }
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-primary shadow-md cursor-pointer"
        >
          <BrandChevronRightIcon size={20} strokeWidth={2.2} className="rtl:rotate-180" />
        </button>
        {/* Photo counter */}
        <div className="absolute bottom-3 end-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
          {mobilePhotoIndex + 1} / {displayImages.length}
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between p-4 sm:p-6"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              <BrandCloseIcon size={20} strokeWidth={2.2} />
              <span className="text-xs sm:text-sm font-semibold">Close gallery</span>
            </button>
            <span className="text-xs sm:text-sm font-semibold">
              {activePhotoIndex + 1} / {displayImages.length}
            </span>
          </div>

          {/* Active Image */}
          <div className="relative flex-1 w-full max-w-5xl mx-auto my-4 flex items-center justify-center">
            <Image
              src={displayImages[activePhotoIndex]}
              alt={`Photo ${activePhotoIndex + 1}`}
              fill
              className="object-contain"
            />

            {/* Left / Right Navigation */}
            <button
              type="button"
              onClick={() =>
                setActivePhotoIndex(
                  (prev) => (prev - 1 + displayImages.length) % displayImages.length
                )
              }
              className="absolute start-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer"
            >
              <BrandChevronLeftIcon size={28} strokeWidth={2.2} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActivePhotoIndex((prev) => (prev + 1) % displayImages.length)
              }
              className="absolute end-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer"
            >
              <BrandChevronRightIcon size={28} strokeWidth={2.2} className="rtl:rotate-180" />
            </button>
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
            {displayImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIndex(idx)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition ${
                  idx === activePhotoIndex ? "border-accent scale-105" : "border-transparent opacity-60"
                }`}
              >
                <Image src={img} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
