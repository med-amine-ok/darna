"use client";

import useCountries from "@/hook/useCountries";
import { SafeUser } from "@/types";
import Image from "next/image";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { IoGridOutline, IoClose, IoShareOutline } from "react-icons/io5";
import { MdChevronLeft, MdChevronRight, MdStar } from "react-icons/md";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import HeartButton from "../HeartButton";

type Props = {
  title: string;
  locationValue: string;
  imageSrc: string;
  images?: string[];
  id: string;
  currentUser?: SafeUser | null;
  rating?: number;
  reviewCount?: number;
};

function ListingHead({
  title,
  locationValue,
  imageSrc,
  images,
  id,
  currentUser,
  rating = 4.92,
  reviewCount = 28,
}: Props) {
  const { getByValue } = useCountries();
  const location = getByValue(locationValue);
  const t = useTranslations("listing");

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // High quality gallery images
  const galleryImages = useMemo(() => {
    if (images && images.length >= 5) {
      return images;
    }
    const complements = [
      imageSrc,
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    ];
    return images && images.length > 0 ? [...images, ...complements.slice(images.length)] : complements;
  }, [images, imageSrc]);

  // Keyboard navigation for photo modal
  useEffect(() => {
    if (!isPhotoModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPhotoModalOpen(false);
      } else if (e.key === "ArrowRight") {
        setActivePhotoIndex((prev) => (prev + 1) % galleryImages.length);
      } else if (e.key === "ArrowLeft") {
        setActivePhotoIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhotoModalOpen, galleryImages.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setMobilePhotoIndex((prev) => (prev + 1) % galleryImages.length);
      } else {
        setMobilePhotoIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    }
    setTouchStartX(null);
  };

  const handleShare = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t("linkCopied"));
    }
  }, [t]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title & Top Metadata Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            {title}
          </h1>
          <div className="flex items-center gap-2 text-sm text-neutral-600 font-medium mt-1">
            <span className="flex items-center gap-1 font-semibold text-neutral-900">
              <MdStar className="text-neutral-900" size={16} />
              <span>{rating.toFixed(2)}</span>
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={() => scrollToSection("reviews-section")}
              className="underline hover:text-neutral-900 font-semibold cursor-pointer"
            >
              {t("reviewsCount", { count: reviewCount })}
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => scrollToSection("location-section")}
              className="underline hover:text-neutral-900 cursor-pointer"
            >
              {location?.region ? `${location.region}, ` : ""}{location?.label}
            </button>
          </div>
        </div>

        {/* Share & Save Actions */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 py-1.5 px-3 rounded-lg transition underline cursor-pointer"
          >
            <IoShareOutline size={18} />
            <span>{t("share")}</span>
          </button>
          <div className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-neutral-100 rounded-lg transition cursor-pointer">
            <HeartButton listingId={id} currentUser={currentUser} />
            <span className="text-sm font-semibold text-neutral-800 underline">{t("save")}</span>
          </div>
        </div>
      </div>

      {/* Desktop 5-Image Mosaic Grid (60% hero left, 40% 2x2 grid right) */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[420px] lg:h-[480px] rounded-2xl overflow-hidden relative">
        {/* Large Hero Image (Left Half - 2 cols, 2 rows) */}
        <div
          onClick={() => {
            setActivePhotoIndex(0);
            setIsPhotoModalOpen(true);
          }}
          className="col-span-2 row-span-2 relative cursor-pointer group overflow-hidden bg-neutral-100"
        >
          <Image
            src={galleryImages[0]}
            alt={title}
            fill
            priority
            className="object-cover group-hover:scale-105 group-hover:brightness-95 transition duration-300"
            sizes="(max-width: 1024px) 50vw, 650px"
          />
        </div>

        {/* Top Middle */}
        <div
          onClick={() => {
            setActivePhotoIndex(1);
            setIsPhotoModalOpen(true);
          }}
          className="col-span-1 row-span-1 relative cursor-pointer group overflow-hidden bg-neutral-100"
        >
          <Image
            src={galleryImages[1]}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 group-hover:brightness-95 transition duration-300"
            sizes="(max-width: 1024px) 25vw, 320px"
          />
        </div>

        {/* Top Right */}
        <div
          onClick={() => {
            setActivePhotoIndex(2);
            setIsPhotoModalOpen(true);
          }}
          className="col-span-1 row-span-1 relative cursor-pointer group overflow-hidden bg-neutral-100"
        >
          <Image
            src={galleryImages[2]}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 group-hover:brightness-95 transition duration-300"
            sizes="(max-width: 1024px) 25vw, 320px"
          />
        </div>

        {/* Bottom Middle */}
        <div
          onClick={() => {
            setActivePhotoIndex(3);
            setIsPhotoModalOpen(true);
          }}
          className="col-span-1 row-span-1 relative cursor-pointer group overflow-hidden bg-neutral-100"
        >
          <Image
            src={galleryImages[3]}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 group-hover:brightness-95 transition duration-300"
            sizes="(max-width: 1024px) 25vw, 320px"
          />
        </div>

        {/* Bottom Right */}
        <div
          onClick={() => {
            setActivePhotoIndex(4);
            setIsPhotoModalOpen(true);
          }}
          className="col-span-1 row-span-1 relative cursor-pointer group overflow-hidden bg-neutral-100"
        >
          <Image
            src={galleryImages[4]}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 group-hover:brightness-95 transition duration-300"
            sizes="(max-width: 1024px) 25vw, 320px"
          />
        </div>

        {/* "Show all photos" Overlay Button */}
        <button
          type="button"
          onClick={() => {
            setActivePhotoIndex(0);
            setIsPhotoModalOpen(true);
          }}
          className="absolute bottom-4 end-4 z-10 flex items-center gap-2 bg-white/95 hover:bg-white text-neutral-900 border border-neutral-900/80 px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-95 transition cursor-pointer"
        >
          <IoGridOutline size={16} />
          <span>{t("showAllPhotos")}</span>
        </button>
      </div>

      {/* Mobile Swipeable Gallery */}
      <div
        className="md:hidden relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-neutral-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={galleryImages[mobilePhotoIndex]}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />

        {/* Next / Prev Mobile Arrows */}
        <button
          type="button"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            setMobilePhotoIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-neutral-800 shadow-sm transition absolute top-1/2 -translate-y-1/2 start-2 touch-manipulation cursor-pointer"
        >
          <MdChevronLeft size={22} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            setMobilePhotoIndex((prev) => (prev + 1) % galleryImages.length);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-neutral-800 shadow-sm transition absolute top-1/2 -translate-y-1/2 end-2 touch-manipulation cursor-pointer"
        >
          <MdChevronRight size={22} className="rtl:rotate-180" />
        </button>

        {/* Counter Badge */}
        <div className="absolute bottom-3 end-3 z-10 bg-neutral-900/80 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
          {t("photoCount", { current: mobilePhotoIndex + 1, total: galleryImages.length })}
        </div>
      </div>

      {/* Full-Screen Lightbox Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="px-6 py-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
            <button
              type="button"
              aria-label="Close photos modal"
              onClick={() => setIsPhotoModalOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white cursor-pointer touch-manipulation"
            >
              <IoClose size={22} />
            </button>
            <div className="font-semibold text-sm">
              {t("photoCount", { current: activePhotoIndex + 1, total: galleryImages.length })}
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white cursor-pointer"
            >
              <IoShareOutline size={18} />
            </button>
          </div>

          {/* Main Active Photo */}
          <div className="relative flex-1 w-full max-w-5xl mx-auto flex items-center justify-center p-4">
            <div className="relative w-full h-full max-h-[75vh]">
              <Image
                src={galleryImages[activePhotoIndex]}
                alt={`${title} photo ${activePhotoIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 1200px"
              />
            </div>

            {/* Left / Right Nav Arrows */}
            <button
              type="button"
              aria-label="Previous"
              onClick={() => setActivePhotoIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
              className="absolute start-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
            >
              <MdChevronLeft size={28} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setActivePhotoIndex((prev) => (prev + 1) % galleryImages.length)}
              className="absolute end-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
            >
              <MdChevronRight size={28} className="rtl:rotate-180" />
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="p-4 bg-gradient-to-t from-black/80 to-transparent overflow-x-auto no-scrollbar flex items-center justify-center gap-2">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIndex(idx)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 transition cursor-pointer ${
                  idx === activePhotoIndex ? "ring-2 ring-white scale-105" : "opacity-50 hover:opacity-100"
                }`}
              >
                <Image src={img} alt={`thumb-${idx}`} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ListingHead;
