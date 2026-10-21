"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useFilterModal } from "@/hook/useFilterModal";
import Modal from "./Modal";
import Counter from "@/components/inputs/Counter";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CategoryHouseIcon } from "@/components/icons";

export default function FilterModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterModal = useFilterModal();
  const tCommon = useTranslations("common");

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

  const propertyTypes = useMemo(
    () => [
      { id: "any", label: "Any stay type" },
      { id: "Entire home", label: "Entire home" },
      { id: "Private room", label: "Private room" },
      { id: "Hotel", label: "Hotel & Resort" },
      { id: "Hostel", label: "Youth Hostel & Dorms" },
      { id: "Villa", label: "Villa" },
      { id: "Riad", label: "Historic Riad & Ksar" },
      { id: "Apartment", label: "Apartment" },
    ],
    []
  );

  const amenitiesList = [
    "Wifi",
    "Kitchen",
    "Pool",
    "Free parking",
    "Air conditioning",
    "Sea view",
    "Fireplace",
    "Courtyard",
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
        url: "/search",
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
    <div className="flex flex-col gap-6 divide-y divide-tertiary/40">
      {/* 1. Price Range Section */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-base sm:text-lg text-primary">Price range (DZD)</h3>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal">
          Nightly or daily rates across Algerian stays and rentals
        </p>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border border-tertiary rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase">
              Minimum
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-neutral-500 font-bold">DZD</span>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="5000"
                className="w-full font-medium text-primary outline-none text-sm sm:text-base bg-transparent"
              />
            </div>
          </div>
          <div className="border border-tertiary rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase">
              Maximum
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-neutral-500 font-bold">DZD</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="35000+"
                className="w-full font-medium text-primary outline-none text-sm sm:text-base bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Rooms and Beds Section */}
      <div className="flex flex-col gap-5 pt-6">
        <h3 className="font-semibold text-base sm:text-lg text-primary">Rooms and Spaces</h3>
        <Counter
          title="Bedrooms"
          subtitle="Minimum number of dedicated bedrooms"
          value={roomCount}
          onChange={(v) => setRoomCount(v)}
        />
        <Counter
          title="Bathrooms"
          subtitle="Private or shared bathrooms"
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
          <span>Property Type</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {propertyTypes.map((pt) => {
            const isSelected = selectedPropertyType === pt.id;
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => setSelectedPropertyType(pt.id)}
                className={`py-3 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition text-center cursor-pointer ${
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
        <h3 className="font-semibold text-base sm:text-lg text-primary">Amenities & Features</h3>
        <div className="grid grid-cols-2 gap-3">
          {amenitiesList.map((amenity) => {
            const isChecked = selectedAmenities.includes(amenity);
            return (
              <label
                key={amenity}
                className="flex items-center gap-3 p-3 rounded-xl border border-tertiary/60 hover:border-tertiary transition cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAmenity(amenity)}
                  className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent"
                />
                <span className="text-xs sm:text-sm font-medium text-primary">{amenity}</span>
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
      title={tCommon("filters") || "Filters"}
      actionLabel="Show listings"
      secondaryAction={handleReset}
      secondaryActionLabel="Clear all"
      body={bodyContent}
    />
  );
}
