"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { MdHome, MdOutlineLightbulb, MdDirectionsCar } from "react-icons/md";
import Image from "next/image";
import AlgerianSkyline from "./AlgerianSkyline";
import Search from "../navbar/Search";

const FEATURED_CITIES = [
  "Tipaza",
  "Alger",
  "Oran",
  "Constantine",
  "Taghit",
  "Annaba",
  "Tlemcen",
  "Ghardaïa",
];

export default function HomeHero() {
  const t = useTranslations("homeHero");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCategory = searchParams?.get("category") || "Homes";

  // City rotation for "Win DARNA à Tipaza."
  const [cityIndex, setCityIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCityIndex((prev) => (prev + 1) % FEATURED_CITIES.length);
        setIsFading(false);
      }, 250);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  const handleSelectTab = (tabId: string) => {
    if (tabId === "Vehicles") {
      router.push("/vehicles");
      return;
    }

    const currentQuery = searchParams ? qs.parse(searchParams.toString()) : {};
    const updatedQuery: any = { ...currentQuery };

    if (tabId === "Homes") {
      delete updatedQuery.category;
    } else {
      updatedQuery.category = tabId;
    }

    const url = qs.stringifyUrl(
      {
        url: "/",
        query: updatedQuery,
      },
      { skipNull: true },
    );

    startTransition(() => {
      router.push(url);
    });
  };

  const tabs = [
    {
      id: "Homes",
      label: t("tabHomes"),
      icon: MdHome,
    },
    {
      id: "Experiences",
      label: t("tabExperiences"),
      icon: MdOutlineLightbulb,
    },
    {
      id: "Vehicles",
      label: t("tabVehicles"),
      icon: null,
    },
  ];

  return (
    <section className="relative z-30 w-full bg-background pt-20 sm:pt-24 pb-8 sm:pb-12 md:pb-0 md:min-h-[calc(100vh-70px)] md:max-h-[860px] flex flex-col items-center justify-start md:justify-between text-center overflow-visible">
      {/* Ambient warm radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(201,111,79,0.10),rgba(248,246,238,0))] pointer-events-none overflow-hidden" />

      {/* Mobile Phone Background: /bg-phone.png - Positioned under the navbar */}
      <div className="md:hidden absolute opacity-30 top-16 sm:top-20 inset-x-0 bottom-0 pointer-events-none select-none z-0 overflow-hidden opacity-35">
        <Image
          src="/bg-phone.png"
          alt="Algerian Heritage"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top mix-blend-multiply pointer-events-none"
        />
      </div>

      {/* Hero Content Container - Shown from the beginning (not centered) */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-4 flex flex-col items-center pt-1 sm:pt-4">
        {/* 1. THE SEARCH BAR ONLY */}
        <div className="w-full max-w-4xl z-50 text-start min-h-[58px] sm:min-h-[72px] mb-3 sm:mb-6">
          <Search isHero />
        </div>

        {/* 2. THEN THE TEXTS */}
        {/* Main Arabic Headline: دارنا، دارك وين ما تروح */}
        <h1 className="text-2xl sm:text-5xl md:text-6xl font-black text-primary tracking-tight select-none leading-tight sm:leading-none">
          {t("title")}
        </h1>

        {/* Dynamic Punchy Subline: Win DARNA à Tipaza. */}
        <div className="text-base sm:text-2xl md:text-3xl font-extrabold text-primary flex items-center justify-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-3 select-none">
          <span className="text-accent inline-block animate-pulse">✦</span>
          <span>{t("sublinePrefix")}</span>
          <span
            className={`text-accent font-black transition-opacity duration-200 cursor-pointer hover:underline ${
              isFading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
            }`}
            onClick={() =>
              router.push(
                `/search?destination=${encodeURIComponent(FEATURED_CITIES[cityIndex])}`,
              )
            }
          >
            {FEATURED_CITIES[cityIndex]}.
          </span>
        </div>

        {/* Localized Tagline */}
        <p className="text-xs sm:text-sm md:text-base text-primary/80 mt-1 sm:mt-1.5 font-medium max-w-md select-none">
          {t("subtitle")}
        </p>

        {/* 3. THEN THIS (Category Tabs Pill Bar: Homes, Experiences, Vehicles) */}
        <div className="inline-flex items-center p-1 sm:p-1.5 rounded-full bg-surface/95 backdrop-blur-md border border-tertiary/60 shadow-sm mt-3 sm:mt-5 gap-1 z-10">
          {tabs.map((tab) => {
            const isSelected =
              currentCategory === tab.id ||
              (tab.id === "Homes" &&
                (!searchParams?.get("category") || currentCategory === "all")) ||
              (tab.id === "Vehicles" && currentCategory === "Services");
            const Icon = tab.icon;

            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
                  isSelected
                    ? "bg-primary text-surface shadow-xs"
                    : "text-primary/70 hover:text-primary hover:bg-tertiary/20"
                }`}
              >
                {tab.id === "Homes" ? (
                  <Image
                    src="/assets/house.png"
                    alt="Homes"
                    width={18}
                    height={18}
                    className={`w-[18px] h-[18px] object-contain flex-shrink-0 ${
                      isSelected ? "brightness-0 invert" : ""
                    }`}
                  />
                ) : tab.id === "Vehicles" ? (
                  <Image
                    src="/assets/car.png"
                    alt="Vehicles"
                    width={24}
                    height={24}
                    className={`w-[24px] h-[24px] object-contain flex-shrink-0 ${
                      isSelected ? "brightness-0 invert" : ""
                    }`}
                  />
                ) : (
                  Icon && (
                    <Icon
                      size={18}
                      className={isSelected ? "text-surface" : "text-primary/70"}
                    />
                  )
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Background: bg.png (Algerian Architectural Landmarks as full-width hero background at the bottom on PC) */}
      <div className="hidden md:block absolute bottom-0 inset-x-0 w-full pt-6 sm:pt-8 opacity-30 pointer-events-none select-none z-0 overflow-hidden leading-none [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.15)_0%,rgba(0,0,0,1)_16%,rgba(0,0,0,1)_100%)]">
        <AlgerianSkyline className="w-full" />
      </div>
    </section>
  );
}
