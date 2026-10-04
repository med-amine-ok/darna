"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { safeListing, SafeUser } from "@/types";
import VehicleCard from "./VehicleCard";
import Container from "../Container";
import {
  MdSearch,
  MdClose,
  MdMap,
  MdList,
  MdTune,
  MdCheck,
  MdDirectionsCar,
  MdSpeed,
} from "react-icons/md";
import { useTranslations } from "next-intl";

// Dynamic import Leaflet map with ssr: false
const VehiclesMap = dynamic(() => import("./VehiclesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] bg-tertiary/20 animate-pulse rounded-3xl flex flex-col items-center justify-center text-primary/50 text-sm border border-tertiary/40 gap-3">
      <Image
        src="/assets/car.png"
        alt="Car"
        width={36}
        height={36}
        className="w-9 h-9 object-contain animate-bounce"
      />
      <span>Loading Algeria Vehicles Map...</span>
    </div>
  ),
});

const CITIES = [
  { id: "all", label: "All Algeria", wilaya: "National" },
  { id: "Alger", label: "Algiers", wilaya: "16" },
  { id: "Oran", label: "Oran", wilaya: "31" },
  { id: "Constantine", label: "Constantine", wilaya: "25" },
  { id: "Taghit", label: "Taghit / Béchar", wilaya: "08" },
  { id: "Tipaza", label: "Tipaza", wilaya: "42" },
  { id: "Ghardaïa", label: "Ghardaïa", wilaya: "47" },
  { id: "Annaba", label: "Annaba", wilaya: "23" },
];

const VEHICLE_TYPES = [
  { id: "all", label: "All Types" },
  { id: "4x4", label: "4x4 & Expedition" },
  { id: "luxury", label: "Luxury SUV" },
  { id: "crossover", label: "Crossover" },
  { id: "city", label: "City & Compact" },
];

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

