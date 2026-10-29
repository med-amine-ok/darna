"use client";

import React, { useState, useRef, useCallback, useId } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { BrandSearchIcon, BrandPinIcon } from "@/components/icons";
import { Range } from "react-date-range";
import { useLocale, useTranslations } from "next-intl";
import { useVertical } from "@/hook/useVertical";
import { useDismiss } from "@/hook/useDismiss";
import { useDestinationLabel } from "@/hook/useDestinationLabel";
import { shortDayLabel } from "@/components/search/dateLabels";

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
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const t = useTranslations("search");
  const destinationLabel = useDestinationLabel();
  const activeVertical = useVertical((s) => s.activeVertical);
  const popoverId = useId();

  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const whereRef = useRef<HTMLButtonElement>(null);
  const whenRef = useRef<HTMLButtonElement>(null);
  const whoRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLButtonElement>(null);

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

  // Close the open popover on outside click or Escape; Escape returns focus to its trigger.
  const triggerRef =
    activePopover === "where"
      ? whereRef
      : activePopover === "when"
      ? whenRef
      : activePopover === "who"
      ? whoRef
      : summaryRef;
  const closePopover = useCallback(() => setActivePopover(null), []);
  useDismiss(activePopover !== null, containerRef, closePopover, triggerRef);

  // Field labels depend on the active vertical (stays, hotels, vehicles...).
  const vertical = activeVertical || "home";
  const labels = {
    whereTitle: t(`bar.${vertical}.whereTitle`),
    wherePlaceholder: t(`bar.${vertical}.wherePlaceholder`),
    whenTitle: t(`bar.${vertical}.whenTitle`),
    whenPlaceholder: t(`bar.${vertical}.whenPlaceholder`),
    whoTitle: t(`bar.${vertical}.whoTitle`),
    whoPlaceholder: t(`bar.${vertical}.whoPlaceholder`),
    whoSubtitle: t(`bar.${vertical}.whoSubtitle`),
  };

  const verticalTabLabel: Record<string, string> = {
    home: tNav("tabHomes"),
    hotel: tNav("tabHotels"),
    experience: tNav("tabExperiences"),
    vehicle: tNav("tabVehicles"),
    trip: tNav("tabTrips"),
  };

  const formattedDates =
    dateRange.startDate && dateRange.endDate
      ? tCommon("dateRange", {
          start: shortDayLabel(dateRange.startDate, locale),
          end: shortDayLabel(dateRange.endDate, locale),
        })
      : "";

  const guestSummary =
    guestCount > 1
      ? vertical === "vehicle"
        ? t("passengerCount", { count: guestCount })
        : t("guestCount", { count: guestCount })
      : "";

  const destinationText = destination ? destinationLabel(destination) : "";

  const segmentProps = (type: Exclude<PopoverType, null>) => ({
    "aria-haspopup": "dialog" as const,
    "aria-expanded": activePopover === type,
    "aria-controls": activePopover === type ? `${popoverId}-${type}` : undefined,
  });

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
            ref={whereRef}
            type="button"
            {...segmentProps("where")}
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover(activePopover === "where" ? null : "where");
            }}
            className={`
              flex-1 flex items-center gap-2.5 text-start px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600
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
                {destinationText || labels.wherePlaceholder}
              </span>
            </div>
          </button>

          <div className="h-6 w-[1px] bg-tertiary/60 shrink-0 mx-1" />

          {/* Segment 2: When */}
          <button
            ref={whenRef}
            type="button"
            {...segmentProps("when")}
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover(activePopover === "when" ? null : "when");
            }}
            className={`
              flex-1 flex flex-col text-start px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600
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
            ref={whoRef}
            type="button"
            {...segmentProps("who")}
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover(activePopover === "who" ? null : "who");
            }}
            className={`
              flex-1 flex flex-col text-start px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full transition cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600
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
              {guestSummary || labels.whoPlaceholder}
            </span>
          </button>

          {/* Action Button: Search */}
          <div className="pe-1 sm:pe-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSearch}
              aria-label={tNav("search")}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-accent-600 text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-accent-700 transition select-none cursor-pointer btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              <BrandSearchIcon size={16} strokeWidth={2.4} className="text-white" />
              <span className="hidden md:inline" aria-hidden="true">
                {tNav("search")}
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
          <button
            ref={summaryRef}
            type="button"
            {...segmentProps("where")}
            onClick={() => setActivePopover(activePopover ? null : "where")}
            className="flex items-center gap-2 sm:gap-3 min-w-0 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <span className="font-semibold text-primary truncate max-w-[96px] lg:max-w-[140px] flex items-center gap-1.5">
              <BrandPinIcon size={14} strokeWidth={2} className="shrink-0 text-accent" />
              <span className="truncate">{destinationText || t("anywhereInAlgeria")}</span>
            </span>

            <span className="text-tertiary" aria-hidden="true">|</span>

            <span className="font-semibold text-neutral-600 truncate max-w-[72px] lg:max-w-[100px]">
              {formattedDates || verticalTabLabel[vertical] || tCommon("anyWeek")}
            </span>

            <span className="text-tertiary" aria-hidden="true">|</span>

            <span className="text-neutral-600 font-normal truncate max-w-[56px] lg:max-w-[90px]">
              {guestSummary || tNav("addGuests")}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSearch}
            className="p-1.5 bg-accent-600 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-accent-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            aria-label={tNav("search")}
          >
            <BrandSearchIcon size={13} strokeWidth={2.5} className="text-white" />
          </button>
        </div>
      </div>

      {/* Floating Popovers (Positioned below the pill) */}
      {activePopover === "where" && (
        <div id={`${popoverId}-where`} role="dialog" aria-label={labels.whereTitle} className="absolute top-full start-0 mt-3 z-[100] animate-in fade-in zoom-in-95 duration-150">
          <WherePopover
            query={destination}
            onSelect={handleSelectDestination}
          />
        </div>
      )}

      {activePopover === "when" && (
        <div id={`${popoverId}-when`} role="dialog" aria-label={labels.whenTitle} className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-[100] animate-in fade-in zoom-in-95 duration-150">
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
        <div id={`${popoverId}-who`} role="dialog" aria-label={labels.whoTitle} className="absolute top-full end-0 mt-3 z-[100] animate-in fade-in zoom-in-95 duration-150">
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
