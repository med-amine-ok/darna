"use client";

import React, { useRef, useState, useEffect } from "react";
import { safeListing, SafeUser } from "@/types";
import ListingCarouselCard from "./ListingCarouselCard";
import { MdChevronLeft, MdChevronRight, MdArrowForward } from "react-icons/md";
import { IoPricetag } from "react-icons/io5";

import { useRouter } from "@/navigation";

interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  listings: safeListing[];
  currentUser?: SafeUser | null;
  viewMoreHref?: string;
}

export default function ListingCarouselSection({
  title,
  subtitle,
  badge,
  listings,
  currentUser,
  viewMoreHref,
}: Props) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [listings]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -450 : 450;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  if (listings.length === 0) return null;

  return (
    <section className="space-y-4">
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
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              {title}
            </h2>
            <button
              aria-label="View more"
              className="p-1 rounded-full text-neutral-900 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform"
            >
              <MdArrowForward size={20} className="rtl:rotate-180" />
            </button>
          </div>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous listings"
            className="p-2 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <MdChevronLeft size={20} className="rtl:rotate-180" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Next listings"
            className="p-2 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <MdChevronRight size={20} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Floating Center Badge if provided */}
      {badge && (
        <div className="flex justify-center pt-1 pb-1">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200/90 rounded-2xl shadow-sm text-xs font-semibold text-neutral-800">
            <IoPricetag size={15} className="text-accent" />
            <span>{badge}</span>
          </div>
        </div>
      )}

      {/* Carousel Track */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth no-scrollbar py-2 -mx-4 px-4 sm:-mx-0 sm:px-0"
      >
        {listings.map((listing) => (
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