export default function VehiclesClient({ listings, currentUser }: Props) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  // Filters state
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [transmission, setTransmission] = useState<"all" | "automatic" | "manual">("all");
  const [seatsFilter, setSeatsFilter] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeDropdown, setActiveDropdown] = useState<"price" | "more" | null>(null);

  // Map & card synchronization
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false);

  // Filter listings
  const filteredVehicles = useMemo(() => {
    return listings.filter((item) => {
      // 1. City filter
      if (selectedCity !== "all") {
        if (!item.city || item.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
      }

      // 2. Type filter
      if (selectedType !== "all") {
        const titleLower = item.title.toLowerCase();
        const subLower = (item.subtitle || "").toLowerCase();
        if (selectedType === "4x4") {
          if (!titleLower.includes("4x4") && !titleLower.includes("4wd") && !subLower.includes("4x4")) {
            return false;
          }
        } else if (selectedType === "luxury") {
          if (!titleLower.includes("mercedes") && !titleLower.includes("g63") && !titleLower.includes("defender") && item.price < 25000) {
            return false;
          }
        } else if (selectedType === "crossover") {
          if (!titleLower.includes("tucson") && !titleLower.includes("duster") && !subLower.includes("crossover")) {
            return false;
          }
        } else if (selectedType === "city") {
          if (!titleLower.includes("208") && !titleLower.includes("golf") && !subLower.includes("city") && !subLower.includes("hatchback")) {
            return false;
          }
        }
      }

      // 3. Transmission filter
      if (transmission !== "all") {
        const isManual = item.subtitle?.toLowerCase().includes("manual");
        if (transmission === "manual" && !isManual) return false;
        if (transmission === "automatic" && isManual) return false;
      }

      // 4. Seats filter
      if (seatsFilter > 0) {
        if (item.guestCount < seatsFilter) return false;
      }

      // 5. Price filter
      if (minPrice && item.price < Number(minPrice)) return false;
      if (maxPrice && item.price > Number(maxPrice)) return false;

      // 6. Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCity = item.city?.toLowerCase().includes(q);
        const matchesSub = item.subtitle?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCity && !matchesSub) return false;
      }

      return true;
    });
  }, [
    listings,
    selectedCity,
    selectedType,
    transmission,
    seatsFilter,
    minPrice,
    maxPrice,
    searchQuery,
  ]);

  const hasActiveFilters =
    selectedCity !== "all" ||
    selectedType !== "all" ||
    transmission !== "all" ||
    seatsFilter > 0 ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    Boolean(searchQuery.trim());

  const handleResetFilters = () => {
    setSelectedCity("all");
    setSelectedType("all");
    setTransmission("all");
    setSeatsFilter(0);
    setMinPrice("");
    setMaxPrice("");
    setSearchQuery("");
  };

  return (
    <div className="w-full bg-background min-h-screen pt-20 sm:pt-24 pb-20">
      {/* 1. Header Banner with /assets/car.png */}
      <div className="w-full bg-surface border-b border-tertiary/50 py-5 sm:py-7 px-4 sm:px-8">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-tertiary/30 border border-tertiary/70 flex items-center justify-center p-2 flex-shrink-0 shadow-xs">
              <Image
                src="/assets/car.png"
                alt="Vehicles"
                width={44}
                height={44}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-primary tracking-tight">
                  Vehicles & 4x4 Rentals in Algeria
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold text-xs">
                  ✦ Win DARNA Fleet
                </span>
              </div>
              <p className="text-xs sm:text-sm text-primary/70 font-medium mt-0.5">
                Sahara 4WD expeditions, luxury SUVs, and city runabouts with airport delivery & comprehensive insurance.
              </p>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="w-full md:w-72 relative">
            <MdSearch size={20} className="absolute start-3 top-1/2 -translate-y-1/2 text-primary/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search model or city..."
              className="w-full ps-9 pe-8 py-2 rounded-full border border-tertiary/80 bg-surface/90 text-xs sm:text-sm text-primary placeholder-primary/40 outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary p-0.5"
              >
                <MdClose size={15} />
              </button>
            )}
          </div>
        </div>

        {/* 2. City Filter Pills Row */}
        <div className="max-w-[1720px] mx-auto mt-4 pt-3 border-t border-tertiary/40 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CITIES.map((city) => {
            const isSelected = selectedCity === city.id;
            return (
              <button
                type="button"
                key={city.id}
                onClick={() => setSelectedCity(city.id)}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer select-none ${
                  isSelected
                    ? "bg-primary text-surface shadow-xs"
                    : "bg-surface border border-tertiary/70 text-primary/75 hover:text-primary hover:border-primary/60"
                }`}
              >
                {city.id === "all" ? (
                  <Image
                    src="/assets/car.png"
                    alt="Car"
                    width={18}
                    height={18}
                    className={`w-[18px] h-[18px] object-contain ${
                      isSelected ? "brightness-0 invert" : ""
                    }`}
                  />
                ) : (
                  <span className="text-xs">📍</span>
                )}
                <span>{city.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Secondary Filter Bar: Vehicle Type, Price, Transmission, Seats */}
        <div className="max-w-[1720px] mx-auto mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Vehicle Types */}
            {VEHICLE_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
                    isSelected
                      ? "bg-accent text-white shadow-2xs"
                      : "bg-tertiary/20 text-primary/80 hover:bg-tertiary/40"
                  }`}
                >
                  {type.label}
                </button>
              );
            })}

            {/* Transmission Toggle */}
            <div className="flex items-center bg-tertiary/20 rounded-full p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTransmission("all")}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  transmission === "all" ? "bg-surface text-primary shadow-2xs" : "text-primary/70"
                }`}
              >
                All Trans
              </button>
              <button
                type="button"
                onClick={() => setTransmission("automatic")}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  transmission === "automatic" ? "bg-surface text-primary shadow-2xs" : "text-primary/70"
                }`}
              >
                Automatic
              </button>
              <button
                type="button"
                onClick={() => setTransmission("manual")}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  transmission === "manual" ? "bg-surface text-primary shadow-2xs" : "text-primary/70"
                }`}
              >
                Manual
              </button>
            </div>

            {/* Seats Toggle */}
            <div className="flex items-center bg-tertiary/20 rounded-full p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSeatsFilter(0)}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  seatsFilter === 0 ? "bg-surface text-primary shadow-2xs" : "text-primary/70"
                }`}
              >
                Any Seats
              </button>
              <button
                type="button"
                onClick={() => setSeatsFilter(5)}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  seatsFilter === 5 ? "bg-surface text-primary shadow-2xs" : "text-primary/70"
                }`}
              >
                5+ Seats
              </button>
              <button
                type="button"
                onClick={() => setSeatsFilter(7)}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  seatsFilter === 7 ? "bg-surface text-primary shadow-2xs" : "text-primary/70"
                }`}
              >
                7+ Seats
              </button>
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <MdClose size={14} />
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Split Layout: Left List of Cars, Right Map */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 pt-6 flex flex-col lg:flex-row gap-6">
        {/* Left Column: List of Vehicles */}
        <div
          className={`w-full lg:w-7/12 xl:w-3/5 flex flex-col ${
            showMobileMap ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Results count & policy */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-2 border-b border-tertiary/40 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-primary">
                {filteredVehicles.length} {filteredVehicles.length === 1 ? "Vehicle" : "Vehicles"}
              </span>
              <span className="text-xs text-primary/60">
                in {selectedCity === "all" ? "Algeria" : selectedCity}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-primary/80 bg-tertiary/20 px-3 py-1 rounded-full">
              <span>🛡️</span>
              <span>All rentals include comprehensive collision & theft insurance</span>
            </div>
          </div>

          {/* Vehicle Cards Grid */}
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-surface rounded-3xl border border-tertiary/50 p-8">
              <Image
                src="/assets/car.png"
                alt="No cars"
                width={56}
                height={56}
                className="w-14 h-14 object-contain opacity-50 mb-3"
              />
              <h3 className="text-lg font-bold text-primary">No vehicles match your criteria</h3>
              <p className="text-xs sm:text-sm text-primary/70 mt-1 max-w-sm">
                Try loosening your filters or switching to another city in Algeria to view available 4x4s and cars.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-surface text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} id={`vehicle-card-${vehicle.id}`}>
                  <VehicleCard
                    vehicle={vehicle}
                    currentUser={currentUser}
                    onHover={setHoveredVehicleId}
                    isHovered={hoveredVehicleId === vehicle.id || selectedVehicleId === vehicle.id}
                    isSelected={selectedVehicleId === vehicle.id}
                    onClick={() => router.push(`/listings/${vehicle.id}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Vehicles Map */}
        <div
          className={`w-full lg:w-5/12 xl:w-2/5 lg:sticky lg:top-24 h-[550px] lg:h-[calc(100vh-8.5rem)] ${
            showMobileMap ? "fixed inset-0 top-20 z-50 bg-surface p-3" : "hidden lg:block"
          }`}
        >
          <VehiclesMap
            vehicles={filteredVehicles}
            currentUser={currentUser}
            selectedVehicleId={selectedVehicleId}
            hoveredVehicleId={hoveredVehicleId}
            onSelectVehicle={(id) => {
              setSelectedVehicleId(id);
              if (id) {
                const element = document.getElementById(`vehicle-card-${id}`);
                element?.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
            onHoverVehicle={setHoveredVehicleId}
          />

          {/* Mobile Close Map Button */}
          {showMobileMap && (
            <button
              type="button"
              onClick={() => setShowMobileMap(false)}
              className="lg:hidden absolute bottom-6 start-1/2 -translate-x-1/2 z-[600] px-6 py-3 rounded-full bg-primary text-surface font-bold text-xs shadow-xl flex items-center gap-2 cursor-pointer"
            >
              <MdList size={16} />
              <span>Show List ({filteredVehicles.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Mobile Floating Map / List Toggle Button */}
      <div className="lg:hidden fixed bottom-6 start-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setShowMobileMap((prev) => !prev)}
          className="px-6 py-3 rounded-full bg-neutral-900 text-white font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition cursor-pointer select-none"
        >
          {showMobileMap ? (
            <>
              <MdList size={18} />
              <span>Show List</span>
            </>
          ) : (
            <>
              <MdMap size={18} />
              <span>Show Map ({filteredVehicles.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
