"use client";

import React, { useCallback } from "react";
import { useRouter, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { useTranslations } from "next-intl";

// Rich SVG / Icons matching the screenshot
const GlobeIcon = () => (
  <svg
    viewBox="0 0 32 32"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-transform group-hover:scale-110"
  >
    <circle cx="16" cy="16" r="11" fill="#E8D5B5" stroke="#8C6D3F" strokeWidth="1.5" />
    <path
      d="M16 5C12 9 10 13 10 16C10 19 12 23 16 27C20 23 22 19 22 16C22 13 20 9 16 5Z"
      fill="#A4C2A5"
      stroke="#4C704E"
      strokeWidth="1.2"
    />
    <path d="M5.5 16H26.5" stroke="#8C6D3F" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7.5 11H24.5" stroke="#8C6D3F" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M7.5 21H24.5" stroke="#8C6D3F" strokeWidth="1.2" strokeLinecap="round" />
    <path
      d="M16 27V30M11 30H21"
      stroke="#73552C"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const HomesIcon = () => (
  <svg
    viewBox="0 0 32 32"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-transform group-hover:scale-110"
  >
    <path
      d="M6 15L16 6L26 15V26C26 26.5523 25.5523 27 25 27H7C6.44772 27 6 26.5523 6 26V15Z"
      fill="#D97706"
      stroke="#92400E"
      strokeWidth="1.5"
    />
    <path
      d="M4 16L16 5L28 16"
      stroke="#B45309"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="12" y="18" width="8" height="9" fill="#78350F" rx="1" />
    <circle cx="2" cy="22" r="3" fill="#15803D" />
    <circle cx="30" cy="22" r="3" fill="#15803D" />
    <path d="M21 9V6H24V11.5" fill="#B45309" />
  </svg>
);

const ExperiencesIcon = () => (
  <svg
    viewBox="0 0 32 32"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-transform group-hover:scale-110"
  >
    <ellipse cx="16" cy="12" rx="9" ry="10" fill="#EF4444" />
    <path
      d="M10 12C10 7 12 3 16 3C20 3 22 7 22 12C22 17 20 21 16 21C12 21 10 17 10 12Z"
      fill="#F97316"
    />
    <ellipse cx="16" cy="12" rx="3.5" ry="9" fill="#FBBF24" />
    <path d="M12.5 21L14 25H18L19.5 21" stroke="#78350F" strokeWidth="1.5" />
    <rect x="13.5" y="25" width="5" height="4" rx="1" fill="#92400E" />
  </svg>
);

const ServicesIcon = () => (
  <svg
    viewBox="0 0 32 32"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-transform group-hover:scale-110"
  >
    <path
      d="M6 22C6 15 10 10 16 10C22 10 26 15 26 22H6Z"
      fill="#475569"
      stroke="#1E293B"
      strokeWidth="1.5"
    />
    <circle cx="16" cy="8" r="2.5" fill="#CBD5E1" stroke="#1E293B" strokeWidth="1.5" />
    <line
      x1="4"
      y1="23"
      x2="28"
      y2="23"
      stroke="#1E293B"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M10 18C11 15 13 13 16 13"
      stroke="#94A3B8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const mainTabs = [
  { id: "all", labelKey: "tabAll", icon: GlobeIcon },
  { id: "Homes", labelKey: "tabHomes", icon: HomesIcon },
  { id: "Experiences", labelKey: "tabExperiences", icon: ExperiencesIcon },
  { id: "Services", labelKey: "tabServices", icon: ServicesIcon },
];

export default function MainCategoryTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("nav");

  const currentCategory = params?.get("category") || "all";

  const handleSelectTab = useCallback(
    (tabId: string) => {
      let currentQuery = {};
      if (params) {
        currentQuery = qs.parse(params.toString());
      }

      const updatedQuery: any = {
        ...currentQuery,
      };

      if (tabId === "all") {
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

      router.push(url);
    },
    [params, router]
  );

  // Only render on homepage
  if (pathname !== "/") {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10 pt-2 pb-2 overflow-x-auto no-scrollbar">
      {mainTabs.map((tab) => {
        const isSelected =
          (tab.id === "all" && (!params?.get("category") || currentCategory === "all")) ||
          currentCategory === tab.id;
        const Icon = tab.icon;

        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => handleSelectTab(tab.id)}
            className={`group flex items-center gap-2 pb-2.5 pt-1 px-1 border-b-2 transition duration-150 cursor-pointer whitespace-nowrap ${
              isSelected
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-200"
            }`}
          >
            <Icon />
            <span className="text-sm font-medium">{t(tab.labelKey as any)}</span>
          </button>
        );
      })}
    </div>
  );
}
