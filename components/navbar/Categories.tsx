"use client";

import { useSearchParams } from "next/navigation";
import { usePathname } from "@/navigation";
import { BsSnow } from "react-icons/bs";
import { FaSkiing } from "react-icons/fa";
import {
  GiBarn,
  GiBoatFishing,
  GiCactus,
  GiCastle,
  GiCaveEntrance,
  GiForestCamp,
  GiIsland,
  GiWindmill,
} from "react-icons/gi";
import { IoDiamond } from "react-icons/io5";
import { MdOutlineVilla } from "react-icons/md";
import { TbBeach, TbMountain, TbPool } from "react-icons/tb";
import CategoryBox from "../CategoryBox";
import Container from "../Container";

export const categories = [
  {
    label: "Beach",
    icon: TbBeach,
    description: "This property is close to the beach!",
  },
  {
    label: "Windmills",
    icon: GiWindmill,
    description: "This property is has windmills!",
  },
  {
    label: "Modern",
    icon: MdOutlineVilla,
    description: "This property is modern!",
  },
  {
    label: "Countryside",
    icon: TbMountain,
    description: "This property is in the countryside!",
  },
  {
    label: "Pools",
    icon: TbPool,
    description: "This is property has a beautiful pool!",
  },
  {
    label: "Islands",
    icon: GiIsland,
    description: "This property is on an island!",
  },
  {
    label: "Lake",
    icon: GiBoatFishing,
    description: "This property is near a lake!",
  },
  {
    label: "Skiing",
    icon: FaSkiing,
    description: "This property has skiing activies!",
  },
  {
    label: "Castles",
    icon: GiCastle,
    description: "This property is an ancient castle!",
  },
  {
    label: "Caves",
    icon: GiCaveEntrance,
    description: "This property is in a spooky cave!",
  },
  {
    label: "Camping",
    icon: GiForestCamp,
    description: "This property offers camping activities!",
  },
  {
    label: "Arctic",
    icon: BsSnow,
    description: "This property is in arctic environment!",
  },
  {
    label: "Desert",
    icon: GiCactus,
    description: "This property is in the desert!",
  },
  {
    label: "Barns",
    icon: GiBarn,
    description: "This property is in a barn!",
  },
  {
    label: "Lux",
    icon: IoDiamond,
    description: "This property is brand new and luxurious!",
  },
];

import React, { useRef } from "react";
import { TbAdjustmentsHorizontal } from "react-icons/tb";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import useFilterModal from "@/hook/useFilterModal";
import { useTranslations } from "next-intl";

type Props = {};

function Categories({}: Props) {
  const params = useSearchParams();
  const category = params?.get("category");
  const pathname = usePathname();
  const filterModal = useFilterModal();
  const tCommon = useTranslations("common");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isMainPage = pathname === "/";

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
    <div className="pt-2 pb-4 flex items-center justify-between gap-3 w-full relative">
      {/* Left Scroll Arrow (Desktop) */}
      <button
        type="button"
        aria-label="Previous categories"
        onClick={() => handleScroll("left")}
        className="hidden md:flex p-1.5 rounded-full border border-tertiary/70 hover:border-primary bg-surface text-primary shadow-2xs hover:shadow-xs transition flex-shrink-0"
      >
        <MdChevronLeft size={18} className="rtl:rotate-180" />
      </button>

      {/* Horizontal Scrollable Categories Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex flex-row items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth py-1"
      >
        {categories.map((items, index) => (
          <CategoryBox
            key={index}
            icon={items.icon}
            label={items.label}
            selected={category === items.label}
          />
        ))}
      </div>

      {/* Right Scroll Arrow (Desktop) */}
      <button
        type="button"
        aria-label="Next categories"
        onClick={() => handleScroll("right")}
        className="hidden md:flex p-1.5 rounded-full border border-tertiary/70 hover:border-primary bg-surface text-primary shadow-2xs hover:shadow-xs transition flex-shrink-0"
      >
        <MdChevronRight size={18} className="rtl:rotate-180" />
      </button>

      {/* Filters Button (Opens FilterModal) */}
      <button
        type="button"
        onClick={filterModal.onOpen}
        className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl border border-tertiary/70 text-xs sm:text-sm font-semibold text-primary hover:border-primary hover:bg-tertiary/20 transition flex-shrink-0 shadow-2xs hover:shadow-xs cursor-pointer bg-surface touch-manipulation"
      >
        <TbAdjustmentsHorizontal size={16} />
        <span>{tCommon("filters")}</span>
      </button>
    </div>
  );
}

export default Categories;
