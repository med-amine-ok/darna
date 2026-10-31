"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { BrandSearchIcon, BrandPinIcon } from "@/components/icons";
import { Range } from "react-date-range";
import { useLocale, useTranslations } from "next-intl";
import { useVertical } from "@/hook/useVertical";
import { useDismiss } from "@/hook/useDismiss";
import { useDestinationLabel } from "@/hook/useDestinationLabel";
import { shortDayLabel } from "@/components/search/dateLabels";
import { Popover, cn } from "@/components/ui";
import { dur, ease, spring } from "@/lib/motion";

import WherePopover, { DestinationItem } from "./search/WherePopover";
import WhenPopover, { type FlexDays } from "./search/WhenPopover";
import WhoPopover from "./search/WhoPopover";

type PopoverType = "where" | "when" | "who" | null;

interface SearchProps {
  isHero?: boolean;
  scrollProgress?: number;
}

const segmentBase =
  "relative flex h-full w-full min-w-0 flex-col justify-center rounded-full px-5 text-start cursor-pointer select-none " +
  "transition-[background-color,box-shadow] duration-fast ease-standard " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600";

/**
 * Header search: a segmented glass bar (Where · When · Who) with kit Popovers that scale
 * from the corner nearest their segment. On the home hero it morphs with scroll; elsewhere
 * it rests as a compact pill that expands into the full bar when clicked.
 */
