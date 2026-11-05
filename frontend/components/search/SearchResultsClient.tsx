"use client";

import React, { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, Link } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, LazyMotion, m } from "framer-motion";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { useDestinationLabel } from "@/hook/useDestinationLabel";
import { Listing, User, ListingVertical, Trip } from "@/types";
import { getTripCoordinates } from "@/lib/trip-coordinates";
import { useShowTotalPrice } from "@/hook/useShowTotalPrice";
import ListingCard from "@/components/listing/ListingCard";
import TripCard from "@/components/trips/TripCard";
import { useFilterModal } from "@/hook/useFilterModal";
import { Chip, Switch, KitEmptyState, Button, cn, useMediaQuery } from "@/components/ui";
import { dur, ease, spring } from "@/lib/motion";
import { nearbyDestinations } from "./destinations";
import type { MapBounds } from "./SearchMap";
import { FILTER_PARAMS, countSideFilters, parseSideFilters, useSearchFacets, type ListingFacet, type TripFacet } from "./searchFacets";
import { communeLabel, findWilaya, wilayaLabel } from "@/lib/algeria";
import SearchFilterSidebar from "./SearchFilterSidebar";
import {
  PremiumStarIcon,
  BrandFilterIcon,
  BrandCompassIcon,
  BrandMapIcon,
  BrandListIcon,
  CategoryHouseIcon,
  CategoryHotelIcon,
  CategoryVehicleIcon,
  BrandPinIcon,
  BrandLightningIcon,
  BrandWifiIcon,
  BrandWaterIcon,
  BrandAcIcon,
  BrandSunIcon,
  GuestFavoriteIcon,
  BrandTagIcon,
} from "@/components/icons";

/** Layout + drag features, loaded lazily on top of the root `domAnimation` set. */
const loadMaxFeatures = () => import("framer-motion").then((mod) => mod.domMax);

