"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { format, formatISO } from "date-fns";
import { BiSearch } from "react-icons/bi";
import { TbAdjustmentsHorizontal } from "react-icons/tb";
import { MdClose } from "react-icons/md";
import { useTranslations } from "next-intl";
import useSearchModal from "@/hook/useSearchModal";

import WherePopover, { DestinationItem } from "./search/WherePopover";
import WhenPopover from "./search/WhenPopover";
import ServicesPopover from "./search/ServicesPopover";
import WhoPopover from "./search/WhoPopover";

type PopoverType = "where" | "when" | "who" | "services" | null;

interface SearchProps {
  compact?: boolean;
  mobile?: boolean;
  onExpand?: () => void;
  isHero?: boolean;
}

export default function Search({ compact, mobile, onExpand, isHero }: SearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchModal = useSearchModal();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const whereInputRef = useRef<HTMLInputElement>(null);

  // Read current URL params
  const categoryParam = searchParams?.get("category") || "all";
  const isServicesMode = categoryParam === "Services";

  // State
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [destinationText, setDestinationText] = useState(
    searchParams?.get("destination") || searchParams?.get("locationValue") || ""
  );
  const [selectedLocationCode, setSelectedLocationCode] = useState(
    searchParams?.get("locationValue") || ""
  );

  const [startDate, setStartDate] = useState<Date | null>(
    searchParams?.get("startDate") ? new Date(searchParams.get("startDate")!) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    searchParams?.get("endDate") ? new Date(searchParams.get("endDate")!) : null
  );

  const [guestCount, setGuestCount] = useState<number>(
    searchParams?.get("guestCount") ? parseInt(searchParams.get("guestCount")!, 10) : 1
  );

  const [selectedService, setSelectedService] = useState<string | null>(
    searchParams?.get("service") || (isServicesMode ? "Spa treatments" : null)
  );

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setActivePopover(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update selectedService when categoryParam changes
  useEffect(() => {
    if (categoryParam === "Services" && !selectedService) {
      setSelectedService("Spa treatments");
    }
  }, [categoryParam, selectedService]);

  // Labels
  const durationLabel = useMemo(() => {
    if (startDate && endDate) {
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
    }
    return t("addDates");
  }, [startDate, endDate, t]);

  const guestLabel = useMemo(() => {
    if (guestCount > 1) {
      return `${guestCount} ${tCommon("guests")}`;
    }
    return t("addGuests");
  }, [guestCount, t, tCommon]);

  // Actions
  const handleSelectDestination = (item: DestinationItem) => {
    setDestinationText(item.fullLabel);
    setSelectedLocationCode(item.code);
    setActivePopover("when");
  };

  const handleClearDestination = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDestinationText("");
    setSelectedLocationCode("");
    whereInputRef.current?.focus();
  };

  const handleSelectDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    if (isServicesMode) {
      setActivePopover("services");
    } else {
      setActivePopover("who");
    }
  };

  const handleClearDates = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStartDate(null);
    setEndDate(null);
  };

  const handleSelectService = (serviceName: string) => {
    setSelectedService(serviceName);
    setActivePopover(null);
  };

  const handleClearService = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedService(null);
  };

  const handleExecuteSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePopover(null);

    let currentQuery = {};
    if (searchParams) {
      currentQuery = qs.parse(searchParams.toString());
    }

    const updatedQuery: any = {
      ...currentQuery,
    };

    if (destinationText.trim()) {
      updatedQuery.destination = destinationText.trim();
      if (selectedLocationCode) {
        updatedQuery.locationValue = selectedLocationCode;
      }
    } else {
      delete updatedQuery.destination;
      delete updatedQuery.locationValue;
    }

    if (startDate) {
      updatedQuery.startDate = formatISO(startDate);
    } else {
      delete updatedQuery.startDate;
    }

    if (endDate) {
      updatedQuery.endDate = formatISO(endDate);
    } else {
      delete updatedQuery.endDate;
    }

    if (!isServicesMode && guestCount > 1) {
      updatedQuery.guestCount = guestCount;
    } else {
      delete updatedQuery.guestCount;
    }

    if (isServicesMode && selectedService) {
      updatedQuery.service = selectedService;
      updatedQuery.category = "Services";
    }

    const url = qs.stringifyUrl(
      {
        url: "/",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    router.push(url);
  };

  if (mobile) {
    return (
      <div
        onClick={searchModal.onOpen}
        className="w-full min-h-[48px] bg-white border border-neutral-200/90 rounded-full py-2.5 px-4 flex items-center justify-between shadow-airbnb-card hover:shadow-airbnb transition cursor-pointer select-none touch-manipulation"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="text-accent flex-shrink-0">
            <BiSearch size={20} />
          </div>
          <div className="flex flex-col text-start min-w-0">
            <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
              {destinationText || tCommon("anywhere")}
            </span>
            <span className="text-[11px] sm:text-xs text-neutral-500 font-normal truncate">
              {startDate && endDate
                ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`
                : tCommon("anyWeek")}{" "}
              · {guestLabel}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-neutral-200 rounded-full text-neutral-700 bg-neutral-50 hover:bg-neutral-100 transition ms-2">
          <TbAdjustmentsHorizontal size={16} />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        onClick={onExpand || searchModal.onOpen}
        className="border border-neutral-200/90 rounded-full py-2 ps-4 pe-2 flex items-center gap-3 shadow-airbnb-card hover:shadow-airbnb transition cursor-pointer bg-white text-sm select-none"
      >
        <span className="font-semibold text-neutral-900 truncate max-w-[130px]">
          {destinationText || tCommon("anywhere")}
        </span>
        <span className="h-4 w-[1px] bg-neutral-200" />
        <span className="font-semibold text-neutral-900 truncate max-w-[120px]">
          {startDate && endDate
            ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`
            : tCommon("anyWeek")}
        </span>
        <span className="h-4 w-[1px] bg-neutral-200" />
        <span className="font-normal text-neutral-500 truncate max-w-[120px]">
          {guestCount > 1 ? `${guestCount} ${tCommon("guests")}` : tCommon("addGuests")}
        </span>
        <div className="p-2 bg-accent hover:bg-accent-600 active:bg-accent-700 text-white rounded-full flex items-center justify-center transition shadow-2xs ms-1 flex-shrink-0">
          <BiSearch size={13} className="stroke-[1]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${isHero ? "max-w-4xl" : "max-w-4xl"} mx-auto text-start`} ref={searchContainerRef}>
      {/* Outer Floating Search Pill */}
      <div
        className={`w-full bg-surface border border-tertiary/70 rounded-full transition-all duration-200 ${
          isHero ? "p-2 sm:p-2.5 shadow-xl hover:shadow-2xl" : "p-1.5 sm:p-2 shadow-md hover:shadow-lg"
        } flex items-center justify-between text-start ${
          activePopover ? "bg-surface ring-2 ring-primary/20 shadow-xl" : ""
        }`}
      >
        {/* --- 1. WHERE SECTION (Matching Image 1) --- */}
        <div
          onClick={() => {
            setActivePopover("where");
            whereInputRef.current?.focus();
          }}
          className={`flex-1 px-4 sm:px-6 py-2 rounded-full transition-all cursor-pointer relative flex items-center text-start ${
            activePopover === "where"
              ? "bg-surface shadow-md ring-1 ring-tertiary"
              : "hover:bg-tertiary/20"
          }`}
        >
          {isHero && (
            <BiSearch size={22} className="text-primary/70 me-3.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 text-start">
            <label className="block text-[11px] font-bold text-primary uppercase tracking-wider cursor-pointer text-start text-left rtl:text-right">
              {t("where")}
            </label>
            <div className="flex items-center justify-between text-start">
              <input
                ref={whereInputRef}
                type="text"
                value={destinationText}
                onChange={(e) => {
                  setDestinationText(e.target.value);
                  if (activePopover !== "where") setActivePopover("where");
                }}
                placeholder={t("searchDestinations")}
                className="w-full text-xs sm:text-sm font-medium text-primary placeholder-primary/40 bg-transparent outline-none truncate text-start text-left rtl:text-right"
              />
              {destinationText && (
                <button
                  type="button"
                  onClick={handleClearDestination}
                  aria-label="Clear destination"
                  className="p-1 rounded-full text-primary/40 hover:text-primary hover:bg-tertiary/30 transition ms-1"
                >
                  <MdClose size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-[1px] bg-tertiary/60 hidden sm:block mx-1 flex-shrink-0" />

        {/* --- 2. WHEN SECTION (Matching Image 2) --- */}
        <div
          onClick={() => setActivePopover("when")}
          className={`flex-1 px-4 sm:px-6 py-2 rounded-full transition-all cursor-pointer relative text-start ${
            activePopover === "when"
              ? "bg-surface shadow-md ring-1 ring-tertiary"
              : "hover:bg-tertiary/20"
          }`}
        >
          <div className="text-[11px] font-bold text-primary uppercase tracking-wider text-start text-left rtl:text-right">
            {t("when")}
          </div>
          <div className="flex items-center justify-between text-start">
            <div
              className={`text-xs sm:text-sm font-medium truncate text-start text-left rtl:text-right ${
                startDate ? "text-primary font-semibold" : "text-primary/50"
              }`}
            >
              {durationLabel}
            </div>
            {startDate && (
              <button
                type="button"
                onClick={handleClearDates}
                aria-label="Clear dates"
                className="p-1 rounded-full text-primary/40 hover:text-primary hover:bg-tertiary/30 transition ms-1"
              >
                <MdClose size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-[1px] bg-tertiary/60 hidden sm:block mx-1 flex-shrink-0" />

        {/* --- 3. THIRD SECTION: Type of service (Image 3) OR Who (Image 1/2) --- */}
        {isServicesMode ? (
          /* Services Mode matching Image 3 */
          <div
            onClick={() => setActivePopover("services")}
            className={`flex-1 ps-4 sm:ps-6 pe-2 py-2 rounded-full transition-all cursor-pointer flex items-center justify-between relative text-start ${
              activePopover === "services"
                ? "bg-surface shadow-md ring-1 ring-tertiary"
                : "hover:bg-tertiary/20"
            }`}
          >
            <div className="min-w-0 flex-1 text-start">
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider text-start text-left rtl:text-right">
                {t("typeOfService")}
              </div>
              <div className="flex items-center justify-between pe-2 text-start">
                <div
                  className={`text-xs sm:text-sm font-medium truncate text-start text-left rtl:text-right ${
                    selectedService ? "text-primary font-semibold" : "text-primary/50"
                  }`}
                >
                  {selectedService || tCommon("selectService")}
                </div>
                {selectedService && (
                  <button
                    type="button"
                    onClick={handleClearService}
                    aria-label="Clear service"
                    className="p-1 rounded-full text-primary/40 hover:text-primary hover:bg-tertiary/30 transition ms-1"
                  >
                    <MdClose size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Search Button */}
            <button
              type="button"
              onClick={handleExecuteSearch}
              className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-accent hover:bg-accent-600 active:bg-accent-700 text-white font-bold rounded-full transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0 ms-2 cursor-pointer text-sm sm:text-base"
            >
              <BiSearch size={18} />
              <span className="font-bold">{tCommon("search")}</span>
            </button>
          </div>
        ) : (
          /* Regular Mode: Who (Guests) with Search Button */
          <div
            onClick={() => setActivePopover("who")}
            className={`flex-1 ps-4 sm:ps-6 pe-2 py-2 rounded-full transition-all cursor-pointer flex items-center justify-between relative text-start ${
              activePopover === "who"
                ? "bg-surface shadow-md ring-1 ring-tertiary"
                : "hover:bg-tertiary/20"
            }`}
          >
            <div className="min-w-0 flex-1 text-start">
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider text-start text-left rtl:text-right">
                {t("who")}
              </div>
              <div
                className={`text-xs sm:text-sm font-medium truncate text-start text-left rtl:text-right ${
                  guestCount > 1 ? "text-primary font-semibold" : "text-primary/50"
                }`}
              >
                {guestLabel}
              </div>
            </div>

            {/* Hero Pill Button OR Compact Circle Button */}
            {isHero ? (
              <button
                type="button"
                onClick={handleExecuteSearch}
                aria-label="Search"
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-accent hover:bg-accent-600 active:bg-accent-700 text-white font-bold rounded-full transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0 ms-2 cursor-pointer text-sm sm:text-base"
              >
                <BiSearch size={18} />
                <span className="font-bold">{tCommon("search")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteSearch}
                aria-label="Search"
                className="p-3 bg-accent hover:bg-accent-600 active:bg-accent-700 text-white rounded-full flex items-center justify-center transition shadow-xs flex-shrink-0 ms-2 cursor-pointer"
              >
                <BiSearch size={17} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* --- FLOATING DROPDOWN POPOVERS --- */}

      {/* 1. Where Popover (Matching Image 1) */}
      {activePopover === "where" && (
        <div className="absolute top-full start-0 mt-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <WherePopover
            query={destinationText}
            onSelect={handleSelectDestination}
          />
        </div>
      )}

      {/* 2. When Popover (Matching Image 2) */}
      {activePopover === "when" && (
        <div className="absolute top-full inset-x-0 mx-auto w-fit mt-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <WhenPopover
            startDate={startDate}
            endDate={endDate}
            onSelectRange={handleSelectDateRange}
          />
        </div>
      )}

      {/* 3. Services Popover (Matching Image 3) */}
      {activePopover === "services" && (
        <div className="absolute top-full end-0 mt-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <ServicesPopover
            selectedService={selectedService}
            onSelectService={handleSelectService}
          />
        </div>
      )}

      {/* 4. Who Popover */}
      {activePopover === "who" && (
        <div className="absolute top-full end-0 mt-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <WhoPopover
            guestCount={guestCount}
            onChangeGuests={setGuestCount}
          />
        </div>
      )}
    </div>
  );
}
