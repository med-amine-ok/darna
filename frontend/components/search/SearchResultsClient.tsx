"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useTranslations } from "next-intl";
import { Listing, User, ListingVertical, Trip } from "@/types";
import { getTripCoordinates } from "@/lib/mock-data/trips";
import ListingCard from "@/components/listing/ListingCard";
import TripCard from "@/components/trips/TripCard";
import EmptyState from "@/components/EmptyState";
import { useFilterModal } from "@/hook/useFilterModal";
import { useSearchModal } from "@/hook/useSearchModal";
import {
  PremiumStarIcon,
  BrandSearchIcon,
  BrandFilterIcon,
  BrandCompassIcon,
  BrandMapIcon,
  BrandListIcon,
  CategoryHouseIcon,
  CategoryHotelIcon,
  CategoryVehicleIcon,
  BrandPinIcon,
} from "@/components/icons";

// Dynamically import Leaflet map with ssr: false
const SearchMap = dynamic(() => import("./SearchMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/60 text-sm font-semibold border border-tertiary/40">
      Loading interactive map...
    </div>
  ),
});

interface SearchResultsClientProps {
  listings: Listing[];
  trips?: Trip[];
  currentUser?: User | null;
  destination?: string;
  activeVertical?: ListingVertical;
}

export default function SearchResultsClient({
  listings,
  trips = [],
  currentUser,
  destination,
  activeVertical,
}: SearchResultsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterModal = useFilterModal();
  const searchModal = useSearchModal();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const initialSelectedId =
    searchParams?.get("selectedId") ||
    searchParams?.get("listingId") ||
    searchParams?.get("tripId") ||
    null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [searchAsMoveMap, setSearchAsMoveMap] = useState(true);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Sync selectedId if searchParams change
  React.useEffect(() => {
    const sId =
      searchParams?.get("selectedId") ||
      searchParams?.get("listingId") ||
      searchParams?.get("tripId") ||
      null;
    if (sId) {
      setSelectedId(sId);
    }
  }, [searchParams]);

  // Dynamically filter listings within the visible map area when zoom in / out
  const displayListings = useMemo(() => {
    let list = listings;

    if (searchAsMoveMap && mapBounds && (isDesktop || showMobileMap)) {
      const inBounds = listings.filter((l) => {
        if (!l.latlng || l.latlng.length !== 2) return false;
        const [lat, lng] = l.latlng;
        return (
          lat >= mapBounds.south &&
          lat <= mapBounds.north &&
          lng >= mapBounds.west &&
          lng <= mapBounds.east
        );
      });
      list = inBounds;
    }

    if (!selectedId) return list;
    const target = list.find((l) => l.id === selectedId);
    if (!target) return list;
    return [target, ...list.filter((l) => l.id !== selectedId)];
  }, [listings, selectedId, searchAsMoveMap, mapBounds, isDesktop, showMobileMap]);

  // Dynamically filter agency trips within the visible map area
  const displayTrips = useMemo(() => {
    let list = trips;

    if (searchAsMoveMap && mapBounds && (isDesktop || showMobileMap)) {
      const inBounds = trips.filter((t) => {
        const coords = t.latlng || getTripCoordinates(t);
        if (!coords || coords.length !== 2) return false;
        const [lat, lng] = coords;
        return (
          lat >= mapBounds.south &&
          lat <= mapBounds.north &&
          lng >= mapBounds.west &&
          lng <= mapBounds.east
        );
      });
      list = inBounds;
    }

    if (!selectedId) return list;
    const target = list.find((t) => t.id === selectedId);
    if (!target) return list;
    return [target, ...list.filter((t) => t.id !== selectedId)];
  }, [trips, selectedId, searchAsMoveMap, mapBounds, isDesktop, showMobileMap]);

  // Quick filter parameters from query
  const currentVertical = (searchParams?.get("vertical") as ListingVertical) || activeVertical;
  const instantBookFilter = searchParams?.get("instantBook") === "true";
  const guestFavoriteFilter = searchParams?.get("isGuestFavorite") === "true";
  const maxPriceFilter = searchParams?.get("maxPrice");

  const updateQuery = useCallback(
    (newParams: Record<string, any>) => {
      let currentQuery: Record<string, any> = {};
      if (searchParams) {
        currentQuery = qs.parse(searchParams.toString());
      }

      const updated: Record<string, any> = {
        ...currentQuery,
        ...newParams,
      };

      // Clean up falsy/undefined keys
      Object.keys(updated).forEach((k) => {
        if (updated[k] === undefined || updated[k] === null || updated[k] === "") {
          delete updated[k];
        }
      });

      const url = qs.stringifyUrl(
        {
          url: "/search",
          query: updated,
        },
        { skipNull: true }
      );

      router.push(url);
    },
    [searchParams, router]
  );

  const verticalTabs = [
    { id: "all", label: "All Stays & Rentals", icon: PremiumStarIcon },
    { id: "home", label: "Homes", icon: CategoryHouseIcon },
    { id: "hotel", label: "Hotels / Hostels", icon: CategoryHotelIcon },
    { id: "vehicle", label: "Vehicles 4x4", icon: CategoryVehicleIcon },
    { id: "experience", label: "Experiences", icon: BrandPinIcon },
    { id: "trip", label: "Agency Circuits", icon: BrandCompassIcon },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-72px)] bg-darnaBg">
      {/* 1. Sticky Sub-Header: Search Summary & Filter Pills */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary/60 py-3 shadow-2xs">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Compact Summary Pill + Vertical Switcher */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-0.5">
              {/* Compact Search Pill (re-opens SearchModal) */}
              <button
                type="button"
                onClick={searchModal.onOpen}
                className="flex items-center gap-2 py-1.5 px-3.5 rounded-full border border-tertiary bg-white hover:border-primary text-xs sm:text-sm font-semibold text-primary shadow-xs hover:shadow-sm transition cursor-pointer flex-shrink-0"
              >
                <BrandSearchIcon size={15} className="text-accent" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  {destination || "Algeria"}
                </span>
                <span className="text-tertiary">|</span>
                <span className="text-neutral-500 font-normal">Edit search</span>
              </button>

              {/* Vertical Pills */}
              <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full flex-shrink-0">
                {verticalTabs.map((tab) => {
                  const isActive =
                    (tab.id === "all" && !currentVertical) ||
                    currentVertical === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        updateQuery({
                          vertical: tab.id === "all" ? undefined : tab.id,
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
                        isActive
                          ? "bg-primary text-white shadow-xs"
                          : "text-neutral-600 hover:text-primary hover:bg-neutral-200/60"
                      }`}
                    >
                      <Icon
                        size={14}
                        strokeWidth={1.8}
                        className={
                          isActive
                            ? "text-white"
                            : tab.id === "all"
                            ? "text-accent"
                            : tab.id === "trip"
                            ? "text-secondary"
                            : "text-neutral-600"
                        }
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Quick Filters + Filters Modal Button */}
            <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
              

              {/* Guest Favorites toggle pill */}
              <button
                type="button"
                onClick={() =>
                  updateQuery({
                    isGuestFavorite: guestFavoriteFilter ? undefined : "true",
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  guestFavoriteFilter
                    ? "border-primary bg-primary text-white"
                    : "border-tertiary/80 bg-white text-neutral-700 hover:border-primary"
                }`}
              >
                Guest Favorites
              </button>
              {/* Extended Filters Button */}
              <button
                type="button"
                onClick={filterModal.onOpen}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-tertiary/80 text-xs font-bold text-primary hover:border-primary bg-white shadow-xs transition cursor-pointer"
              >
                <BrandFilterIcon size={15} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Split: Cards Left vs Interactive Map Right */}
      <div className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* LEFT COLUMN: Listing Cards */}
          <div
            className={`lg:col-span-7 xl:col-span-7 flex flex-col space-y-4 ${
              showMobileMap ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Result Header & Counter */}
            <div className="flex items-center justify-between border-b border-tertiary/40 pb-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-primary">
                  {currentVertical === "trip"
                    ? destination
                      ? `Agency circuits & expeditions in ${destination}, Algeria`
                      : "Agency circuits & multi-day expeditions in Algeria"
                    : currentVertical === "hotel"
                    ? destination
                      ? `Hotels & hostels in ${destination}, Algeria`
                      : "Hotels & hostels in Algeria"
                    : destination
                    ? `Stays & rentals in ${destination}, Algeria`
                    : "All stays, vehicles & experiences in Algeria"}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {currentVertical === "trip"
                    ? mapBounds && searchAsMoveMap && displayTrips.length !== trips.length
                      ? `${displayTrips.length} agency circuit${displayTrips.length === 1 ? "" : "s"} visible in map area (${trips.length} total)`
                      : `${trips.length} verified agency circuit${trips.length === 1 ? "" : "s"} available`
                    : mapBounds && searchAsMoveMap && displayListings.length !== listings.length
                    ? `${displayListings.length} listing${displayListings.length === 1 ? "" : "s"} visible in map area (${listings.length} total)`
                    : `Over ${listings.length} verified listings available`}
                </p>
              </div>

              {/* Pan Behavior Note */}
              <label className="hidden sm:flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={searchAsMoveMap}
                  onChange={(e) => setSearchAsMoveMap(e.target.checked)}
                  className="w-3.5 h-3.5 accent-accent rounded text-accent"
                />
                <span>Search as I move the map</span>
              </label>
            </div>

            {/* Empty State or Listing Cards Grid */}
            {currentVertical === "trip" ? (
              displayTrips.length === 0 ? (
                <EmptyState
                  title="No agency circuits found in this map area"
                  subtitle="Zoom out or pan across Algeria to discover expeditions in the Sahara, M'zab, and coast."
                  showReset
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {displayTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onHover={(id) => setHoveredId(id)}
                      isHovered={hoveredId === trip.id || selectedId === trip.id}
                    />
                  ))}
                </div>
              )
            ) : displayListings.length === 0 ? (
              <EmptyState
                title="No listings in this map area"
                subtitle="Zoom out or pan across the map to discover listings across Algeria."
                showReset
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    data={listing}
                    currentUser={currentUser}
                    onHover={(id) => setHoveredId(id)}
                    isHovered={hoveredId === listing.id || selectedId === listing.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Real Interactive Map */}
          <div
            className={`lg:col-span-5 xl:col-span-5 h-[calc(100dvh-150px)] sticky top-[76px] rounded-3xl overflow-hidden border border-tertiary/70 shadow-md ${
              showMobileMap ? "fixed inset-0 z-40 rounded-none border-none top-0" : "hidden lg:block"
            }`}
          >
            <SearchMap
              listings={listings}
              trips={trips}
              currentVertical={currentVertical}
              currentUser={currentUser}
              selectedListingId={selectedId}
              hoveredListingId={hoveredId}
              isVisible={isDesktop || showMobileMap}
              onSelectListing={(id) => setSelectedId(id)}
              onHoverListing={(id) => setHoveredId(id)}
              onBoundsChange={(b) => setMapBounds(b)}
            />
          </div>
        </div>
      </div>

      {/* 3. Floating Mobile Toggle: "Show Map" / "Show List" */}
      <div className="lg:hidden fixed bottom-20 inset-x-0 z-50 flex justify-center pointer-events-none">
        <button
          type="button"
          onClick={() => setShowMobileMap((prev) => !prev)}
          className="pointer-events-auto bg-primary text-white font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 select-none"
        >
          {showMobileMap ? (
            <>
              <BrandListIcon size={18} />
              <span>Show list</span>
            </>
          ) : (
            <>
              <BrandMapIcon size={18} />
              <span>Show map</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