function MapLoading() {
  const t = useTranslations("search");
  return (
    <div role="status" className="skeleton flex h-full w-full items-center justify-center rounded-3xl text-meta font-semibold text-primary-600">
      <span className="relative z-[1]">{t("loadingMap")}</span>
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
  /** Listings of this search before the filter-modal filters (histogram + live count). */
  facets?: ListingFacet[];
  /** Same for trips (sidebar counts). */
  tripFacets?: TripFacet[];
  /** Results per category for the same search (sidebar "Category"). */
  categoryCounts?: Record<string, number>;
}

/** Quick amenity chips: `id` is the value sent in `?amenities=`, `key` the label in `amenities`. */
const QUICK_AMENITIES = [
  { id: "wifi", key: "wifi", Icon: BrandWifiIcon },
  { id: "pool", key: "pool", Icon: BrandWaterIcon },
  { id: "airConditioning", key: "airConditioning", Icon: BrandAcIcon },
  { id: "seaView", key: "seaView", Icon: BrandSunIcon },
] as const;

function inBounds(coords: unknown, b: MapBounds): boolean {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lat, lng] = coords as [number, number];
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export default function SearchResultsClient({
  listings,
  trips = [],
  currentUser,
  destination,
  activeVertical,
  facets,
  tripFacets,
  categoryCounts,
}: SearchResultsClientProps) {
  const setFacetPool = useSearchFacets((s) => s.setPool);
  useEffect(() => {
    setFacetPool(facets ?? [], tripFacets ?? []);
    return () => setFacetPool([], []);
  }, [facets, tripFacets, setFacetPool]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const openFilterModal = useFilterModal((s) => s.onOpen);
  const tCommon = useTranslations("common");
  const tAmenities = useTranslations("amenities");
  const t = useTranslations("search");
  const locale = useLocale();
  const destinationLabel = useDestinationLabel();
  // Sidebar from lg (CSS), map panel from xl; below xl the map opens full screen.
  const isWide = useMediaQuery("(min-width: 1280px)");
  const [isPending, startTransition] = useTransition();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showTotalPrice, setShowTotalPrice] = useShowTotalPrice();
  const hasSearchDates = Boolean(
    (searchParams?.get("startDate") || searchParams?.get("checkIn")) && (searchParams?.get("endDate") || searchParams?.get("checkOut"))
  );
  const urlSelectedId = searchParams?.get("selectedId") || searchParams?.get("listingId") || searchParams?.get("tripId") || null;
  const [selectedId, setSelectedId] = useState<string | null>(urlSelectedId);
  useEffect(() => {
    if (urlSelectedId) setSelectedId(urlSelectedId);
  }, [urlSelectedId]);

  const [showMobileMap, setShowMobileMap] = useState(false);
  const mobileMapOpen = showMobileMap && !isWide;
  const mapOverlayRef = useDialogA11y<HTMLDivElement>(mobileMapOpen, { onEscape: () => setShowMobileMap(false) });

  const [searchAsMoveMap, setSearchAsMoveMap] = useState(true);
  // Only set after the user moves the map (SearchMap never reports programmatic fits).
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  // New results → the map refits, so forget the old area.
  useEffect(() => setMapBounds(null), [listings, trips]);
  const mapVisible = isWide || mobileMapOpen;
  const boundsActive = Boolean(searchAsMoveMap && mapBounds && mapVisible);

  const currentVertical = (searchParams?.get("vertical") as ListingVertical) || activeVertical;
  const isTrips = currentVertical === "trip";

  const pinFirst = useCallback(
    <T extends { id: string }>(list: T[]) => {
      if (!selectedId) return list;
      const target = list.find((x) => x.id === selectedId);
      return target ? [target, ...list.filter((x) => x.id !== selectedId)] : list;
    },
    [selectedId]
  );

  const displayListings = useMemo(() => {
    const list = boundsActive && mapBounds ? listings.filter((l) => inBounds(l.latlng, mapBounds)) : listings;
    return pinFirst(list);
  }, [listings, boundsActive, mapBounds, pinFirst]);

  const displayTrips = useMemo(() => {
    const list = boundsActive && mapBounds ? trips.filter((tr) => inBounds(tr.latlng || getTripCoordinates(tr), mapBounds)) : trips;
    return pinFirst(list);
  }, [trips, boundsActive, mapBounds, pinFirst]);

  // Quick filters from the URL.
  const instantBookFilter = searchParams?.get("instantBook") === "true";
  const guestFavoriteFilter = searchParams?.get("isGuestFavorite") === "true";
  const amenityFilters = useMemo(
    () => (searchParams?.get("amenities") ? searchParams.get("amenities")!.split(",").filter(Boolean) : []),
    [searchParams]
  );
  const side = useMemo(() => parseSideFilters((k) => searchParams?.get(k)), [searchParams]);
  // Heading place: the searched destination, else the communes or wilayas ticked in the sidebar.
  const listFormat = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  const place = destination
    ? destinationLabel(destination)
    : side.communes.length > 0 && side.communes.length <= 3
      ? listFormat.format(side.communes.map((c) => communeLabel(c, locale)))
      : side.wilayas.length > 0 && side.wilayas.length <= 3
        ? listFormat.format(side.wilayas.map((w) => { const x = findWilaya(w); return x ? wilayaLabel(x, locale) : String(w); }))
        : "";
  const activeFilterCount = countSideFilters(side);

  const updateQuery = useCallback(
    (newParams: qs.StringifiableRecord) => {
      const updated: qs.StringifiableRecord = { ...(searchParams ? qs.parse(searchParams.toString()) : {}), ...newParams };
      Object.keys(updated).forEach((k) => {
        if (updated[k] === undefined || updated[k] === null || updated[k] === "") delete updated[k];
      });
      const url = qs.stringifyUrl({ url: "/search", query: updated }, { skipNull: true });
      // Transition: the current results stay on screen (dimmed) until the new ones arrive.
      startTransition(() => router.push(url, { scroll: false }));
    },
    [searchParams, router]
  );

  const toggleAmenity = (id: string) => {
    const next = amenityFilters.includes(id) ? amenityFilters.filter((a) => a !== id) : [...amenityFilters, id];
    updateQuery({ amenities: next.length ? next.join(",") : undefined });
  };

  const clearFilters = () =>
    updateQuery({
      ...Object.fromEntries(Object.values(FILTER_PARAMS).map((k) => [k, undefined])),
      minPrice: undefined,
      maxPrice: undefined,
    });

  const hasAnyFilter = activeFilterCount > 0;

  const verticalTabs = [
    { id: "all", label: t("tabs.all"), Icon: PremiumStarIcon },
    { id: "home", label: t("tabs.home"), Icon: CategoryHouseIcon },
    { id: "hotel", label: t("tabs.hotel"), Icon: CategoryHotelIcon },
    { id: "vehicle", label: t("tabs.vehicle"), Icon: CategoryVehicleIcon },
    { id: "experience", label: t("tabs.experience"), Icon: BrandPinIcon },
    { id: "trip", label: t("tabs.trip"), Icon: BrandCompassIcon },
  ];

  // Phones: keep the selected category chip visible in the horizontally scrolling bar.
  const chipRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipRowRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"], [aria-checked="true"], [data-selected="true"]');
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    // Scroll the row only (never the page); viewport deltas also work right-to-left.
    const r = row.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    row.scrollBy({ left: c.left + c.width / 2 - (r.left + r.width / 2) });
  }, [currentVertical]);

  const heading = isTrips
    ? place
      ? t("heading.tripsIn", { place })
      : t("heading.trips")
    : currentVertical === "hotel"
      ? place
        ? t("heading.hotelsIn", { place })
        : t("heading.hotels")
      : currentVertical === "home" || currentVertical === "experience" || currentVertical === "vehicle"
        ? place
          ? t(`heading.${currentVertical}In`, { place })
          : t(`heading.${currentVertical}`)
        : place
          ? t("heading.staysIn", { place })
          : t("heading.all");

  const total = isTrips ? trips.length : listings.length;
  const shown = isTrips ? displayTrips.length : displayListings.length;
  const countText = isTrips
    ? boundsActive && shown !== total
      ? t("count.tripsInMap", { count: shown, total })
      : t("count.trips", { count: total })
    : boundsActive && shown !== total
      ? t("count.listingsInMap", { count: shown, total })
      : t("count.listings", { count: total });

  const suggestions = nearbyDestinations(destination, 4);
  const suggestionHref = (name: string) => {
    const q: Record<string, string> = { destination: name };
    if (currentVertical) q.vertical = currentVertical;
    return { pathname: "/search", query: q };
  };

  const emptyState =
    total > 0 ? (
      // Results exist, just not in the visible map area: never a blank list.
      <KitEmptyState
        compact
        variant="search"
        title={isTrips ? t("empty.trips") : t("empty.listings")}
        description={isTrips ? t("empty.tripsDesc") : t("empty.listingsDesc")}
        action={
          <Button variant="secondary" leadingIcon={<BrandListIcon size={16} />} onClick={() => setMapBounds(null)}>
            {t("empty.showAll", { count: total })}
          </Button>
        }
      />
    ) : (
      <div>
        <KitEmptyState
          compact
          variant="search"
          title={t("empty.noResults")}
          description={hasAnyFilter ? t("empty.noResultsFiltersDesc") : t("empty.noResultsDesc")}
          action={
            hasAnyFilter ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t("clearAllFilters")}
              </Button>
            ) : undefined
          }
        />
        <div className="mx-auto max-w-xl pb-6 text-center">
          <h3 className="text-eyebrow uppercase font-semibold text-primary-500">{place ? t("empty.nearby") : t("popularDestinations")}</h3>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {suggestions.map((d) => (
              <li key={d.key}>
                <Link
                  href={suggestionHref(d.name)}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-primary-800 shadow-e1 transition-[box-shadow,color] duration-fast ease-standard hover:text-primary-900 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg"
                >
                  <BrandPinIcon size={15} className="text-accent-600" aria-hidden="true" />
                  {t(`destinations.${d.key}.name`)}
                  <span className="text-meta text-primary-500">{String(d.wilaya).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );

  const cardMotion = {
    layout: "position" as const,
    initial: { opacity: 0, scale: 0.97, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
    exit: { opacity: 0, scale: 0.97, transition: { duration: dur.fast, ease: ease.standard } },
    transition: spring.layout,
  };

  const results = isTrips ? (
    displayTrips.length === 0 ? (
      emptyState
    ) : (
      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 min-[1760px]:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {displayTrips.map((trip) => (
            <m.div key={trip.id} {...cardMotion}>
              <TripCard trip={trip} onHover={setHoveredId} isHovered={hoveredId === trip.id || selectedId === trip.id} />
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    )
  ) : displayListings.length === 0 ? (
    emptyState
  ) : (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 min-[1760px]:grid-cols-3">
      <AnimatePresence initial={false} mode="popLayout">
        {displayListings.map((listing, i) => (
          <m.div key={listing.id} {...cardMotion}>
            <ListingCard
              data={listing}
              currentUser={currentUser}
              priority={i < 2}
              onHover={setHoveredId}
              isHovered={hoveredId === listing.id || selectedId === listing.id}
            />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const map = (
    <SearchMap
      listings={listings}
      trips={trips}
      currentVertical={currentVertical}
      currentUser={currentUser}
      selectedListingId={selectedId}
      hoveredListingId={hoveredId}
      isVisible={mapVisible}
      onSelectListing={setSelectedId}
      onHoverListing={setHoveredId}
      onBoundsChange={setMapBounds}
      searchAsMove={searchAsMoveMap}
      onSearchAsMoveChange={
        isWide
          ? (v) => {
              setSearchAsMoveMap(v);
              if (!v) setMapBounds(null);
            }
          : undefined
      }
    />
  );

  const totalSwitch = !isTrips && (
    <div className="flex items-center gap-2.5" title={hasSearchDates ? undefined : t("addDatesForTotal")}>
      <Switch id="search-total-price" size="sm" ariaLabel={t("showTotalPrice")} checked={showTotalPrice} onCheckedChange={setShowTotalPrice} />
      <label htmlFor="search-total-price" className="cursor-pointer whitespace-nowrap text-meta font-semibold text-primary-800">
        {t("showTotalPrice")}
      </label>
    </div>
  );

  return (
    <LazyMotion features={loadMaxFeatures}>
      <div className="flex min-h-[calc(100dvh-72px)] flex-col bg-darnaBg">
        {/* 1. Sticky glass filter bar: verticals · quick filters · all filters */}
        <div className="glass sticky top-[64px] z-30 border-b border-primary/[0.08] sm:top-[72px]">
          <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div ref={chipRowRef} role="group" aria-label={t("filterBarLabel")} className="no-scrollbar -my-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-3.5 ps-0.5 pe-4 [mask-image:linear-gradient(to_right,#000_92%,transparent)] rtl:[mask-image:linear-gradient(to_left,#000_92%,transparent)]">
              <div role="group" aria-label={t("tabsLabel")} className="flex shrink-0 items-center gap-2">
                {verticalTabs.map(({ id, label, Icon }) => {
                  const active = (id === "all" && !currentVertical) || currentVertical === id;
                  return (
                    <Chip
                      key={id}
                      selected={active}
                      onSelectedChange={() => updateQuery({ vertical: id === "all" ? undefined : id, selectedId: undefined })}
                      icon={<Icon size={16} strokeWidth={1.8} />}
                    >
                      {label}
                    </Chip>
                  );
                })}
              </div>

              <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-primary/[0.12]" />

              <Chip
                selected={guestFavoriteFilter}
                onSelectedChange={(v) => updateQuery({ isGuestFavorite: v ? "true" : undefined })}
                icon={<GuestFavoriteIcon size={16} />}
              >
                {t("guestFavorites")}
              </Chip>
              {!isTrips && (
                <>
                  <Chip
                    selected={instantBookFilter}
                    onSelectedChange={(v) => updateQuery({ instantBook: v ? "true" : undefined })}
                    icon={<BrandLightningIcon size={16} />}
                  >
                    {t("instantBook")}
                  </Chip>
                  {/* The sidebar lists amenities from lg up. */}
                  <div className="contents lg:hidden">
                    {QUICK_AMENITIES.map(({ id, key, Icon }) => (
                      <Chip key={id} selected={amenityFilters.includes(id)} onSelectedChange={() => toggleAmenity(id)} icon={<Icon size={16} />}>
                        {tAmenities(key)}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <div className="hidden xl:block">{totalSwitch}</div>
              <button
                type="button"
                onClick={openFilterModal}
                className="relative inline-flex lg:hidden h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary-900 shadow-e1 cursor-pointer transition-shadow duration-fast ease-standard hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg"
              >
                <BrandFilterIcon size={16} />
                <span className="hidden sm:inline">{tCommon("filters")}</span>
                <span className="sr-only sm:hidden">{tCommon("filters")}</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-800 px-1.5 text-[11px] font-bold tabular-nums text-white">
                    <span aria-hidden="true">{activeFilterCount}</span>
                    <span className="sr-only">{t("activeFilters", { count: activeFilterCount })}</span>
                  </span>
                )}
              </button>
            </div>
          </div>
          {/* Thin progress line while new results load (old ones stay visible). */}
          <div aria-hidden="true" className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left overflow-hidden transition-opacity duration-fast", isPending ? "opacity-100" : "opacity-0")}>
            <div className="progress-indeterminate h-full w-1/3 bg-accent-500" />
          </div>
        </div>

        {/* 2. Results · map */}
        <div className="mx-auto w-full max-w-[1920px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_minmax(0,34%)] 2xl:grid-cols-[21rem_minmax(0,1fr)_minmax(0,38%)] 2xl:gap-8">
            {/* Filter sidebar (lg+): sticky, scrolls on its own when taller than the screen. */}
            <div className="hidden lg:block">
              <SearchFilterSidebar
                isTrips={isTrips}
                vertical={currentVertical}
                categoryCounts={categoryCounts}
                onUpdate={updateQuery}
                facets={facets}
                tripFacets={tripFacets}
                className="no-scrollbar sticky top-[160px] max-h-[calc(100dvh-184px)] overflow-y-auto overscroll-contain"
              />
            </div>

            <section aria-labelledby="search-results-title" className="flex min-w-0 flex-col gap-5">
              <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <h1 id="search-results-title" className="text-balance font-serif text-heading text-primary-900">
                    {heading}
                  </h1>
                  <p className="mt-1 text-meta text-primary-600" role="status" aria-live="polite">
                    {countText}
                    {isPending && <span className="sr-only"> {t("updating")}</span>}
                  </p>
                </div>
                <div className="xl:hidden">{totalSwitch}</div>
              </header>

              {!isTrips && showTotalPrice && (
                <p className="glass-light inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-2 text-meta font-medium text-primary-800 shadow-e1">
                  <BrandTagIcon size={15} className="text-accent-600" aria-hidden="true" />
                  {hasSearchDates ? t("pricesIncludeFees") : t("addDatesForTotal")}
                </p>
              )}

              <div aria-busy={isPending} className={cn("transition-opacity duration-base ease-standard", isPending && "pointer-events-none opacity-60")}>
                {results}
              </div>
            </section>

            {/* Wide screens: map as a rounded inset panel (column reserved by CSS, no shift). */}
            <div className="hidden xl:block">
              <div className="sticky top-[160px] h-[calc(100dvh-184px)] min-h-[480px] overflow-hidden rounded-3xl shadow-e2 ring-1 ring-primary/[0.06]">
                {isWide && map}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Mobile: floating glass "Map" pill (clears the bottom nav) */}
        <AnimatePresence>
          {!isWide && !showMobileMap && (
            <m.div
              key="map-pill"
              className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex justify-center md:bottom-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
              exit={{ opacity: 0, y: 16, transition: { duration: dur.fast } }}
            >
              <m.button
                type="button"
                onClick={() => setShowMobileMap(true)}
                whileTap={{ scale: 0.96 }}
                transition={spring.press}
                className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-primary-900/90 px-5 text-sm font-semibold text-white shadow-e4 backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                <BrandMapIcon size={18} />
                {t("showMap")}
              </m.button>
            </m.div>
          )}
        </AnimatePresence>

        {/* Mobile full-screen map (modal), slides up on a spring; "Show list" returns. */}
        <AnimatePresence>
          {mobileMapOpen && (
            <m.div
              key="mobile-map"
              ref={mapOverlayRef}
              role="dialog"
              aria-modal="true"
              aria-label={t("mapDialogLabel")}
              className="fixed inset-0 z-[60] bg-darnaBg"
              initial={{ y: "100%" }}
              animate={{ y: 0, transition: spring.sheet }}
              exit={{ y: "100%", transition: { duration: dur.base, ease: ease.inOut } }}
            >
              <div className="h-[100dvh] w-full">{map}</div>
              <div className="pointer-events-none absolute inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-[600] flex justify-center">
                <m.button
                  type="button"
                  onClick={() => setShowMobileMap(false)}
                  whileTap={{ scale: 0.96 }}
                  transition={spring.press}
                  className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-primary-900/90 px-5 text-sm font-semibold text-white shadow-e4 backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                >
                  <BrandListIcon size={18} />
                  {t("showList")}
                </m.button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
