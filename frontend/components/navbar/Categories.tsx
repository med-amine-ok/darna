"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/navigation";
import {
  MdOutlineVilla,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { TbBeach, TbMountain, TbPool } from "react-icons/tb";
import { GiCactus, GiCastle, GiForestCamp } from "react-icons/gi";
import { IoSparklesOutline } from "react-icons/io5";
import { TbAdjustmentsHorizontal } from "react-icons/tb";
import CategoryBox from "@/components/CategoryBox";
import { useFilterModal } from "@/hook/useFilterModal";
import { useTranslations } from "next-intl";
import { BiCompass } from "react-icons/bi";

export const categories = [
  {
    label: "Villas",
    icon: MdOutlineVilla,
    description: "Spacious private villas across Algeria.",
  },
  {
    label: "Beachfront",
    icon: TbBeach,
    description: "Coastal retreats along the Mediterranean.",
  },
  {
    label: "Desert & Sahara",
    icon: GiCactus,
    description: "Magical desert lodges in Taghit, Djanet, and Timimoun.",
  },
  {
    label: "Historic & Riads",
    icon: GiCastle,
    description: "Centuries of Ottoman and Andalusian heritage.",
  },
  {
    label: "Mountain & Cedar",
    icon: TbMountain,
    description: "Quiet escapes in Kabylie and Atlas mountain ranges.",
  },
  {
    label: "Pools",
    icon: TbPool,
    description: "Properties with private swimming pools.",
  },
  {
    label: "Camping & Glamping",
    icon: GiForestCamp,
    description: "Unforgettable starry nights under Algerian skies.",
  },
  {
    label: "Expeditions",
    icon: IoSparklesOutline,
    description: "Curated Sahara and cultural expeditions.",
  },
  {
    label: "Vehicles 4x4",
    imgSrc: "/assets/car.png",
    description: "All-terrain vehicles and road trip cruisers.",
  },
  {
    label: "Trips & Circuits",
    icon: BiCompass,
    description: "Multi-day packaged trips organized by licensed Algerian travel agencies.",
  },
];

export default function Categories() {
  const params = useSearchParams();
  const activeCategory = params?.get("category");
  const pathname = usePathname();
  const filterModal = useFilterModal();
  const tCommon = useTranslations("common");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isMainPage = pathname === "/" || pathname === "";

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(Math.abs(scrollLeft) > 8);
      setCanScrollRight(scrollWidth - clientWidth - Math.abs(scrollLeft) > 8);
    }
  }, []);

  useEffect(() => {
    if (!isMainPage) return;
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [checkScroll, isMainPage]);

  if (!isMainPage) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="pt-2 pb-3 relative w-full flex items-center justify-center">
      {/* Left Scroll Arrow (Shown only when scrolled right) */}
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => handleScroll("left")}
          className="hidden md:flex absolute start-0 top-1/2 -translate-y-1/2 p-2 rounded-full border border-tertiary/70 hover:border-primary bg-white text-primary shadow-xs hover:shadow-sm transition z-20 cursor-pointer"
        >
          <MdChevronLeft size={18} className="rtl:rotate-180" />
        </button>
      )}

      {/* Categories Scroll Container - 100% Horizontally Centered on Desktop */}
      <div
        ref={scrollContainerRef}
        className="w-full flex flex-row items-center justify-start md:justify-center overflow-x-auto no-scrollbar scroll-smooth py-1 px-4 md:px-32"
      >
        <div className="flex flex-row items-center justify-center gap-6 sm:gap-8 shrink-0">
          {categories.map((item, index) => (
            <CategoryBox
              key={index}
              icon={item.icon}
              imgSrc={(item as any).imgSrc}
              label={item.label}
              selected={activeCategory === item.label}
            />
          ))}
        </div>
      </div>

      {/* Right Scroll Arrow (Shown only when content overflows to the right) */}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Next categories"
          onClick={() => handleScroll("right")}
          className="hidden md:flex absolute end-28 top-1/2 -translate-y-1/2 p-2 rounded-full border border-tertiary/70 hover:border-primary bg-white text-primary shadow-xs hover:shadow-sm transition z-20 cursor-pointer"
        >
          <MdChevronRight size={18} className="rtl:rotate-180" />
        </button>
      )}

      {/* Filters Button - Pinned to the Right End (RTL-aware with end-0) */}
      <div className="hidden md:flex absolute end-0 top-1/2 -translate-y-1/2 z-20">
        <button
          type="button"
          onClick={filterModal.onOpen}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl border border-tertiary/80 text-xs sm:text-sm font-semibold text-primary hover:border-primary hover:bg-tertiary/20 transition shadow-xs cursor-pointer bg-white touch-manipulation select-none"
        >
          <TbAdjustmentsHorizontal size={16} />
          <span>{tCommon("filters") || "Filters"}</span>
        </button>
      </div>

      {/* Mobile Inline Filters Button */}
      <div className="md:hidden flex shrink-0 ms-2 z-20">
        <button
          type="button"
          onClick={filterModal.onOpen}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-tertiary/80 text-xs font-semibold text-primary hover:border-primary hover:bg-tertiary/20 transition shadow-xs cursor-pointer bg-white touch-manipulation select-none"
        >
          <TbAdjustmentsHorizontal size={15} />
          <span>{tCommon("filters") || "Filters"}</span>
        </button>
      </div>
    </div>
  );
}
