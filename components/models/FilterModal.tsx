"use client";

import React, { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import useFilterModal from "@/hook/useFilterModal";
import Modal from "./Modal";
import Counter from "../inputs/Counter";
import { useTranslations } from "next-intl";

export default function FilterModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterModal = useFilterModal();
  const tCommon = useTranslations("common");
  const t = useTranslations("filters");

  // Read current filters or defaults
  const [minPrice, setMinPrice] = useState<string>(searchParams?.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState<string>(searchParams?.get("maxPrice") || "");
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

  const propertyTypes = useMemo(
    () => [
      { id: "any", label: t("anyType") },
      { id: "house", label: t("house") },
      { id: "apartment", label: t("apartment") },
      { id: "guesthouse", label: t("guesthouse") },
      { id: "hotel", label: t("hotel") },
    ],
    [t]
  );

  const amenitiesList = [
    "Wifi",
    "Kitchen",
    "Washer",
    "Free parking",
    "Air conditioning",
    "Dedicated workspace",
    "Pool",
    "Hot tub",
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

    const updatedQuery: any = {
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
        url: "/",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    filterModal.onClose();
    router.push(url);
  }, [
    searchParams,
    minPrice,
    maxPrice,
    roomCount,
    bathroomCount,
    selectedPropertyType,
    selectedAmenities,
    filterModal,
    router,
  ]);

  const bodyContent = (
    <div className="flex flex-col gap-6 divide-y divide-neutral-200">
      {/* 1. Price Range Section */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-lg text-neutral-900">{t("priceRange")}</h3>
        <p className="text-sm text-neutral-500 font-normal">
          {t("priceRangeSubtitle")}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border border-neutral-300 rounded-xl p-3 focus-within:ring-2 focus-within:ring-neutral-900">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase">
              {t("minimum")}
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-neutral-500 font-bold">DZD</span>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="5000"
                className="w-full font-medium text-neutral-900 outline-none text-base"
              />
            </div>
          </div>
          <div className="border border-neutral-300 rounded-xl p-3 focus-within:ring-2 focus-within:ring-neutral-900">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase">
              {t("maximum")}
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-neutral-500 font-bold">DZD</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="50000+"
                className="w-full font-medium text-neutral-900 outline-none text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Rooms and Beds Section */}
      <div className="flex flex-col gap-5 pt-6">
        <h3 className="font-semibold text-lg text-neutral-900">{t("roomsAndBeds")}</h3>
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
        <h3 className="font-semibold text-lg text-neutral-900">{t("propertyType")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {propertyTypes.map((pt) => {
            const isSelected = selectedPropertyType === pt.id;
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => setSelectedPropertyType(pt.id)}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition text-center cursor-pointer ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-900"
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  {(pt.id === "house" || pt.id === "guesthouse") && (
                    <Image
                      src="/assets/house.png"
                      alt="House"
                      width={16}
                      height={16}
                      className="w-4 h-4 object-contain inline-block"
                    />
                  )}
                  {pt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Amenities Section */}
      <div className="flex flex-col gap-3 pt-6">
        <h3 className="font-semibold text-lg text-neutral-900">{t("amenities")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {amenitiesList.map((amenity) => {
            const isChecked = selectedAmenities.includes(amenity);
            return (
              <label
                key={amenity}
                className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 transition cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAmenity(amenity)}
                  className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent"
                />
                <span className="text-sm font-medium text-neutral-800">{amenity}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={filterModal.isOpen}
      onClose={filterModal.onClose}
      onSubmit={onSubmit}
      title={tCommon("filters")}
      actionLabel={tCommon("showListings")}
      secondaryAction={handleReset}
      secondaryActionLabel={tCommon("clearAll")}
      body={bodyContent}
    />
  );
}
