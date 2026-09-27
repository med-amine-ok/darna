"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { MdHome, MdOutlineLightbulb, MdDirectionsCar } from "react-icons/md";
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

  // City rotation for "win DARNA à Tipaza."
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
      { skipNull: true }
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
      id: "Services",
      label: t("tabVehicles"),
      icon: MdDirectionsCar,
    },
  ];

  return (
    <section className="relative w-full bg-background pt-20 sm:pt-24 pb-8 sm:pb-12 overflow-hidden flex flex-col items-center justify-center text-center">
      {/* Ambient warm radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(201,111,79,0.10),rgba(248,246,238,0))] pointer-events-none" />

      {/* Hero Content Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center">
        {/* Main Arabic Headline: وين دارنا ؟ */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-primary tracking-tight select-none leading-none">
          {t("title")}
        </h1>

        {/* Dynamic Punchy Subline: win DARNA à Tipaza. */}
        <div className="text-xl sm:text-3xl md:text-4xl font-extrabold text-primary flex items-center justify-center gap-2 mt-3 sm:mt-4 select-none">
          <span className="text-accent inline-block animate-pulse">✦</span>
          <span>{t("sublinePrefix")}</span>
          <span
            className={`text-accent font-black transition-opacity duration-200 cursor-pointer hover:underline ${
              isFading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
            }`}
            onClick={() => router.push(`/search?destination=${encodeURIComponent(FEATURED_CITIES[cityIndex])}`)}
          >
            {FEATURED_CITIES[cityIndex]}.
          </span>
        </div>

        {/* Localized Tagline */}
        <p className="text-sm sm:text-base text-primary/70 mt-2.5 font-medium max-w-md select-none">
          {t("subtitle")}
        </p>

        {/* Floating Category Tabs Pill Bar (matching screenshot layout) */}
        <div className="inline-flex items-center p-1 sm:p-1.5 rounded-full bg-tertiary/25 border border-tertiary/60 shadow-xs mt-6 sm:mt-8 gap-1 z-10">
          {tabs.map((tab) => {
            const isSelected =
              currentCategory === tab.id ||
              (tab.id === "Homes" && (!searchParams?.get("category") || currentCategory === "all"));
            const Icon = tab.icon;

            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
                  isSelected
                    ? "bg-surface text-primary shadow-xs border border-tertiary/40"
                    : "text-primary/70 hover:text-primary hover:bg-tertiary/20"
                }`}
              >
                <Icon size={18} className={isSelected ? "text-primary" : "text-primary/70"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Wide Floating Search Bar with Terracotta CTA Button */}
        <div className="w-full max-w-4xl mt-5 sm:mt-6 z-20 text-start">
          <Search isHero />
        </div>
      </div>

      {/* Algerian Architectural Outline Landmarks across bottom */}
      <AlgerianSkyline className="absolute bottom-0 inset-x-0 h-36 sm:h-44 md:h-48 pointer-events-none z-0" />
    </section>
  );
}
