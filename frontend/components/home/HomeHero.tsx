"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useVertical } from "@/hook/useVertical";
import { useSearchModal } from "@/hook/useSearchModal";
import { imagery, withParams } from "@/lib/imagery";
import Search from "@/components/navbar/Search";
import { ListingVertical } from "@/types";
import {
  BrandCompassIcon,
  BrandPinIcon,
  BrandSearchIcon,
  CategoryHotelIcon,
  CategoryHouseIcon,
  CategoryVehicleIcon,
} from "@/components/icons";

/** Kept for callers that still pass promo data (the compact hero no longer rotates cities). */
export interface PromoData {
  cities: string[];
}
export const DEFAULT_PROMO_DATA: PromoData = {
  cities: ["Tipaza", "Algiers", "Oran", "Constantine", "Taghit", "Djanet", "Ghardaïa", "Tlemcen", "Annaba"],
};

/**
 * Category order used everywhere on the home page: the tabs below AND the order of
 * the sections after the hero (app/[locale]/page.tsx follows HOME_VERTICAL_ORDER).
 */
export const HOME_VERTICAL_ORDER: ListingVertical[] = ["home", "hotel", "experience", "trip", "vehicle"];

const TAB_META: Record<
  ListingVertical,
  { labelKey: "tabHomes" | "tabHotels" | "tabExperiences" | "tabVehicles" | "tabTrips"; Icon: typeof CategoryHouseIcon }
> = {
  home: { labelKey: "tabHomes", Icon: CategoryHouseIcon },
  hotel: { labelKey: "tabHotels", Icon: CategoryHotelIcon },
  experience: { labelKey: "tabExperiences", Icon: BrandPinIcon },
  trip: { labelKey: "tabTrips", Icon: BrandCompassIcon },
  vehicle: { labelKey: "tabVehicles", Icon: CategoryVehicleIcon },
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/**
 * Compact home hero: a short photo band with the headline, then a white card that holds
 * the category tabs and the full search bar (about 8% of the viewport height). The
 * header hides its own search while this card is on screen (Navbar isHero).
 */
export default function HomeHero(_props: { promoData?: PromoData }) {
  const t = useTranslations("homeHero");
  const openSearchModal = useSearchModal((s) => s.onOpen);
  const activeVertical = useVertical((s) => s.activeVertical) || "home";
  const setActiveVertical = useVertical((s) => s.setActiveVertical);

  return (
    <section aria-labelledby="home-hero-title" className="relative w-full">
      <div aria-hidden="true" className="texture-zellige zellige-fade-down pointer-events-none absolute inset-x-0 bottom-[-6rem] h-56 opacity-70" />
      {/* Photo band with the headline */}
      <div className="relative isolate overflow-hidden bg-primary-900">
        <Image
          src={withParams(imagery.algiersBay, "auto=format&fit=crop&q=75&w=2000")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-center"
        />
        {/* Zellige in the corner opposite the headline (decorative, never behind text). */}
        <div aria-hidden="true" className="texture-zellige-dark zellige-fade-corner pointer-events-none absolute inset-0 opacity-90" />
        {/* Navy scrim: keeps white text above 7:1 on any part of the photo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-950/90 via-primary-900/70 to-primary-900/25 rtl:bg-gradient-to-l"
        />
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-8 pb-24 sm:px-6 md:pt-12 md:pb-28 lg:px-10">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.18em] text-white/85">BLADUS</p>
          <h1
            id="home-hero-title"
            className="mt-2 max-w-[22ch] font-serif text-display-md font-semibold text-white text-balance"
          >
            {t("headlineLead")} <span className="text-accent-200">{t("headlineAccent")}</span>
          </h1>
          <p className="mt-3 max-w-[60ch] text-body-lg text-white/90 text-pretty">{t("lede")}</p>
        </div>
      </div>

      {/* White card: category tabs + search, overlapping the photo */}
      <div className="relative z-20 mx-auto -mt-16 w-full max-w-[1240px] px-4 sm:px-6 md:-mt-20 lg:px-10">
        <div className="rounded-2xl bg-white p-2 shadow-e3 ring-1 ring-tertiary-200 sm:p-3">
          <div
            role="group"
            aria-label={t("verticalSwitcher")}
            className="flex gap-1 overflow-x-auto border-b border-tertiary-200 scrollbar-none"
          >
            {HOME_VERTICAL_ORDER.map((id) => {
              const { labelKey, Icon } = TAB_META[id];
              const isActive = activeVertical === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveVertical(id)}
                  className={`relative -mb-px flex shrink-0 cursor-pointer items-center gap-2 rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-fast sm:px-4 ${focusRing} ${
                    isActive
                      ? "border-accent-600 bg-accent-50 text-accent-700"
                      : "border-transparent text-primary-700 hover:bg-primary-50 hover:text-primary-900"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" className={isActive ? "text-accent-600" : "text-primary-500"} />
                  <span className="whitespace-nowrap">{t(labelKey)}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 sm:pt-3">
            {/* Desktop: the full Where / When / Who bar */}
            <div className="hidden md:block">
              <Search inline />
            </div>
            {/* Mobile: same bar shape, opens the search sheet */}
            <button
              type="button"
              onClick={openSearchModal}
              className={`flex h-[clamp(56px,8vh,76px)] w-full cursor-pointer items-center gap-3 rounded-xl ps-4 pe-1.5 text-start ring-1 ring-tertiary-300 md:hidden ${focusRing}`}
            >
              <BrandPinIcon size={20} className="shrink-0 text-accent-600" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-primary-900">{t("whereTo")}</span>
                <span className="truncate text-meta text-neutral-600">{t("anywhereAnyWeek")}</span>
              </span>
              <span className="flex h-[calc(100%-12px)] items-center gap-2 rounded-lg bg-cta px-4 text-sm font-semibold text-white">
                <BrandSearchIcon size={18} strokeWidth={2.2} aria-hidden="true" />
                <span className="sr-only">{t("search")}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
