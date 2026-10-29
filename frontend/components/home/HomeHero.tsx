"use client";

import React, { useState, useEffect } from "react";
import { getImageProps } from "next/image";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useVertical } from "@/hook/useVertical";
import { useSearchModal } from "@/hook/useSearchModal";
import { findDestination } from "@/components/search/destinations";
import { ListingVertical } from "@/types";
import {
  PremiumStarIcon,
  BrandCompassIcon,
  BrandPinIcon,
  CategoryHouseIcon,
  CategoryHotelIcon,
  CategoryVehicleIcon,
} from "@/components/icons";

export interface PromoData {
  /** Destination values (as used in `?destination=`), shown with their localized names. */
  cities: string[];
}

export const DEFAULT_PROMO_DATA: PromoData = {
  cities: ["Tipaza", "Algiers", "Oran", "Constantine", "Taghit", "Djanet", "Ghardaïa", "Tlemcen", "Annaba"],
};

interface HomeHeroProps {
  promoData?: PromoData;
}

// Art-directed, optimized hero background (decorative): portrait art on phones, wide art above 640px.
const heroCommon = { alt: "", fill: true, sizes: "100vw", priority: true } as const;
const {
  props: { srcSet: desktopSrcSet },
} = getImageProps({ ...heroCommon, src: "/bg.png", quality: 70 });
const {
  props: { srcSet: mobileSrcSet, ...heroImgProps },
} = getImageProps({ ...heroCommon, src: "/bg-phone.png", quality: 70 });

const VERTICAL_TABS: {
  id: ListingVertical;
  labelKey: "tabHomes" | "tabHotels" | "tabExperiences" | "tabVehicles" | "tabTrips";
  Icon: typeof CategoryHouseIcon;
  size: number;
}[] = [
  { id: "home", labelKey: "tabHomes", Icon: CategoryHouseIcon, size: 18 },
  { id: "hotel", labelKey: "tabHotels", Icon: CategoryHotelIcon, size: 18 },
  { id: "experience", labelKey: "tabExperiences", Icon: BrandPinIcon, size: 18 },
  { id: "vehicle", labelKey: "tabVehicles", Icon: CategoryVehicleIcon, size: 20 },
  { id: "trip", labelKey: "tabTrips", Icon: BrandCompassIcon, size: 18 },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function HomeHero({ promoData = DEFAULT_PROMO_DATA }: HomeHeroProps) {
  const locale = useLocale();
  const tHero = useTranslations("homeHero");
  const tDest = useTranslations("search.destinations");
  const openSearchModal = useSearchModal((s) => s.onOpen);
  const activeVertical = useVertical((s) => s.activeVertical);
  const setActiveVertical = useVertical((s) => s.setActiveVertical);

  const [cityIndex, setCityIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Rotating promotional city. Pauses on hover/focus and is off for reduced-motion users (WCAG 2.2.2).
  useEffect(() => {
    if (isPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      setIsFading(true);
      fadeTimer = setTimeout(() => {
        setCityIndex((prev) => (prev + 1) % promoData.cities.length);
        setIsFading(false);
      }, 200);
    }, 3500);

    return () => {
      clearInterval(timer);
      if (fadeTimer) clearTimeout(fadeTimer);
      setIsFading(false);
    };
  }, [promoData.cities.length, isPaused]);

  const currentCity = promoData.cities[cityIndex];
  const known = findDestination(currentCity);
  const currentCityLabel = known ? tDest(`${known.key}.name`) : currentCity;

  return (
    <section className="relative w-full flex flex-col items-center justify-start pt-24 sm:pt-36 md:pt-44 pb-6 sm:pb-8 md:pb-12 bg-transparent">
      {/* Decorative background artwork: bg-phone.png on phones, bg.png on larger screens */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
        <picture>
          <source media="(min-width: 641px)" srcSet={desktopSrcSet} />
          <source media="(max-width: 640px)" srcSet={mobileSrcSet} />
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- optimized via getImageProps; decorative (alt="") */}
          <img
            {...heroImgProps}
            className="object-cover object-bottom mix-blend-multiply opacity-30 pointer-events-none"
          />
        </picture>
        {/* Soft bottom fade into page background */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-darnaBg to-transparent pointer-events-none z-10" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-30 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        {/* Mobile Search Button in Hero: opens search modal */}
        <div className="md:hidden w-full max-w-sm mb-4">
          <button
            type="button"
            onClick={openSearchModal}
            className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-full bg-white/95 backdrop-blur-md border border-tertiary/80 shadow-darna-sm text-start transition-all cursor-pointer select-none active:scale-[0.98] ${focusRing}`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <BrandPinIcon size={16} className="text-secondary" />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-primary truncate">{tHero("whereTo")}</span>
                <span className="text-[11px] text-neutral-600 truncate">{tHero("anywhereAnyWeek")}</span>
              </span>
            </span>
            <span className="px-3.5 py-1.5 bg-accent-600 rounded-full text-white shrink-0 shadow-xs">
              <span className="text-xs font-bold">{tHero("search")}</span>
            </span>
          </button>
        </div>

        {/* 1. Headline Text Block */}
        <div className="flex flex-col items-center gap-2 max-w-3xl z-10">
          {/* Large Arabic brand tagline; other locales also get a translated line. */}
          <h1 className="flex flex-col items-center select-none">
            <span
              lang="ar"
              dir="rtl"
              className="text-3xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight font-arabic leading-tight sm:leading-none drop-shadow-sm"
            >
              {tHero("brandLine")}
            </span>
            {locale !== "ar" && (
              <span className="mt-2 text-sm sm:text-base md:text-lg font-semibold text-neutral-700">
                {tHero("title")}
              </span>
            )}
          </h1>

          {/* Data-Driven Promotional Line */}
          <p
            className="flex items-center justify-center gap-2 text-base sm:text-xl md:text-2xl font-bold text-primary mt-1.5 select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          >
            <PremiumStarIcon size={22} className="text-accent inline-block shrink-0" />
            {tHero.rich("promoLine", {
              city: () => (
                <Link
                  href={{ pathname: "/search", query: { destination: currentCity } }}
                  className={`text-accent-700 font-extrabold underline decoration-accent/60 underline-offset-4 transition-all duration-200 cursor-pointer rounded ${focusRing} ${
                    isFading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
                  }`}
                >
                  {currentCityLabel}
                </Link>
              ),
            })}
          </p>

          {/* Muted Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 font-medium max-w-md mt-1 leading-relaxed">
            {tHero("subtitle")}
          </p>
        </div>

        {/* 2. Vertical Switcher Pill (Homes / Hotels / Experiences / Vehicles / Trips) */}
        <div
          role="group"
          aria-label={tHero("verticalSwitcher")}
          className="inline-flex items-center p-1 sm:p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-tertiary/70 shadow-sm gap-1 mt-7 sm:mt-9 z-20 max-w-full overflow-x-auto no-scrollbar"
        >
          {VERTICAL_TABS.map(({ id, labelKey, Icon, size }) => {
            const isActive = activeVertical === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveVertical(id)}
                className={`shrink-0 flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer select-none ${focusRing} ${
                  isActive ? "bg-primary text-white shadow-sm" : "text-primary hover:bg-neutral-100/70"
                }`}
              >
                <Icon size={size} className={`transition-all ${isActive ? "text-white" : "text-secondary"}`} />
                <span>{tHero(labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
