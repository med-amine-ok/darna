"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { useVertical } from "@/hook/useVertical";
import { useSearchModal } from "@/hook/useSearchModal";
import {
  PremiumStarIcon,
  BrandCompassIcon,
  BrandPinIcon,
  CategoryHouseIcon,
  CategoryVehicleIcon,
} from "@/components/icons";

export interface PromoData {
  prefix: string;
  cities: string[];
}

export const DEFAULT_PROMO_DATA: PromoData = {
  prefix: "Win DARNA in",
  cities: [
    "Tipaza",
    "Algiers",
    "Oran",
    "Constantine",
    "Taghit",
    "Djanet",
    "Ghardaïa",
    "Tlemcen",
    "Annaba",
  ],
};

interface HomeHeroProps {
  promoData?: PromoData;
}

export default function HomeHero({
  promoData = DEFAULT_PROMO_DATA,
}: HomeHeroProps) {
  const router = useRouter();
  const tHero = useTranslations("homeHero");
  const searchModal = useSearchModal();
  const { activeVertical, setActiveVertical } = useVertical();

  const [cityIndex, setCityIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Rotating promotional city effect
  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCityIndex((prev) => (prev + 1) % promoData.cities.length);
        setIsFading(false);
      }, 200);
    }, 3500);

    return () => clearInterval(timer);
  }, [promoData.cities.length]);

  const currentCity = promoData.cities[cityIndex];

  return (
    <section className="relative w-full min-h-[85dvh] md:min-h-[88dvh] flex flex-col items-center justify-start pt-28 sm:pt-40 md:pt-48 pb-12 sm:pb-16 bg-transparent">
      {/* Background Illustration Artwork: Desktop bg.png vs Mobile bg-phone.png */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <picture>
          <source media="(max-width: 640px)" srcSet="/bg-phone.png" />
          <Image
            src="/bg.png"
            alt="Algerian Heritage"
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom mix-blend-multiply opacity-30 pointer-events-none"
          />
        </picture>
      </div>

      {/* Main Content Container */}
      <div className="relative z-30 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        {/* Mobile Search Button (Quick access above hero text on narrow viewports) */}
        <div className="md:hidden w-full max-w-sm mb-6">
          <button
            type="button"
            onClick={searchModal.onOpen}
            className="w-full flex items-center justify-between p-3 rounded-full bg-white/95 backdrop-blur-md border border-tertiary/80 shadow-darna-sm text-start"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <BrandPinIcon size={16} className="text-secondary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary">Where to?</span>
                <span className="text-[11px] text-neutral-500">Anywhere in Algeria · Any week</span>
              </div>
            </div>
            <div className="p-2 bg-accent rounded-full text-white shrink-0">
              <span className="text-xs font-bold">Search</span>
            </div>
          </button>
        </div>

        {/* 1. Headline Text Block */}
        <div className="flex flex-col items-center gap-2 max-w-3xl z-10">
          {/* Large Bold Arabic Tagline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-primary tracking-tight font-arabic leading-tight sm:leading-none select-none drop-shadow-sm">
            {tHero("title") || "دارنا، دارك وين ما تروح"}
          </h1>

          {/* Data-Driven Promotional Line */}
          <div className="flex items-center justify-center gap-2 text-base sm:text-xl md:text-2xl font-bold text-primary mt-1.5 select-none">
            <PremiumStarIcon size={22} className="text-accent inline-block shrink-0" />
            <span>{tHero("sublinePrefix") || promoData.prefix}</span>
            <button
              type="button"
              onClick={() =>
                router.push(`/search?destination=${encodeURIComponent(currentCity)}`)
              }
              className={`text-accent font-extrabold underline decoration-accent/60 underline-offset-4 transition-all duration-200 cursor-pointer ${
                isFading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
              }`}
            >
              {currentCity}.
            </button>
          </div>

          {/* Muted Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 font-medium max-w-md mt-1 leading-relaxed">
            {tHero("subtitle") || "Plan your next stay in Algeria & beyond."}
          </p>
        </div>

        {/* 2. Category Switcher Pill (Homes / Experiences / Vehicles / Trips) - Positioned UNDER the texts */}
        <div className="inline-flex items-center p-1 sm:p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-tertiary/70 shadow-sm gap-1 mt-7 sm:mt-9 z-20 max-w-full overflow-x-auto no-scrollbar">
          {/* Homes (Mapped to real brand asset house.png) */}
          <button
            type="button"
            onClick={() => setActiveVertical("home")}
            className={`
              shrink-0 flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer select-none
              ${
                activeVertical === "home"
                  ? "bg-primary text-white shadow-sm"
                  : "text-primary hover:bg-neutral-100/70"
              }
            `}
          >
            <CategoryHouseIcon
              size={18}
              className={`transition-all ${
                activeVertical === "home" ? "text-white" : "text-secondary"
              }`}
            />
            <span>{tHero("tabHomes") || "Homes"}</span>
          </button>

          {/* Experiences (Mapped to real brand asset location.png) */}
          <button
            type="button"
            onClick={() => setActiveVertical("experience")}
            className={`
              shrink-0 flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer select-none
              ${
                activeVertical === "experience"
                  ? "bg-primary text-white shadow-sm"
                  : "text-primary hover:bg-neutral-100/70"
              }
            `}
          >
            <BrandPinIcon
              size={18}
              className={`transition-all ${
                activeVertical === "experience" ? "text-white" : "text-secondary"
              }`}
            />
            <span>{tHero("tabExperiences") || "Experiences"}</span>
          </button>

          {/* Vehicles */}
          <button
            type="button"
            onClick={() => setActiveVertical("vehicle")}
            className={`
              shrink-0 flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer select-none
              ${
                activeVertical === "vehicle"
                  ? "bg-primary text-white shadow-sm"
                  : "text-primary hover:bg-neutral-100/70"
              }
            `}
          >
            <CategoryVehicleIcon
              size={20}
              className={`transition-all ${
                activeVertical === "vehicle" ? "text-white" : "text-secondary"
              }`}
            />
            <span>{tHero("tabVehicles") || "Vehicles"}</span>
          </button>

          {/* Trips / Circuits (Exclusive agency vertical) */}
          <button
            type="button"
            onClick={() => setActiveVertical("trip")}
            className={`
              shrink-0 flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer select-none
              ${
                activeVertical === "trip"
                  ? "bg-primary text-white shadow-sm"
                  : "text-primary hover:bg-neutral-100/70"
              }
            `}
          >
            <BrandCompassIcon
              size={18}
              className={`transition-all ${
                activeVertical === "trip" ? "text-white" : "text-secondary"
              }`}
            />
            <span>{tHero("tabTrips") || "Trips"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
