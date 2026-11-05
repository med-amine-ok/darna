"use client";

import React from "react";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/utils/format";
import { AnimatedNumber } from "./AnimatedNumber";

export interface KpiCardItem {
  id: string;
  value: number | string;
  label: string;
  icon: React.ReactNode | React.ComponentType<{ className?: string }>;
  iconBg?: "primary" | "secondary" | "tertiary" | "accent" | "neutral" | "blue" | string;
  colorVariant?: "primary" | "secondary" | "tertiary" | "accent" | "neutral" | "warning" | "success" | "danger" | string;
  isActive?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export interface KpiStripProps {
  items?: KpiCardItem[];
  cards?: KpiCardItem[];
  activeCardId?: string;
  onCardClick?: (id: string) => void;
  className?: string;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  items,
  cards,
  activeCardId,
  onCardClick,
  className = "",
}) => {
  const locale = useLocale();
  const cardList = cards || items || [];

  // Icon tiles on palette tints (no borders): olive = positive, ochre = waiting,
  // terracotta = refused/alert, ink tint = neutral counts.
  const getIconBg = (bg?: string, variant?: string) => {
    const val = variant || bg;
    switch (val) {
      case "secondary":
      case "success":
        return "bg-secondary-100 text-secondary-800";
      case "tertiary":
      case "warning":
        return "bg-amber-100 text-amber-800";
      case "accent":
      case "danger":
        return "bg-accent-100 text-accent-800";
      case "blue":
      case "primary":
        return "bg-primary-100 text-primary-800";
      default:
        return "bg-darnaBg-300 text-primary-700";
    }
  };

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-2.5 sm:gap-3 lg:gap-4 w-full ${className}`}
    >
      {cardList.map((card) => {
        const isSelected =
          card.active ?? (card.isActive || (activeCardId ? card.id === activeCardId : false));

        const renderIcon = () => {
          if (!card.icon) return null;
          if (React.isValidElement(card.icon)) return card.icon;
          const IconComp = card.icon as React.ComponentType<{ className?: string }>;
          return <IconComp className="w-[18px] h-[18px]" />;
        };

        return (
          <button
            key={card.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => {
              if (card.onClick) card.onClick();
              if (onCardClick) onCardClick(card.id);
            }}
            className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-start bg-white cursor-pointer min-h-[44px] transition-[box-shadow,transform] duration-fast ease-standard active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
              isSelected ? "shadow-e2 ring-[1.5px] ring-primary-800" : "shadow-e1 hover:shadow-e2"
            }`}
          >
            {/* Icon Tile */}
            <div
              aria-hidden="true"
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getIconBg(
                card.iconBg,
                card.colorVariant
              )}`}
            >
              {renderIcon()}
            </div>

            {/* Value (Fraunces numerals) & label */}
            <div className="min-w-0 flex-1">
              {/* relative: keeps AnimatedNumber's screen-reader copy inside the card (it widened the page on phones);
                  smaller numerals on phones so large DZD amounts stay fully visible. */}
              <span className="relative block font-serif text-[1.125rem] sm:text-[1.375rem] text-primary-900 leading-none break-words tabular-nums">
                <AnimatedNumber value={typeof card.value === "number" ? formatNumber(card.value, locale) : card.value} />
              </span>
              <span className="block text-xs font-medium text-primary-600 line-clamp-2 leading-snug mt-1">
                {card.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
