"use client";

import React, { useState, useCallback, useId } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useFilterModal } from "@/hook/useFilterModal";
import Modal from "./Modal";
import Counter from "@/components/inputs/Counter";
import { useTranslations } from "next-intl";
import { CategoryHouseIcon } from "@/components/icons";

export default function FilterModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = useFilterModal((s) => s.isOpen);
  const closeFilterModal = useFilterModal((s) => s.onClose);
  const tCommon = useTranslations("common");
  const t = useTranslations("filters");
  const tAmenities = useTranslations("amenities");
  const minId = useId();
  const maxId = useId();

  const [minPrice, setMinPrice] = useState<string>(
    searchParams?.get("minPrice") || ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    searchParams?.get("maxPrice") || ""
  );
  const [roomCount, setRoomCount] = useState<number>(
    searchParams?.get("roomCount") ? parseInt(searchParams.get("roomCount")!, 10) : 1
  );
  const [bathroomCount, setBathroomCount] = useState<number>(
    searchParams?.get("bathroomCount") ? parseInt(searchParams.get("bathroomCount")!, 10) : 1
  );
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(
    searchParams?.get("propertyType") || "any"
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    searchParams?.get("amenities") ? searchParams.get("amenities")!.split(",") : []
  );

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
    { id: "Wifi", key: "wifi" },
    { id: "Kitchen", key: "kitchen" },
    { id: "Pool", key: "pool" },
    { id: "Free parking", key: "freeParking" },
    { id: "Air conditioning", key: "airConditioning" },
    { id: "Sea view", key: "seaView" },
    { id: "Fireplace", key: "fireplace" },
    { id: "Courtyard", key: "courtyard" },
  ];

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleReset = () => {
    setMinPrice("");
    setMaxPrice("");
    setRoomCount(1);
    setBathroomCount(1);
    setSelectedPropertyType("any");
    setSelectedAmenities([]);
  };

  const onSubmit = useCallback(() => {
    let currentQuery = {};
    if (searchParams) {
      currentQuery = qs.parse(searchParams.toString());
    }

    const updatedQuery: qs.StringifiableRecord = {
      ...currentQuery,
    };

    if (minPrice) updatedQuery.minPrice = minPrice;
    else delete updatedQuery.minPrice;

    if (maxPrice) updatedQuery.maxPrice = maxPrice;
    else delete updatedQuery.maxPrice;

    if (roomCount > 1) updatedQuery.roomCount = roomCount;
    else delete updatedQuery.roomCount;

    if (bathroomCount > 1) updatedQuery.bathroomCount = bathroomCount;
    else delete updatedQuery.bathroomCount;

    if (selectedPropertyType && selectedPropertyType !== "any") {
      updatedQuery.propertyType = selectedPropertyType;
    } else {
      delete updatedQuery.propertyType;
    }

    if (selectedAmenities.length > 0) {
      updatedQuery.amenities = selectedAmenities.join(",");
    } else {
      delete updatedQuery.amenities;
    }

    const url = qs.stringifyUrl(
      {
        url: "/search",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    closeFilterModal();
    router.push(url);
  }, [
    searchParams,
    minPrice,
    maxPrice,
    roomCount,
    bathroomCount,
    selectedPropertyType,
    selectedAmenities,
    closeFilterModal,
    router,
  ]);

  const bodyContent = (
    <div className="flex flex-col gap-6 divide-y divide-tertiary/40">
      {/* 1. Price Range Section */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-base sm:text-lg text-primary">{t("priceRange")}</h3>
        <p className="text-xs sm:text-sm text-neutral-600 font-normal">{t("priceRangeSubtitle")}</p>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border border-tertiary rounded-xl p-3 focus-within:ring-2 focus-within:ring-accent-600">
            <label htmlFor={minId} className="block text-[11px] font-bold text-neutral-600 uppercase">
              {t("minimum")}
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-neutral-600 font-bold" aria-hidden="true">
                {tCommon("currencySymbol")}
              </span>
              <input
                id={minId}
                type="number"
                inputMode="numeric"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="5000"
                className="w-full font-medium text-primary outline-none text-sm sm:text-base bg-transparent"
              />
            </div>
          </div>
          <div className="border border-tertiary rounded-xl p-3 focus-within:ring-2 focus-within:ring-accent-600">
            <label htmlFor={maxId} className="block text-[11px] font-bold text-neutral-600 uppercase">
              {t("maximum")}
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-neutral-600 font-bold" aria-hidden="true">
                {tCommon("currencySymbol")}
              </span>
              <input
                id={maxId}
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="35000"
                className="w-full font-medium text-primary outline-none text-sm sm:text-base bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Rooms and Beds Section */}
      <div className="flex flex-col gap-5 pt-6">
        <h3 className="font-semibold text-base sm:text-lg text-primary">{t("roomsAndBeds")}</h3>
        <Counter
          title={t("bedrooms")}
          subtitle={t("bedroomsSubtitle")}
          value={roomCount}
          onChange={(v) => setRoomCount(v)}
        />
        <Counter
          title={t("bathrooms")}
          subtitle={t("bathroomsSubtitle")}
          value={bathroomCount}
          onChange={(v) => setBathroomCount(v)}
        />
      </div>

      {/* 3. Property Type Section */}
      <div className="flex flex-col gap-3 pt-6">
        <h3 className="font-semibold text-base sm:text-lg text-primary flex items-center gap-2">
          <CategoryHouseIcon
            size={20}
            strokeWidth={1.8}
            className="text-accent shrink-0"
          />
          <span>{t("propertyType")}</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {propertyTypes.map((pt) => {
            const isSelected = selectedPropertyType === pt.id;
            return (
              <button
                key={pt.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedPropertyType(pt.id)}
                className={`py-3 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-tertiary text-neutral-700 hover:border-primary"
                }`}
              >
                {pt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Amenities Section */}
      <div className="flex flex-col gap-3 pt-6">
        <h3 className="font-semibold text-base sm:text-lg text-primary">{t("amenities")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {amenitiesList.map((amenity) => {
            const isChecked = selectedAmenities.includes(amenity.id);
            return (
              <label
                key={amenity.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-tertiary/60 hover:border-tertiary transition cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAmenity(amenity.id)}
                  className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent"
                />
                <span className="text-xs sm:text-sm font-medium text-primary">{tAmenities(amenity.key)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeFilterModal}
      onSubmit={onSubmit}
      title={tCommon("filters")}
      actionLabel={tCommon("showListings")}
      secondaryAction={handleReset}
      secondaryActionLabel={tCommon("clearAll")}
      body={bodyContent}
    />
  );
}
