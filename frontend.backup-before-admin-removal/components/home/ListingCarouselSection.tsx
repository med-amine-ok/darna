"use client";

import React, { useRef, useState, useEffect } from "react";
import { Listing, User } from "@/types";
import ListingCarouselCard from "./ListingCarouselCard";
import {
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandArrowRightIcon,
  BrandTagIcon,
} from "@/components/icons";
import { useRouter } from "@/navigation";

interface ListingCarouselSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  listings: Listing[];
  currentUser?: User | null;
  viewMoreHref?: string;
  isLoading?: boolean;
}

export default function ListingCarouselSection({
  title,
  subtitle,
  badge,
  listings,
  currentUser,
  viewMoreHref,
  isLoading = false,
}: ListingCarouselSectionProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(Math.abs(scrollLeft) > 10);
      setCanScrollRight(Math.abs(scrollLeft) < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [listings]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -460 : 460;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section className="space-y-4 py-4">
      {/* Header Row */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div
            onClick={() => {
              if (viewMoreHref) {
                router.push(viewMoreHref);
              }
            }}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              {title}
            </h2>
            <button
              type="button"
              aria-label="View more"
              className="p-1 rounded-full text-primary group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform"
            >
              <BrandArrowRightIcon size={20} className="rtl:rotate-180" />
            </button>
          </div>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous listings"
            className="p-2 rounded-full border border-tertiary/70 text-primary hover:bg-tertiary/20 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <BrandChevronLeftIcon size={20} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Next listings"
            className="p-2 rounded-full border border-tertiary/70 text-primary hover:bg-tertiary/20 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <BrandChevronRightIcon size={20} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Floating Center Badge if provided */}
      {badge && (
        <div className="flex justify-center pt-1 pb-1">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-tertiary/60 rounded-2xl shadow-sm text-xs font-semibold text-primary">
            <BrandTagIcon size={15} className="text-accent" />
            <span>{badge}</span>
          </div>
        </div>
      )}

      {/* Carousel Track - Scrollbar / slider completely invisible */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-2 -mx-4 px-4 sm:-mx-0 sm:px-0"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-52 sm:w-60 space-y-2.5 animate-pulse"
              >
                <div className="aspect-square w-full rounded-xl bg-neutral-200/70" />
                <div className="h-3.5 bg-neutral-200/70 rounded w-3/4" />
                <div className="h-3 bg-neutral-200/50 rounded w-1/2" />
                <div className="h-3.5 bg-neutral-200/70 rounded w-1/3" />
              </div>
            ))
          : listings.map((listing) => (
              <ListingCarouselCard
                key={listing.id}
                listing={listing}
                currentUser={currentUser}
              />
            ))}
      </div>
    </section>
  );
}
