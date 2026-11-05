"use client";

import React, { useState, useCallback, useEffect, useId, useMemo } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useLocale, useTranslations } from "next-intl";
import { useFilterModal } from "@/hook/useFilterModal";
import Counter from "@/components/inputs/Counter";
import { Accordion, Button, Chip, Dialog, Input, Sheet, IconButton, cn, useIsPhone, useIsRtl } from "@/components/ui";
import { useSearchFacets, matchesFilters, matchesListing, matchesTrip, parseSideFilters } from "@/components/search/searchFacets";
import { EXPERIENCE_TYPES, TRIP_TYPES, experienceTypeLabel, tripTypeLabel } from "@/lib/catalog-types";
import { BrandCloseIcon, BrandWifiIcon, BrandKitchenIcon, BrandWaterIcon, BrandAcIcon, BrandSunIcon, BrandFlameIcon, CategoryRiadIcon } from "@/components/icons";

import PriceRange, { priceStats } from "@/components/search/PriceRange";

/**
 * Filters for phones and tablets (the desktop sidebar is SearchFilterSidebar): kit Sheet on
 * phones, kit Dialog from `sm` up. The sections follow the category in the URL:
 * stays (price, type, amenities, rooms), experiences (price + canonical experience types),
 * trips (price + canonical trip types), vehicles (price). Types come from lib/catalog-types,
 * counts and "Show N" use the same matchers as the sidebar.
 */
