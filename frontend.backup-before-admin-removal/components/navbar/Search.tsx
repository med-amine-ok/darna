"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { BrandSearchIcon, BrandPinIcon } from "@/components/icons";
import { Range } from "react-date-range";
import { useTranslations } from "next-intl";
import { ListingVertical } from "@/types";
import { useVertical } from "@/hook/useVertical";

import WherePopover, { DestinationItem } from "./search/WherePopover";
import WhenPopover from "./search/WhenPopover";
import WhoPopover from "./search/WhoPopover";

type PopoverType = "where" | "when" | "who" | null;

interface SearchProps {
  isHero?: boolean;
  scrollProgress?: number; 
}

export default function Search({
  isHero = false,
  scrollProgress = 0,
}: SearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const { activeVertical } = useVertical();

  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search state
  const [destination, setDestination] = useState<string>(
    searchParams?.get("destination") || ""
  );

  const [dateRange, setDateRange] = useState<Range>({
    startDate: searchParams?.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined,
    endDate: searchParams?.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined,
    key: "selection",
  });

  const [guestCount, setGuestCount] = useState<number>(
    searchParams?.get("guests")
      ? parseInt(searchParams.get("guests")!, 10)
      : 1
  );

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setActivePopover(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format labels based on active vertical
  const labels = {
    home: {
      whereTitle: tNav("where"),
      wherePlaceholder: tNav("searchDestinations"),
      whenTitle: tNav("when"),
      whenPlaceholder: tNav("addDates"),
      whoTitle: tNav("who"),
      whoPlaceholder: tNav("addGuests"),
      whoSubtitle: "Ages 13 or above",
    },
    hotel: {
      whereTitle: tNav("where"),
      wherePlaceholder: "City, hotel or hostel name",
      whenTitle: tNav("when"),
      whenPlaceholder: tNav("addDates"),
      whoTitle: "Rooms & Guests",
      whoPlaceholder: "Add rooms & guests",
      whoSubtitle: "Rooms, adults & children",
    },
    vehicle: {
      whereTitle: "Pickup",
      wherePlaceholder: "Airport or city location",
      whenTitle: "Rental Dates",
      whenPlaceholder: "Pickup & return dates",
      whoTitle: "Passengers",
      whoPlaceholder: "Seats & passengers",
      whoSubtitle: "Total seats required",
    },
    experience: {
      whereTitle: "Region",
      wherePlaceholder: "Explore activities in...",
      whenTitle: tNav("when"),
      whenPlaceholder: "Select experience date",
      whoTitle: "Group Size",
      whoPlaceholder: "Number of participants",
      whoSubtitle: "Attendees count",
    },
    trip: {
      whereTitle: "Circuit / Region",
      wherePlaceholder: "Sahara, Atlas, Coast...",
      whenTitle: "Trip Dates",
      whenPlaceholder: "Departure dates",
      whoTitle: "Travelers",
      whoPlaceholder: "Number of participants",
      whoSubtitle: "All ages welcome",
    },
  }[activeVertical || "home"];

  const formattedDates =
    dateRange.startDate && dateRange.endDate
      ? `${format(dateRange.startDate, "MMM d")} - ${format(
          dateRange.endDate,
          "MMM d"
        )}`
      : "";

  const handleSearch = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setActivePopover(null);
      const query = new URLSearchParams();

      if (destination) query.set("destination", destination);
      if (activeVertical) query.set("vertical", activeVertical);
      if (dateRange.startDate) {
        query.set("startDate", dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        query.set("endDate", dateRange.endDate.toISOString());
      }
      if (guestCount > 1) {
        query.set("guests", guestCount.toString());
      }

      router.push(`/search?${query.toString()}`);
    },
    [destination, activeVertical, dateRange, guestCount, router]
  );

  const handleSelectDestination = (item: DestinationItem) => {
    setDestination(item.name);
    setActivePopover("when");
  };

  // On non-hero pages, progress is always 1 (docked at rest)
  const progress = isHero ? scrollProgress : 1;

  // Transform calculations for continuous scroll motion (GPU accelerated)
  // 88px provides comfortable breathing space (~25px gap) between the fixed navbar and hero search bar at rest
  const translateY = isHero ? (1 - progress) * 88 : 0;
  const scale = isHero ? 1 - progress * 0.14 : 1;

  return (
    <div
      ref={containerRef}
      className={`relative ${activePopover ? "z-[100]" : "z-30"}`}
      style={{
        transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
        transformOrigin: "center center",
        transition: "transform 75ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Outer Morphing Pill Container */}
      <div
        className={`
          relative mx-auto rounded-full transition-all duration-150
          bg-white backdrop-blur-md 
          ${activePopover ? "shadow-darna-dropdown ring-2 ring-accent/30" : "shadow-darna-sm hover:shadow-darna"}
          ${progress >= 0.7 ? "cursor-pointer" : ""}
        `}
        style={{
          width: isHero
            ? progress >= 0.8
              ? "auto"
              : `calc(100vw - 32px)`
            : "auto",
          maxWidth: isHero
            ? progress >= 0.8
              ? "420px"
              : "768px"
            : "420px",
        }}
        onClick={() => {
          if (progress >= 0.6 && !activePopover) {
            setActivePopover("where");
          }
        }}
      >
        {/* ======================================================== */}
        {/* STATE A: EXPANDED HERO SEARCH BAR (visible when progress < 0.6) */}
        {/* ======================================================== */}
        <div
          className={`
            items-center w-full p-1.5 sm:p-2 transition-opacity duration-150
            ${progress >= 0.5 ? "hidden pointer-events-none opacity-0" : "flex opacity-100"}
          `}
          style={{
            opacity: Math.max(0, 1 - progress * 2.2),
          }}
        >
          {/* Segment 1: Where */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover(activePopover === "where" ? null : "where");
            }}
            className={`
              flex-1 flex items-center gap-2.5 text-start px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition cursor-pointer select-none
              ${
                activePopover === "where"
                  ? "bg-white shadow-md ring-1 ring-black/5"
                  : "hover:bg-neutral-100/70"
              }
            `}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-accent">
              <BrandPinIcon
                size={20}
                strokeWidth={1.8}
                className="shrink-0 text-accent"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {labels.whereTitle}
              </span>
              <span className="text-xs sm:text-sm font-medium text-neutral-600 truncate mt-0.5">
                {destination || labels.wherePlaceholder}
              </span>
            </div>
          </button>

          <div className="h-6 w-[1px] bg-tertiary/60 shrink-0 mx-1" />

          {/* Segment 2: When */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover(activePopover === "when" ? null : "when");
            }}
            className={`
              flex-1 flex flex-col text-start px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition cursor-pointer select-none
              ${
                activePopover === "when"
                  ? "bg-white shadow-md ring-1 ring-black/5"
                  : "hover:bg-neutral-100/70"
              }
            `}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {labels.whenTitle}
            </span>
            <span className="text-xs sm:text-sm font-medium text-neutral-600 truncate mt-0.5">
              {formattedDates || labels.whenPlaceholder}
            </span>
          </button>

          <div className="h-6 w-[1px] bg-tertiary/60 shrink-0 mx-1" />

          {/* Segment 3: Who */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover(activePopover === "who" ? null : "who");
            }}
            className={`
              flex-1 flex flex-col text-start px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition cursor-pointer select-none
              ${
                activePopover === "who"
                  ? "bg-white shadow-md ring-1 ring-black/5"
                  : "hover:bg-neutral-100/70"
              }
            `}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {labels.whoTitle}
            </span>
            <span className="text-xs sm:text-sm font-medium text-neutral-600 truncate mt-0.5">
              {guestCount > 1
                ? `${guestCount} ${activeVertical === "vehicle" ? "passengers" : "guests"}`
                : labels.whoPlaceholder}
            </span>
          </button>

          {/* Action Button: Search */}
          <div className="pe-1 sm:pe-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSearch}
              aria-label="Search"
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-accent text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-accent/90 transition select-none cursor-pointer btn-press"
            >
              <BrandSearchIcon size={16} strokeWidth={2.4} className="text-white" />
              <span className="hidden md:inline">
                {tNav("search") || "Search"}
              </span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STATE B: DOCKED COMPACT SUMMARY PILL (visible when progress >= 0.4) */}
        {/* ======================================================== */}
        <div
          className={`
            items-center justify-between py-1.5 px-3 sm:px-4 text-xs sm:text-sm gap-2 sm:gap-3 transition-opacity duration-150 select-none
            ${progress < 0.4 ? "hidden pointer-events-none opacity-0" : "flex opacity-100"}
          `}
          style={{
            opacity: Math.max(0, (progress - 0.4) * 1.66),
          }}
        >
          <div className="font-semibold text-primary truncate max-w-[110px] sm:max-w-[140px] flex items-center gap-1.5">
            <BrandPinIcon
              size={14}
              strokeWidth={2}
              className="shrink-0 text-accent"
            />
            <span className="truncate">{destination || "Anywhere in Algeria"}</span>
          </div>

          <div className="text-tertiary">|</div>

          <div className="font-semibold text-neutral-600 truncate max-w-[100px]">
            {formattedDates || (activeVertical ? activeVertical.toUpperCase() : "Any week")}
          </div>

          <div className="text-tertiary">|</div>

          <div className="text-neutral-500 font-normal truncate max-w-[90px]">
            {guestCount > 1 ? `${guestCount} guests` : "Add guests"}
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="p-1.5 bg-accent rounded-full text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-accent/90 transition"
            aria-label="Search"
          >
            <BrandSearchIcon size={13} strokeWidth={2.5} className="text-white" />
          </button>
        </div>
      </div>

      {/* Floating Popovers (Positioned below the pill) */}
      {activePopover === "where" && (
        <div className="absolute top-full start-0 mt-3 z-[100] animate-in fade-in zoom-in-95 duration-150">
          <WherePopover
            query={destination}
            onSelect={handleSelectDestination}
          />
        </div>
      )}

      {activePopover === "when" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-[100] animate-in fade-in zoom-in-95 duration-150">
          <WhenPopover
            dateRange={dateRange}
            onChangeDateRange={(range) => setDateRange(range)}
            onClear={() =>
              setDateRange({
                startDate: undefined,
                endDate: undefined,
                key: "selection",
              })
            }
            onApply={() => setActivePopover("who")}
            label={labels.whenPlaceholder}
          />
        </div>
      )}

      {activePopover === "who" && (
        <div className="absolute top-full end-0 mt-3 z-[100] animate-in fade-in zoom-in-95 duration-150">
          <WhoPopover
            guestCount={guestCount}
            onChangeGuests={setGuestCount}
            title={labels.whoTitle}
            subtitle={labels.whoSubtitle}
            onApply={() => setActivePopover(null)}
          />
        </div>
      )}
    </div>
  );
}
