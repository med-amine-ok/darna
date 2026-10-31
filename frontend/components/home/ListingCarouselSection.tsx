"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Listing, User } from "@/types";
import ListingCarouselCard from "./ListingCarouselCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { BrandChevronLeftIcon, BrandChevronRightIcon } from "@/components/icons";

interface ListingCarouselSectionProps {
  title: string;
  subtitle?: string;
  /** Shown as the section eyebrow. */
  badge?: string;
  listings: Listing[];
  currentUser?: User | null;
  viewMoreHref?: string;
  isLoading?: boolean;
}

const arrowClass =
  "w-10 h-10 rounded-full bg-white shadow-e1 text-primary-800 flex items-center justify-center transition duration-fast ease-standard hover:shadow-e2 hover:-translate-y-px active:scale-95 disabled:opacity-35 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg";

export default function ListingCarouselSection({
  title,
  subtitle,
  badge,
  listings,
  currentUser,
  viewMoreHref,
  isLoading = false,
}: ListingCarouselSectionProps) {
  const t = useTranslations("common");
  const tHome = useTranslations("homeHero.sections");
  const headingId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // scrollLeft is negative in RTL, so compare magnitudes.
    const pos = Math.abs(el.scrollLeft);
    setCanPrev(pos > 8);
    setCanNext(pos < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [listings, update]);

  /** Scrolls by one viewport of cards towards the reading end (`next`) or start. */
  const page = (dir: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    const isRtl = getComputedStyle(el).direction === "rtl";
    const amount = el.clientWidth * 0.85 * (dir === "next" ? 1 : -1) * (isRtl ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (!isLoading && listings.length === 0) return null;

  return (
    <section className="space-y-7" aria-labelledby={headingId}>
      <SectionHeader
        id={headingId}
        eyebrow={badge}
        title={title}
        subtitle={subtitle}
        href={viewMoreHref}
        linkLabel={tHome("seeAll")}
        actions={
          <div className="hidden md:flex items-center gap-2">
            <button type="button" onClick={() => page("prev")} disabled={!canPrev} aria-label={t("previous")} className={arrowClass}>
              <BrandChevronLeftIcon size={18} className="rtl:rotate-180" />
            </button>
            <button type="button" onClick={() => page("next")} disabled={!canNext} aria-label={t("next")} className={arrowClass}>
              <BrandChevronRightIcon size={18} className="rtl:rotate-180" />
            </button>
          </div>
        }
      />

      {/* Track: snap scrolling, next card peeks on mobile to invite a swipe. */}
      <div
        ref={trackRef}
        onScroll={update}
        className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none -mx-4 px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:mx-0 lg:px-0 lg:scroll-px-0 pb-4 pt-1"
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} aria-hidden="true" className="snap-start shrink-0 w-[72vw] sm:w-64 lg:w-[17.5rem] space-y-3">
              <div className="skeleton aspect-[20/19] rounded-2xl" />
              <div className="skeleton h-4 rounded-md w-3/4" />
              <div className="skeleton h-3.5 rounded-md w-1/2" />
            </div>
          ))
        ) : (
          <RevealGroup className="flex gap-4 sm:gap-6" each={0.06}>
            {listings.map((listing) => (
              <RevealItem key={listing.id} className="snap-start shrink-0 w-[72vw] sm:w-64 lg:w-[17.5rem]">
                <ListingCarouselCard listing={listing} currentUser={currentUser} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}
