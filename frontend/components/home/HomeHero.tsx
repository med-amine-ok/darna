"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useVertical } from "@/hook/useVertical";
import { useSearchModal } from "@/hook/useSearchModal";
import { findDestination } from "@/components/search/destinations";
import { dur, ease, spring } from "@/lib/motion";
import AlgeriaMap from "./AlgeriaMap";
import { ListingVertical } from "@/types";
import {
  BrandCompassIcon,
  BrandPinIcon,
  BrandSearchIcon,
  CategoryHotelIcon,
  CategoryHouseIcon,
  CategoryVehicleIcon,
} from "@/components/icons";

export interface PromoData {
  /** Destination values (as used in `?destination=`), shown with their localized names. */
  cities: string[];
}

export const DEFAULT_PROMO_DATA: PromoData = {
  cities: ["Tipaza", "Algiers", "Oran", "Constantine", "Taghit", "Djanet", "Ghardaïa", "Tlemcen", "Annaba"],
};

const VERTICAL_TABS: {
  id: ListingVertical;
  labelKey: "tabHomes" | "tabHotels" | "tabExperiences" | "tabVehicles" | "tabTrips";
  Icon: typeof CategoryHouseIcon;
}[] = [
  { id: "home", labelKey: "tabHomes", Icon: CategoryHouseIcon },
  { id: "hotel", labelKey: "tabHotels", Icon: CategoryHotelIcon },
  { id: "experience", labelKey: "tabExperiences", Icon: BrandPinIcon },
  { id: "vehicle", labelKey: "tabVehicles", Icon: CategoryVehicleIcon },
  { id: "trip", labelKey: "tabTrips", Icon: BrandCompassIcon },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg";

/**
 * Home hero on the plain paper background: the category switcher sits right under the
 * header search, then the headline beside a picture of all Algeria (AlgeriaMap: the
 * country's shape filled with coast and Sahara photography, with destination pins).
 */
export default function HomeHero({ promoData = DEFAULT_PROMO_DATA }: { promoData?: PromoData }) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("homeHero");
  const tDest = useTranslations("search.destinations");
  const openSearchModal = useSearchModal((s) => s.onOpen);
  const activeVertical = useVertical((s) => s.activeVertical);
  const setActiveVertical = useVertical((s) => s.setActiveVertical);
  const reduceMotion = useReducedMotion();

  // Rotating destination in the promo line; pauses on hover/focus (WCAG 2.2.2) and for reduced motion.
  const [cityIndex, setCityIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  useEffect(() => {
    if (isPaused || reduceMotion) return;
    const timer = setInterval(() => setCityIndex((i) => (i + 1) % promoData.cities.length), 3200);
    return () => clearInterval(timer);
  }, [promoData.cities.length, isPaused, reduceMotion]);

  const currentCity = promoData.cities[cityIndex];
  const known = findDestination(currentCity);
  const currentCityLabel = known ? tDest(`${known.key}.name`) : currentCity;

  return (
    <section
      className="relative w-full overflow-hidden pt-[5.25rem] pb-10 md:pt-[10.75rem] md:pb-14"
      aria-labelledby="home-hero-title"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[1360px] flex-col items-center px-4 text-center sm:px-6 lg:px-10">
        {/* Mobile search pill (desktop uses the header search, which docks on scroll). */}
        <div className="md:hidden mb-4 w-full -mt-2 enter-up">
          <button
            type="button"
            onClick={openSearchModal}
            className={`w-full flex items-center gap-3 p-2 ps-4 rounded-full bg-white shadow-e3 text-start active:scale-[0.98] transition-transform duration-micro ${focusRing}`}
          >
            <BrandPinIcon size={18} className="text-accent-600 shrink-0" />
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-primary-900 truncate">{t("whereTo")}</span>
              <span className="text-meta text-primary-500 truncate">{t("anywhereAnyWeek")}</span>
            </span>
            <span className="w-11 h-11 rounded-full bg-cta text-white flex items-center justify-center shadow-glow shrink-0">
              <BrandSearchIcon size={18} strokeWidth={2.2} />
              <span className="sr-only">{t("search")}</span>
            </span>
          </button>
        </div>

        {/* Category switcher, right under the search bar, with a sliding indicator. */}
        <div
          role="group"
          aria-label={t("verticalSwitcher")}
          className="enter-up relative max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none"
        >
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-white shadow-e2 ring-1 ring-primary/[0.06]">
            {VERTICAL_TABS.map(({ id, labelKey, Icon }) => {
              const isActive = activeVertical === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveVertical(id)}
                  className={`relative shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors duration-fast ease-standard ${focusRing} ${
                    isActive ? "text-white" : "text-primary-700 hover:text-primary-900"
                  }`}
                >
                  {isActive && (
                    <m.span
                      layoutId="hero-vertical-indicator"
                      transition={spring.layout}
                      className="absolute inset-0 rounded-full bg-primary-800 shadow-e2"
                      aria-hidden="true"
                    />
                  )}
                  <Icon size={18} className={`relative ${isActive ? "text-tertiary-200" : "text-secondary-600"}`} />
                  <span className="relative whitespace-nowrap">{t(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy beside a picture of all Algeria (map shape filled with photography). */}
        <div className="mt-8 grid w-full max-w-6xl items-center gap-8 md:mt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="flex flex-col items-center lg:items-start lg:text-start">
            <p className="inline-flex items-center gap-3 text-eyebrow uppercase font-semibold text-secondary-700 enter-up" style={{ animationDelay: "80ms" }}>
              <span aria-hidden="true" className="h-px w-8 bg-secondary-600/60" />
              {t("eyebrow")}
              <span aria-hidden="true" className="h-px w-8 bg-secondary-600/60" />
            </p>

            {/* Brand line in Algerian Arabic, decorative signature, always RTL. */}
            {!isRtl && (
              <p
                style={{ animationDelay: "110ms" }}
                lang="ar"
                dir="rtl"
                className="mt-3 font-[family-name:var(--font-messiri)] text-xl text-accent-700/90 leading-none enter-up"
              >
                {t("brandLine")}
              </p>
            )}

            <h1
              id="home-hero-title"
              style={{ animationDelay: "140ms" }}
              className="mt-4 font-serif text-display-lg text-primary-900 max-w-[18ch] text-balance enter-lift"
            >
              {t("headlineLead")}{" "}
              <em className="not-italic text-secondary-700 [font-variation-settings:'SOFT'_100,'opsz'_144]">{t("headlineAccent")}</em>
            </h1>

            <p className="mt-4 text-body-lg text-primary-600 max-w-[50ch] text-pretty enter-lift" style={{ animationDelay: "220ms" }}>
              {t("lede")}
            </p>

            {/* Promo line with rotating destination */}
            <p
              style={{ animationDelay: "300ms" }}
              className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-2 text-title text-primary-800 enter-up"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            >
              {t.rich("promoLine", {
                city: () => (
                  <span className="relative inline-flex justify-center overflow-hidden align-bottom h-[1.4em] min-w-[6ch]">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <m.span
                        key={currentCity}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: "0%", opacity: 1 }}
                        exit={{ y: "-100%", opacity: 0 }}
                        transition={{ duration: dur.base, ease: ease.out }}
                        className="inline-block"
                      >
                        <Link
                          href={{ pathname: "/search", query: { destination: currentCity } }}
                          className={`font-serif text-accent-700 underline decoration-accent-300 decoration-1 underline-offset-[6px] hover:decoration-accent-600 transition-colors rounded ${focusRing}`}
                        >
                          {currentCityLabel}
                        </Link>
                      </m.span>
                    </AnimatePresence>
                  </span>
                ),
              })}
            </p>
          </div>
          <AlgeriaMap className="enter-rise mx-auto w-[82%] max-w-[420px] lg:w-full lg:max-w-[460px]" />
        </div>
      </div>
    </section>
  );
}
