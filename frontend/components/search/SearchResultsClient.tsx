"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useTranslations } from "next-intl";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { useDestinationLabel } from "@/hook/useDestinationLabel";
import { Listing, User, ListingVertical, Trip } from "@/types";
import { getTripCoordinates } from "@/lib/trip-coordinates";
import { useShowTotalPrice } from "@/hook/useShowTotalPrice";
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

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

// Dynamically import Leaflet map with ssr: false
function MapLoading() {
  const t = useTranslations("search");
  return (
    <div
      role="status"
      className="w-full h-full min-h-[450px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/70 text-sm font-semibold border border-tertiary/40"
    >
      {t("loadingMap")}
    </div>
  );
}

const SearchMap = dynamic(() => import("./SearchMap"), {
  ssr: false,
  loading: () => <MapLoading />,
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
  const openFilterModal = useFilterModal((s) => s.onOpen);
  const openSearchModal = useSearchModal((s) => s.onOpen);
  const tCommon = useTranslations("common");
  const t = useTranslations("search");
  const destinationLabel = useDestinationLabel();
  const place = destination ? destinationLabel(destination) : "";

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showTotalPrice, setShowTotalPrice] = useShowTotalPrice();
  const hasSearchDates = Boolean(
    (searchParams?.get("startDate") || searchParams?.get("checkIn")) &&
      (searchParams?.get("endDate") || searchParams?.get("checkOut"))
  );
  const initialSelectedId =
    searchParams?.get("selectedId") ||
    searchParams?.get("listingId") ||
    searchParams?.get("tripId") ||
    null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  // Full-screen mobile map is a modal overlay: focus trap, Escape returns to the list.
  const mobileMapOpen = showMobileMap && !isDesktop;
  const mapOverlayRef = useDialogA11y<HTMLDivElement>(mobileMapOpen, {
    onEscape: () => setShowMobileMap(false),
  });

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
    (newParams: qs.StringifiableRecord) => {
      let currentQuery: qs.StringifiableRecord = {};
      if (searchParams) {
        currentQuery = qs.parse(searchParams.toString());
      }

      const updated: qs.StringifiableRecord = {
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
    { id: "all", label: t("tabs.all"), icon: PremiumStarIcon },
    { id: "home", label: t("tabs.home"), icon: CategoryHouseIcon },
    { id: "hotel", label: t("tabs.hotel"), icon: CategoryHotelIcon },
    { id: "vehicle", label: t("tabs.vehicle"), icon: CategoryVehicleIcon },
    { id: "experience", label: t("tabs.experience"), icon: BrandPinIcon },
    { id: "trip", label: t("tabs.trip"), icon: BrandCompassIcon },
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
                onClick={openSearchModal}
                className={`flex items-center gap-2 py-1.5 px-3.5 rounded-full border border-tertiary bg-white hover:border-primary text-xs sm:text-sm font-semibold text-primary shadow-xs hover:shadow-sm transition cursor-pointer flex-shrink-0 ${focusRing}`}
              >
                <BrandSearchIcon size={15} className="text-accent" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  {place || t("algeria")}
                </span>
                <span className="text-tertiary" aria-hidden="true">|</span>
                <span className="text-neutral-600 font-normal">{t("editSearch")}</span>
              </button>

              {/* Vertical Pills */}
              <div
                role="group"
                aria-label={t("tabsLabel")}
                className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full flex-shrink-0"
              >
                {verticalTabs.map((tab) => {
                  const isActive =
                    (tab.id === "all" && !currentVertical) ||
                    currentVertical === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() =>
                        updateQuery({
                          vertical: tab.id === "all" ? undefined : tab.id,
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer select-none ${focusRing} ${
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
                aria-pressed={guestFavoriteFilter}
                onClick={() =>
                  updateQuery({
                    isGuestFavorite: guestFavoriteFilter ? undefined : "true",
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${focusRing} ${
                  guestFavoriteFilter
                    ? "border-primary bg-primary text-white"
                    : "border-tertiary/80 bg-white text-neutral-700 hover:border-primary"
                }`}
              >
                {t("guestFavorites")}
              </button>
              {/* Extended Filters Button */}
              <button
                type="button"
                onClick={openFilterModal}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-tertiary/80 text-xs font-bold text-primary hover:border-primary bg-white shadow-xs transition cursor-pointer ${focusRing}`}
              >
                <BrandFilterIcon size={15} />
                <span>{tCommon("filters")}</span>
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
                    ? place
                      ? t("heading.tripsIn", { place })
                      : t("heading.trips")
                    : currentVertical === "hotel"
                    ? place
                      ? t("heading.hotelsIn", { place })
                      : t("heading.hotels")
                    : place
                    ? t("heading.staysIn", { place })
                    : t("heading.all")}
                </h1>
                <p className="text-xs text-neutral-600 mt-0.5" role="status">
                  {currentVertical === "trip"
                    ? mapBounds && searchAsMoveMap && displayTrips.length !== trips.length
                      ? t("count.tripsInMap", { count: displayTrips.length, total: trips.length })
                      : t("count.trips", { count: trips.length })
                    : mapBounds && searchAsMoveMap && displayListings.length !== listings.length
                    ? t("count.listingsInMap", { count: displayListings.length, total: listings.length })
                    : t("count.listings", { count: listings.length })}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
              {/* Display total price (incl. fees) for the searched dates */}
              {currentVertical !== "trip" && (
                <label
                  className="flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer select-none"
                  title={hasSearchDates ? undefined : t("addDatesForTotal")}
                >
                  <input
                    type="checkbox"
                    checked={showTotalPrice}
                    onChange={(e) => setShowTotalPrice(e.target.checked)}
                    className="w-3.5 h-3.5 accent-accent rounded text-accent"
                  />
                  <span>{hasSearchDates ? t("showTotalPrice") : t("showTotalPriceAddDates")}</span>
                </label>
              )}
              {/* Pan Behavior Note */}
              <label className="hidden sm:flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={searchAsMoveMap}
                  onChange={(e) => setSearchAsMoveMap(e.target.checked)}
                  className="w-3.5 h-3.5 accent-accent rounded text-accent"
                />
                <span>{t("searchAsMapMoves")}</span>
              </label>
              </div>
            </div>

            {/* Empty State or Listing Cards Grid */}
            {currentVertical === "trip" ? (
              displayTrips.length === 0 ? (
                <EmptyState
                  title={t("empty.trips")}
                  subtitle={t("empty.tripsDesc")}
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
                title={t("empty.listings")}
                subtitle={t("empty.listingsDesc")}
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
            ref={mapOverlayRef}
            role={mobileMapOpen ? "dialog" : undefined}
            aria-modal={mobileMapOpen ? true : undefined}
            aria-label={mobileMapOpen ? t("mapDialogLabel") : undefined}
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
            {/* Close control inside the full-screen mobile map */}
            {showMobileMap && (
              <div className="lg:hidden absolute bottom-20 inset-x-0 z-[600] flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={() => setShowMobileMap(false)}
                  className={`pointer-events-auto bg-primary text-white font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 select-none ${focusRing}`}
                >
                  <BrandListIcon size={18} />
                  <span>{t("showList")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Floating Mobile Toggle: "Show map" (the overlay has its own "Show list") */}
      {!showMobileMap && (
        <div className="lg:hidden fixed bottom-20 inset-x-0 z-50 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={() => setShowMobileMap(true)}
            className={`pointer-events-auto bg-primary text-white font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 select-none ${focusRing}`}
          >
            <BrandMapIcon size={18} />
            <span>{t("showMap")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