export default function Search({ isHero = false, scrollProgress = 0 }: SearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const t = useTranslations("search");
  const destinationLabel = useDestinationLabel();
  const activeVertical = useVertical((s) => s.activeVertical);

  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLButtonElement>(null);

  const [destination, setDestination] = useState<string>(searchParams?.get("destination") || "");
  const [dateRange, setDateRange] = useState<Range>({
    startDate: searchParams?.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
    endDate: searchParams?.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
    key: "selection",
  });
  const [flexDays, setFlexDays] = useState<FlexDays>(0);
  const [guestCount, setGuestCount] = useState<number>(searchParams?.get("guests") ? parseInt(searchParams.get("guests")!, 10) : 1);

  // On non-hero pages progress is always 1 (docked).
  const progress = isHero ? scrollProgress : 1;
  const docked = progress >= 0.5;
  const showBar = !docked || expanded;

  const collapse = useCallback(() => {
    setActivePopover(null);
    setExpanded(false);
  }, []);
  useDismiss(expanded || activePopover !== null, containerRef, collapse, summaryRef);

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
      ? tCommon("dateRange", { start: shortDayLabel(dateRange.startDate, locale), end: shortDayLabel(dateRange.endDate, locale) }) +
        (flexDays ? ` · ${t("flex.short", { count: flexDays })}` : "")
      : "";

  const guestSummary =
    guestCount > 1 ? (vertical === "vehicle" ? t("passengerCount", { count: guestCount }) : t("guestCount", { count: guestCount })) : "";

  const destinationText = destination ? destinationLabel(destination) : "";

  const handleSearch = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      collapse();
      const query = new URLSearchParams();
      if (destination) query.set("destination", destination);
      if (activeVertical) query.set("vertical", activeVertical);
      if (dateRange.startDate) query.set("startDate", dateRange.startDate.toISOString());
      if (dateRange.endDate) query.set("endDate", dateRange.endDate.toISOString());
      if (guestCount > 1) query.set("guests", guestCount.toString());
      router.push(`/search?${query.toString()}`);
    },
    [destination, activeVertical, dateRange, guestCount, router, collapse]
  );

  const handleSelectDestination = (item: DestinationItem) => {
    setDestination(item.name);
    setActivePopover("when");
  };

  const openFor = (type: Exclude<PopoverType, null>) => (open: boolean) => {
    if (open) setActivePopover(type);
    else setActivePopover((cur) => (cur === type ? null : cur));
  };

  // Hero scroll morph (GPU transform only).
  const translateY = isHero ? (1 - progress) * 88 : 0;
  const scale = isHero ? 1 - progress * 0.14 : 1;
  const anyOpen = activePopover !== null;

  const segment = (type: Exclude<PopoverType, null>, title: string, value: string, placeholder: string, withIcon = false) => (
    <button
      type="button"
      className={cn(
        segmentBase,
        withIcon && "ps-4",
        activePopover === type ? "bg-white shadow-e2" : anyOpen ? "hover:bg-white/70" : "hover:bg-primary/[0.04]"
      )}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        {withIcon && <BrandPinIcon size={20} strokeWidth={1.75} className="shrink-0 text-accent-600" aria-hidden="true" />}
        <span className="flex min-w-0 flex-col">
          <span className="text-eyebrow uppercase font-semibold text-primary-900">{title}</span>
          <span className={cn("mt-0.5 truncate text-sm", value ? "font-medium text-primary-900" : "text-primary-500")}>{value || placeholder}</span>
        </span>
      </span>
    </button>
  );

  const divider = (hidden: boolean) => (
    <span aria-hidden="true" className={cn("h-7 w-px shrink-0 bg-primary/[0.1] transition-opacity duration-fast", hidden && "opacity-0")} />
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative", anyOpen || expanded ? "z-[100]" : "z-30")}
      style={{
        transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
        transformOrigin: "center center",
        transition: "transform 75ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {showBar ? (
          <m.div
            key="bar"
            role="search"
            aria-label={tNav("search")}
            initial={{ opacity: 0, scaleX: 0.62, scaleY: 0.8 }}
            animate={{ opacity: Math.max(0, isHero && !expanded ? 1 - progress * 2.2 : 1), scaleX: 1, scaleY: 1, transition: spring.layout }}
            exit={{ opacity: 0, scaleX: 0.7, scaleY: 0.85, transition: { duration: dur.fast, ease: ease.standard } }}
            className={cn(
              "mx-auto flex h-[66px] items-center rounded-full p-1.5 transition-[background-color,box-shadow] duration-base ease-standard",
              anyOpen ? "bg-darnaBg-300 shadow-e3" : "bg-white shadow-e3 hover:shadow-e4"
            )}
            style={{ width: isHero && !expanded ? "calc(100vw - 32px)" : "min(640px, calc(100vw - 32px))", maxWidth: 768 }}
          >
            <Popover
              ariaLabel={labels.whereTitle}
              align="start"
              open={activePopover === "where"}
              onOpenChange={openFor("where")}
              wrapperClassName="h-full flex-[1.25] min-w-0"
              className="p-3 rounded-3xl shadow-e4 mt-1"
              trigger={segment("where", labels.whereTitle, destinationText, labels.wherePlaceholder, true)}
            >
              <WherePopover query={destination} onQueryChange={setDestination} onSelect={handleSelectDestination} placeholder={labels.wherePlaceholder} />
            </Popover>

            {divider(activePopover === "where" || activePopover === "when")}

            <Popover
              ariaLabel={labels.whenTitle}
              align="center"
              open={activePopover === "when"}
              onOpenChange={openFor("when")}
              wrapperClassName="h-full flex-1 min-w-0"
              className="p-5 rounded-3xl shadow-e4 mt-1"
              trigger={segment("when", labels.whenTitle, formattedDates, labels.whenPlaceholder)}
            >
              <WhenPopover
                dateRange={dateRange}
                onChangeDateRange={setDateRange}
                onClear={() => setDateRange({ startDate: undefined, endDate: undefined, key: "selection" })}
                onApply={() => setActivePopover("who")}
                label={labels.whenPlaceholder}
                flexDays={flexDays}
                onFlexDaysChange={setFlexDays}
              />
            </Popover>

            {divider(activePopover === "when" || activePopover === "who")}

            <Popover
              ariaLabel={labels.whoTitle}
              align="end"
              open={activePopover === "who"}
              onOpenChange={openFor("who")}
              wrapperClassName="h-full flex-1 min-w-0"
              className="p-5 rounded-3xl shadow-e4 mt-1"
              trigger={segment("who", labels.whoTitle, guestSummary, labels.whoPlaceholder)}
            >
              <WhoPopover
                guestCount={guestCount}
                onChangeGuests={setGuestCount}
                title={labels.whoTitle}
                subtitle={labels.whoSubtitle}
                onApply={() => setActivePopover(null)}
              />
            </Popover>

            <m.button
              type="button"
              onClick={handleSearch}
              aria-label={tNav("search")}
              whileTap={{ scale: 0.95 }}
              transition={spring.press}
              className="ms-1 flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-full bg-cta px-5 text-sm font-semibold text-white shadow-glow cursor-pointer transition-[filter,padding] duration-fast ease-standard hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              <BrandSearchIcon size={18} strokeWidth={2.2} />
              <span className={cn("hidden lg:inline", !anyOpen && "lg:hidden xl:inline")} aria-hidden="true">
                {tNav("search")}
              </span>
            </m.button>
          </m.div>
        ) : (
          <m.div
            key="pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: Math.max(0, isHero ? (progress - 0.4) * 1.66 : 1), scale: 1, transition: { duration: dur.base, ease: ease.out } }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: dur.micro } }}
            className="mx-auto flex h-12 max-w-[440px] items-center gap-2 rounded-full bg-white ps-1.5 pe-1.5 shadow-e2 transition-shadow duration-fast ease-standard hover:shadow-e3"
          >
            <button
              ref={summaryRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={false}
              onClick={() => {
                setExpanded(true);
                setActivePopover("where");
              }}
              className="flex h-full min-w-0 items-center rounded-full ps-3 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <span className="flex min-w-0 max-w-[150px] items-center gap-1.5 font-semibold text-primary-900">
                <BrandPinIcon size={15} strokeWidth={2} className="shrink-0 text-accent-600" aria-hidden="true" />
                <span className="truncate">{destinationText || t("anywhereInAlgeria")}</span>
              </span>
              <span aria-hidden="true" className="mx-3 h-5 w-px shrink-0 bg-primary/[0.12]" />
              <span className="max-w-[120px] truncate font-medium text-primary-800">
                {formattedDates || verticalTabLabel[vertical] || tCommon("anyWeek")}
              </span>
              <span aria-hidden="true" className="mx-3 h-5 w-px shrink-0 bg-primary/[0.12]" />
              <span className="max-w-[100px] truncate text-primary-600">{guestSummary || tNav("addGuests")}</span>
            </button>
            <button
              type="button"
              onClick={handleSearch}
              aria-label={tNav("search")}
              className="ms-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta text-white shadow-glow cursor-pointer transition-[filter] duration-fast hover:brightness-110 before:absolute before:-inset-1 before:content-[''] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              <BrandSearchIcon size={15} strokeWidth={2.4} />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
