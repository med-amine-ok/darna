"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useTranslations } from "next-intl";
import { TbAdjustmentsHorizontal, TbMap, TbList } from "react-icons/tb";
import { MdCheck } from "react-icons/md";
import { safeListing, SafeUser } from "@/types";
import ListingCard from "../listing/ListingCard";
import FeaturedListingRowCard from "./FeaturedListingRowCard";
import useFilterModal from "@/hook/useFilterModal";

// Dynamic import Leaflet map with ssr: false
const SearchMap = dynamic(() => import("./SearchMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/50 text-sm border border-tertiary/30">
      Loading map...
    </div>
  ),
});

interface SearchResultsClientProps {
  listings: safeListing[];
  currentUser?: SafeUser | null;
  title?: string;
  subtitle?: string;
}

export default function SearchResultsClient({
  listings,
  currentUser,
  title,
  subtitle,
}: SearchResultsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterModal = useFilterModal();
  const t = useTranslations("common");
  const tSearch = useTranslations("search");
  const tFilters = useTranslations("filters");

  const selectedIdFromUrl = searchParams?.get("selectedId");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(selectedIdFromUrl || null);
  const [showMobileMap, setShowMobileMap] = useState(false);

  useEffect(() => {
    if (selectedIdFromUrl) {
      setSelectedId(selectedIdFromUrl);
    }
  }, [selectedIdFromUrl]);

  const featuredListing = useMemo(() => {
    if (selectedId) {
      const found = listings.find((l) => l.id === selectedId);
      if (found) return found;
    }
    return listings[0] || null;
  }, [listings, selectedId]);

  const otherListings = useMemo(() => {
    if (!featuredListing) return listings;
    return listings.filter((l) => l.id !== featuredListing.id);
  }, [listings, featuredListing]);

  // Active quick filter dropdown state
  const [activeDropdown, setActiveDropdown] = useState<"price" | "type" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quick filter states from URL
  const currentMinPrice = searchParams?.get("minPrice") || "";
  const currentMaxPrice = searchParams?.get("maxPrice") || "";
  const currentType = searchParams?.get("propertyType") || "";
  const isInstantBook = searchParams?.get("instantBook") === "true";
  const isSuperhost = searchParams?.get("superhost") === "true";

  // Local state for dropdown inputs
  const [tempMinPrice, setTempMinPrice] = useState(currentMinPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState(currentMaxPrice);
  const [tempType, setTempType] = useState(currentType);

  // Sync temp state when dropdown opens
  useEffect(() => {
    setTempMinPrice(currentMinPrice);
    setTempMaxPrice(currentMaxPrice);
    setTempType(currentType);
  }, [currentMinPrice, currentMaxPrice, currentType, activeDropdown]);

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (currentMinPrice || currentMaxPrice) count++;
    if (currentType && currentType !== "any") count++;
    if (isInstantBook) count++;
    if (isSuperhost) count++;
    if (searchParams?.get("roomCount")) count++;
    if (searchParams?.get("bathroomCount")) count++;
    if (searchParams?.get("amenities")) count++;
    return count;
  }, [currentMinPrice, currentMaxPrice, currentType, isInstantBook, isSuperhost, searchParams]);

  // Helper to push URL query updates
  const updateQuery = useCallback(
    (newParams: Record<string, any>) => {
      const current = searchParams ? qs.parse(searchParams.toString()) : {};
      const updated = { ...current, ...newParams };

      // Remove falsy / empty keys
      Object.keys(updated).forEach((key) => {
        if (updated[key] === "" || updated[key] === null || updated[key] === undefined) {
          delete updated[key];
        }
      });

      const url = qs.stringifyUrl(
        {
          url: window.location.pathname,
          query: updated,
        },
        { skipNull: true }
      );
      router.push(url);
    },
    [router, searchParams]
  );

  const applyPrice = () => {
    updateQuery({ minPrice: tempMinPrice, maxPrice: tempMaxPrice });
    setActiveDropdown(null);
  };

  const clearPrice = () => {
    setTempMinPrice("");
    setTempMaxPrice("");
    updateQuery({ minPrice: null, maxPrice: null });
    setActiveDropdown(null);
  };

  const applyType = (typeId: string) => {
    const nextType = tempType === typeId ? "" : typeId;
    setTempType(nextType);
    updateQuery({ propertyType: nextType || null });
    setActiveDropdown(null);
  };

  const toggleInstantBook = () => {
    updateQuery({ instantBook: isInstantBook ? null : "true" });
  };

  const toggleSuperhost = () => {
    updateQuery({ superhost: isSuperhost ? null : "true" });
  };

  const clearAllFilters = () => {
    const current = searchParams ? qs.parse(searchParams.toString()) : {};
    const preserved: any = {};
    if (current.destination) preserved.destination = current.destination;
    if (current.locationValue) preserved.locationValue = current.locationValue;
    if (current.startDate) preserved.startDate = current.startDate;
    if (current.endDate) preserved.endDate = current.endDate;
    if (current.guestCount) preserved.guestCount = current.guestCount;

    const url = qs.stringifyUrl(
      {
        url: window.location.pathname,
        query: preserved,
      },
      { skipNull: true }
    );
    router.push(url);
  };

  // Header copy
  const cityName = searchParams?.get("destination") || searchParams?.get("locationValue") || "";
  const displayTitle =
    title ||
    (cityName
      ? tSearch("overHomes", {
          count: listings.length >= 1000 ? listings.length.toLocaleString() : "1,000",
          city: cityName,
        })
      : tSearch("overStays", { count: listings.length }));

  return (
    <div className="w-full flex flex-col">
      {/* 1. Quick Filters Top Bar */}
      <div className="w-full sticky top-16 sm:top-20 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar" ref={dropdownRef}>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Price Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "price" ? null : "price")}
                className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold border transition cursor-pointer select-none whitespace-nowrap ${
                  currentMinPrice || currentMaxPrice
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-800 hover:border-neutral-900 bg-white"
                }`}
              >
                {currentMinPrice || currentMaxPrice
                  ? `$${currentMinPrice || "0"} - $${currentMaxPrice || "500+"}`
                  : tSearch("price")}
              </button>

              {activeDropdown === "price" && (
                <div className="absolute top-full mt-2 start-0 z-30 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-sm font-bold text-neutral-900">{tFilters("priceRange")}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-neutral-300 rounded-xl p-2.5">
                      <span className="block text-[10px] font-bold text-neutral-400 uppercase">{tFilters("minimum")}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-500 font-semibold">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={tempMinPrice}
                          onChange={(e) => setTempMinPrice(e.target.value)}
                          className="w-full text-sm font-semibold outline-none"
                        />
                      </div>
                    </div>
                    <div className="border border-neutral-300 rounded-xl p-2.5">
                      <span className="block text-[10px] font-bold text-neutral-400 uppercase">{tFilters("maximum")}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-500 font-semibold">$</span>
                        <input
                          type="number"
                          placeholder="500+"
                          value={tempMaxPrice}
                          onChange={(e) => setTempMaxPrice(e.target.value)}
                          className="w-full text-sm font-semibold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={clearPrice}
                      className="text-xs font-semibold text-neutral-700 underline hover:text-neutral-900 cursor-pointer"
                    >
                      {tSearch("clear")}
                    </button>
                    <button
                      type="button"
                      onClick={applyPrice}
                      className="bg-neutral-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition"
                    >
                      {tSearch("apply")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Type of Place Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
                className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold border transition cursor-pointer select-none whitespace-nowrap ${
                  currentType && currentType !== "any"
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-800 hover:border-neutral-900 bg-white"
                }`}
              >
                {currentType && currentType !== "any" ? currentType : tSearch("typeOfPlace")}
              </button>

              {activeDropdown === "type" && (
                <div className="absolute top-full mt-2 start-0 z-30 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-sm font-bold text-neutral-900 mb-1">{tFilters("propertyType")}</div>
                  {["house", "apartment", "guesthouse", "hotel"].map((pt) => {
                    const active = tempType === pt;
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => applyType(pt)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
                          active ? "bg-neutral-100 text-neutral-900 font-bold" : "hover:bg-neutral-50 text-neutral-700"
                        }`}
                      >
                        <span className="capitalize flex items-center gap-2">
                          {(pt === "house" || pt === "guesthouse") && (
                            <Image
                              src="/assets/house.png"
                              alt="House"
                              width={16}
                              height={16}
                              className="w-4 h-4 object-contain inline-block"
                            />
                          )}
                          {pt}
                        </span>
                        {active && <MdCheck size={16} className="text-neutral-900" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instant Book Pill */}
            <button
              type="button"
              onClick={toggleInstantBook}
              className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold border transition cursor-pointer select-none whitespace-nowrap ${
                isInstantBook
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-800 hover:border-neutral-900 bg-white"
              }`}
            >
              {tSearch("instantBook")}
            </button>

            {/* Superhost Pill */}
            <button
              type="button"
              onClick={toggleSuperhost}
              className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold border transition cursor-pointer select-none whitespace-nowrap ${
                isSuperhost
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-800 hover:border-neutral-900 bg-white"
              }`}
            >
              {tSearch("superhost")}
            </button>
          </div>

          {/* Full Filters Modal Button */}
          <button
            type="button"
            onClick={filterModal.onOpen}
            className="flex items-center gap-2 py-2 px-4 rounded-full border border-neutral-300 hover:border-neutral-900 text-xs sm:text-sm font-semibold text-neutral-800 bg-white shadow-2xs transition cursor-pointer select-none flex-shrink-0 ms-auto"
          >
            <TbAdjustmentsHorizontal size={16} />
            <span>{t("filters")}</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Content Split View */}
      <div className="w-full max-w-[1720px] mx-auto flex flex-col lg:flex-row">
        {/* Left Column: Listings Scrollable Area */}
        <div className={`w-full lg:w-7/12 xl:w-3/5 px-4 sm:px-8 py-6 flex flex-col ${showMobileMap ? "hidden lg:flex" : "flex"}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary">{displayTitle}</h1>
              {subtitle ? (
                <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
              ) : (
                <p className="text-sm text-neutral-500 mt-0.5">
                  {tSearch("staysCount", { count: listings.length })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 px-3.5 py-1.5 rounded-full border border-tertiary shadow-2xs">
              <span className="text-accent text-sm">🏷️</span>
              <span>{t("pricesIncludeFees") || "Prices include all fees"}</span>
            </div>
          </div>

          {/* Empty State */}
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h3 className="text-lg font-bold text-neutral-900">{tSearch("noHomesFound")}</h3>
              <p className="text-sm text-neutral-500 mt-1 max-w-md">{tSearch("noHomesFoundDesc")}</p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-6 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-sm font-semibold transition cursor-pointer shadow-sm"
              >
                {tSearch("clearAllFilters")}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured Clicked Item (Top Card matching Screenshot 1) */}
              {featuredListing && (
                <div>
                  <FeaturedListingRowCard
                    listing={featuredListing}
                    currentUser={currentUser}
                    onClick={() => router.push(`/listings/${featuredListing.id}`)}
                  />
                </div>
              )}

              {/* Other Suggestions in the same city (Matching Screenshot 1) */}
              {otherListings.length > 0 && (
                <div className="space-y-4">
                  {featuredListing && (
                    <h2 className="text-lg font-bold text-neutral-900">
                      Other suggestions in {cityName || "Paris"}
                    </h2>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                    {otherListings.map((item) => (
                      <div
                        key={item.id}
                        id={`listing-item-${item.id}`}
                        className="transition-transform duration-200"
                      >
                        <ListingCard
                          data={item}
                          currentUser={currentUser}
                          onHover={setHoveredId}
                          isHovered={hoveredId === item.id || selectedId === item.id}
                          onClick={() => router.push(`/listings/${item.id}`)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Interactive Search Map */}
        <div
          className={`w-full lg:w-5/12 xl:w-2/5 lg:sticky lg:top-36 h-[calc(100vh-9rem)] p-4 ${
            showMobileMap ? "fixed inset-0 top-32 z-30 bg-white p-2" : "hidden lg:block"
          }`}
        >
          <SearchMap
            listings={listings}
            currentUser={currentUser}
            selectedListingId={selectedId}
            hoveredListingId={hoveredId}
            onSelectListing={(id) => {
              setSelectedId(id);
              if (id) {
                const el = document.getElementById(`listing-item-${id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
            onHoverListing={setHoveredId}
            className="w-full h-full shadow-md border border-neutral-200"
          />
        </div>
      </div>

      {/* 3. Mobile Floating Toggle Map/List Pill */}
      <div className="lg:hidden fixed bottom-6 inset-x-0 mx-auto w-fit z-40">
        <button
          type="button"
          onClick={() => setShowMobileMap((prev) => !prev)}
          className="bg-neutral-900 hover:bg-black text-white font-semibold text-xs sm:text-sm px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer transition active:scale-95"
        >
          {showMobileMap ? (
            <>
              <span>{tSearch("hideMap")}</span>
              <TbList size={18} />
            </>
          ) : (
            <>
              <span>{tSearch("showMap")}</span>
              <Image
                src="/assets/location.png"
                alt=""
                width={14}
                height={20}
                className="object-contain inline-block"
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
