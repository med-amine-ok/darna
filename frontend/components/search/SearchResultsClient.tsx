"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useTranslations } from "next-intl";
import { TbAdjustmentsHorizontal, TbMap, TbList } from "react-icons/tb";
import { Listing, User, ListingVertical, Trip } from "@/types";
import ListingCard from "@/components/listing/ListingCard";
import TripCard from "@/components/trips/TripCard";
import EmptyState from "@/components/EmptyState";
import { useFilterModal } from "@/hook/useFilterModal";
import { useSearchModal } from "@/hook/useSearchModal";
import { BiSearch } from "react-icons/bi";
import { Compass } from "lucide-react";

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
  const initialSelectedId = searchParams?.get("selectedId") || searchParams?.get("listingId") || null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [searchAsMoveMap, setSearchAsMoveMap] = useState(true);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Sync selectedId if searchParams change
  React.useEffect(() => {
    const sId = searchParams?.get("selectedId") || searchParams?.get("listingId") || null;
    if (sId) {
      setSelectedId(sId);
    }
  }, [searchParams]);

  // Dynamically filter listings within the visible map area when zoom in / out
  const displayListings = useMemo(() => {
    let list = listings;

    if (searchAsMoveMap && mapBounds) {
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
  }, [listings, selectedId, searchAsMoveMap, mapBounds]);

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
    { id: "all", label: "All Stays & Rentals", icon: "✦" },
    { id: "home", label: "Homes", imgSrc: "/assets/house.png" },
    { id: "vehicle", label: "Vehicles 4x4", imgSrc: "/assets/car.png" },
    { id: "experience", label: "Experiences", imgSrc: "/assets/location.png" },
    { id: "trip", label: "Agency Circuits", isCompass: true },
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
                <BiSearch size={15} className="text-accent" />
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
                      {tab.imgSrc ? (
                        <Image
                          src={tab.imgSrc}
                          alt={tab.label}
                          width={14}
                          height={14}
                          className={`object-contain ${isActive ? "brightness-0 invert" : ""}`}
                        />
                      ) : (tab as any).isCompass ? (
                        <Compass
                          size={13}
                          className={isActive ? "text-white" : "text-secondary"}
                        />
                      ) : (
                        <span className="me-0.5">{tab.icon}</span>
                      )}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Quick Filters + Filters Modal Button */}
            <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
              {/* Instant Book toggle pill */}
              <button
                type="button"
                onClick={() =>
                  updateQuery({ instantBook: instantBookFilter ? undefined : "true" })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  instantBookFilter
                    ? "border-primary bg-primary text-white"
                    : "border-tertiary/80 bg-white text-neutral-700 hover:border-primary"
                }`}
              >
                Instant Book
              </button>

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

              {/* Under 15,000 DZD pill */}
              <button
                type="button"
                onClick={() =>
                  updateQuery({
                    maxPrice: maxPriceFilter === "15000" ? undefined : "15000",
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  maxPriceFilter === "15000"
                    ? "border-primary bg-primary text-white"
                    : "border-tertiary/80 bg-white text-neutral-700 hover:border-primary"
                }`}
              >
                Under 15k DZD
              </button>

              {/* Extended Filters Button */}
              <button
                type="button"
                onClick={filterModal.onOpen}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-tertiary/80 text-xs font-bold text-primary hover:border-primary bg-white shadow-xs transition cursor-pointer"
              >
                <TbAdjustmentsHorizontal size={15} />
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
                  {destination
                    ? `Stays & rentals in ${destination}, Algeria`
                    : "All stays, vehicles & experiences in Algeria"}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {mapBounds && searchAsMoveMap && displayListings.length !== listings.length
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

            {/* Selected listing highlight indicator if clicked from home */}
            {selectedId && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-xl text-xs text-primary">
                <span className="font-semibold text-accent flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Focused property selected & pinned on map
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-neutral-500 hover:text-primary text-[11px] underline cursor-pointer"
                >
                  Show all
                </button>
              </div>
            )}

            {/* Empty State or Listing Cards Grid */}
            {currentVertical === "trip" ? (
              trips.length === 0 ? (
                <EmptyState
                  title="No agency circuits found"
                  subtitle="Try selecting another destination or clear filters to view all trips."
                  showReset
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {trips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
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
              currentUser={currentUser}
              selectedListingId={selectedId}
              hoveredListingId={hoveredId}
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
              <TbList size={18} />
              <span>Show list</span>
            </>
          ) : (
            <>
              <TbMap size={18} />
              <span>Show map</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