export default function FilterModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = useFilterModal((s) => s.isOpen);
  const closeFilterModal = useFilterModal((s) => s.onClose);
  const allPool = useSearchFacets((s) => s.pool);
  const tripPool = useSearchFacets((s) => s.tripPool);
  const isPhone = useIsPhone();
  const locale = useLocale();
  const vertical = searchParams?.get("vertical") || "";
  const isTrips = vertical === "trip";
  const isExperiences = vertical === "experience";
  const isVehicles = vertical === "vehicle";
  const isStays = !isTrips && !isExperiences && !isVehicles;
  // Price stats and counts come from the results of the current category.
  const pool = useMemo(
    () => (vertical && !isTrips ? allPool.filter((f) => f.vertical === vertical) : allPool),
    [allPool, vertical, isTrips]
  );
  const tCommon = useTranslations("common");
  const t = useTranslations("filters");
  const tAmenities = useTranslations("amenities");
  const titleId = useId();

  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [roomCount, setRoomCount] = useState<number>(1);
  const [bathroomCount, setBathroomCount] = useState<number>(1);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [expTypes, setExpTypes] = useState<string[]>([]);
  const [tripTypes, setTripTypes] = useState<string[]>([]);

  // Re-sync with the URL each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setMinPrice(searchParams?.get("minPrice") || "");
    setMaxPrice(searchParams?.get("maxPrice") || "");
    setRoomCount(searchParams?.get("roomCount") ? parseInt(searchParams.get("roomCount")!, 10) : 1);
    setBathroomCount(searchParams?.get("bathroomCount") ? parseInt(searchParams.get("bathroomCount")!, 10) : 1);
    setSelectedPropertyType(searchParams?.get("propertyType") || "any");
    setSelectedAmenities(searchParams?.get("amenities") ? searchParams.get("amenities")!.split(",") : []);
    setExpTypes(searchParams?.get("expType") ? searchParams.get("expType")!.split(",") : []);
    setTripTypes(searchParams?.get("tripType") ? searchParams.get("tripType")!.split(",") : []);
  }, [isOpen, searchParams]);

  // `id` is the value sent in the URL; the label is translated.
  const propertyTypes = [
    { id: "any", label: t("anyStayType") },
    { id: "Entire home", label: t("entireHome") },
    { id: "Private room", label: t("privateRoom") },
    { id: "Hotel", label: t("hotelResort") },
    { id: "Hostel", label: t("hostelDorms") },
    { id: "Villa", label: t("villa") },
    { id: "Riad", label: t("riad") },
    { id: "Apartment", label: t("apartment") },
  ];

  const amenitiesList = [
    { id: "wifi", key: "wifi", Icon: BrandWifiIcon },
    { id: "kitchen", key: "kitchen", Icon: BrandKitchenIcon },
    { id: "pool", key: "pool", Icon: BrandWaterIcon },
    { id: "freeParking", key: "freeParking", Icon: null },
    { id: "airConditioning", key: "airConditioning", Icon: BrandAcIcon },
    { id: "seaView", key: "seaView", Icon: BrandSunIcon },
    { id: "fireplace", key: "fireplace", Icon: BrandFlameIcon },
    { id: "courtyard", key: "courtyard", Icon: CategoryRiadIcon },
  ];

  // Slider bounds + histogram from the published pool.
  const { floor, ceil, histogram } = useMemo(
    () => priceStats((isTrips ? tripPool : pool).map((f) => f.price)),
    [isTrips, tripPool, pool]
  );

  const low = Math.min(Math.max(Number(minPrice) || floor, floor), ceil);
  const high = Math.max(Math.min(Number(maxPrice) || ceil, ceil), floor);

  // Sidebar-only filters (destinations, rating) stay applied while the modal edits the rest.
  const base = useMemo(() => parseSideFilters((k) => searchParams?.get(k)), [searchParams]);

  // Filters as they would be after "Show", for the experience and trip counts.
  const pending = useMemo(
    () => ({
      ...base,
      minPrice: Number(minPrice) || undefined,
      maxPrice: Number(maxPrice) || undefined,
      expTypes,
      tripTypes,
    }),
    [base, minPrice, maxPrice, expTypes, tripTypes]
  );
  const expCount = (id: string) =>
    pool.filter((f) => f.expType === id && matchesListing(f, pending, "expTypes")).length;
  const tripCount = (id: string) =>
    tripPool.filter((f) => f.tripType === id && matchesTrip(f, pending, "tripTypes")).length;

  const estimate = useMemo(() => {
    if (isTrips) return tripPool.length ? tripPool.filter((f) => matchesTrip(f, pending)).length : null;
    if (isExperiences || isVehicles) return pool.length ? pool.filter((f) => matchesListing(f, pending)).length : null;
    if (pool.length === 0) return null;
    return pool.filter((f) =>
      matchesFilters(f, {
        minPrice: Number(minPrice) || undefined,
        maxPrice: Number(maxPrice) || undefined,
        propertyType: selectedPropertyType,
        amenities: selectedAmenities,
        minBedrooms: roomCount,
        minBathrooms: bathroomCount,
      }, base)
    ).length;
  }, [isTrips, isExperiences, isVehicles, tripPool, pending, pool, minPrice, maxPrice, selectedPropertyType, selectedAmenities, roomCount, bathroomCount, base]);

  const toggleAmenity = (item: string) =>
    setSelectedAmenities((prev) => (prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]));

  const handleReset = () => {
    setMinPrice("");
    setMaxPrice("");
    setRoomCount(1);
    setBathroomCount(1);
    setSelectedPropertyType("any");
    setSelectedAmenities([]);
    setExpTypes([]);
    setTripTypes([]);
  };
  const toggleIn = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));

  const onSubmit = useCallback(() => {
    const updatedQuery: qs.StringifiableRecord = { ...(searchParams ? qs.parse(searchParams.toString()) : {}) };

    if (minPrice) updatedQuery.minPrice = minPrice;
    else delete updatedQuery.minPrice;
    if (maxPrice) updatedQuery.maxPrice = maxPrice;
    else delete updatedQuery.maxPrice;
    if (roomCount > 1) updatedQuery.roomCount = roomCount;
    else delete updatedQuery.roomCount;
    if (bathroomCount > 1) updatedQuery.bathroomCount = bathroomCount;
    else delete updatedQuery.bathroomCount;
    if (selectedPropertyType && selectedPropertyType !== "any") updatedQuery.propertyType = selectedPropertyType;
    else delete updatedQuery.propertyType;
    if (isStays && selectedAmenities.length > 0) updatedQuery.amenities = selectedAmenities.join(",");
    else delete updatedQuery.amenities;
    if (!isStays) {
      delete updatedQuery.propertyType;
      delete updatedQuery.roomCount;
      delete updatedQuery.bathroomCount;
    }
    if (isExperiences && expTypes.length) updatedQuery.expType = expTypes.join(",");
    else delete updatedQuery.expType;
    if (isTrips && tripTypes.length) updatedQuery.tripType = tripTypes.join(",");
    else delete updatedQuery.tripType;

    closeFilterModal();
    router.push(qs.stringifyUrl({ url: "/search", query: updatedQuery }, { skipNull: true }), { scroll: false });
  }, [searchParams, minPrice, maxPrice, roomCount, bathroomCount, selectedPropertyType, selectedAmenities, isStays, isExperiences, isTrips, expTypes, tripTypes, closeFilterModal, router]);

  const typeChips = (
    ids: readonly string[],
    selected: string[],
    onToggle: (id: string) => void,
    labelOf: (id: string, locale: string) => string,
    countOf: (id: string) => number
  ) => (
    <div className="flex flex-wrap gap-2 pb-5">
      {ids.map((id) => (
        <Chip key={id} selected={selected.includes(id)} onSelectedChange={() => onToggle(id)}>
          {labelOf(id, locale)}
          <span className="ms-1.5 tabular-nums opacity-80">{countOf(id)}</span>
        </Chip>
      ))}
    </div>
  );

  const allSections = [
    {
      id: "expTypes",
      title: t("sidebar.experienceType"),
      show: isExperiences,
      content: typeChips(EXPERIENCE_TYPES, expTypes, toggleIn(setExpTypes), experienceTypeLabel, expCount),
    },
    {
      id: "tripTypes",
      title: t("sidebar.tripType"),
      show: isTrips,
      content: typeChips(TRIP_TYPES, tripTypes, toggleIn(setTripTypes), tripTypeLabel, tripCount),
    },
    {
      id: "price",
      show: true,
      title: t("priceRange"),
      subtitle: isExperiences || isTrips ? t("priceRangePerPersonSubtitle") : t("priceRangeSubtitle"),
      content: (
        <div className="space-y-5 pb-5">
          <PriceRange
            floor={floor}
            ceil={ceil}
            low={low}
            high={high}
            histogram={histogram}
            minLabel={t("minimum")}
            maxLabel={t("maximum")}
            onChange={(lo, hi) => {
              setMinPrice(lo <= floor ? "" : String(lo));
              setMaxPrice(hi >= ceil ? "" : String(hi));
            }}
          />
          <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
            <Input
              label={t("minimum")}
              type="number"
              inputMode="numeric"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={String(floor)}
              prefix={tCommon("currencySymbol")}
            />
            <Input
              label={t("maximum")}
              type="number"
              inputMode="numeric"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={String(ceil)}
              prefix={tCommon("currencySymbol")}
            />
          </div>
        </div>
      ),
    },
    {
      id: "type",
      show: isStays,
      title: t("propertyType"),
      content: (
        <div className="flex flex-wrap gap-2 pb-5">
          {propertyTypes.map((pt) => (
            <Chip key={pt.id} selected={selectedPropertyType === pt.id} onSelectedChange={() => setSelectedPropertyType(pt.id)}>
              {pt.label}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      id: "amenities",
      show: isStays,
      title: t("amenities"),
      content: (
        <div className="flex flex-wrap gap-2 pb-5">
          {amenitiesList.map(({ id, key, Icon }) => (
            <Chip key={id} selected={selectedAmenities.includes(id)} onSelectedChange={() => toggleAmenity(id)} icon={Icon ? <Icon size={16} /> : undefined}>
              {tAmenities(key)}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      id: "rooms",
      show: isStays,
      title: t("roomsAndBeds"),
      content: (
        <div className="space-y-5 pb-5">
          <Counter title={t("bedrooms")} subtitle={t("bedroomsSubtitle")} value={roomCount} onChange={setRoomCount} />
          <Counter title={t("bathrooms")} subtitle={t("bathroomsSubtitle")} value={bathroomCount} onChange={setBathroomCount} />
        </div>
      ),
    },
  ];

  const sections = allSections.filter((s) => s.show).map(({ show: _show, ...s }) => s);
  const body = (
    <Accordion
      type="multiple"
      appearance="plain"
      defaultOpen={["expTypes", "tripTypes", "price", "type", "amenities"]}
      items={sections}
    />
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={handleReset} className="-ms-3 underline underline-offset-4">
        {tCommon("clearAll")}
      </Button>
      <Button variant="secondary" size="lg" onClick={onSubmit} className="min-w-[10rem]">
        {estimate === null
          ? tCommon("showListings")
          : isStays
            ? t("showStays", { count: estimate })
            : t("showResults", { count: estimate })}
      </Button>
    </div>
  );

  if (isPhone) {
    return (
      <Sheet isOpen={isOpen} onClose={closeFilterModal} title={tCommon("filters")} footer={footer} bodyClassName="py-1">
        {body}
      </Sheet>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={closeFilterModal}
      ariaLabel={tCommon("filters")}
      className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-e4 sm:max-w-2xl"
    >
      <header className="relative flex shrink-0 items-center justify-center border-b border-primary/[0.08] px-6 py-4">
        <IconButton label={tCommon("close")} icon={<BrandCloseIcon size={18} />} onClick={closeFilterModal} size="sm" className="!absolute start-4" />
        <h2 id={titleId} className="font-serif text-heading text-primary-900">
          {tCommon("filters")}
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-1">{body}</div>
      <div className="shrink-0 border-t border-primary/[0.08] bg-white px-6 py-4">{footer}</div>
    </Dialog>
  );
}
