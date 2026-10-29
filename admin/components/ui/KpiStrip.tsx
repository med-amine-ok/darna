"use client";

import React from "react";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/utils/format";

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

  const getIconBg = (bg?: string, variant?: string) => {
    const val = variant || bg;
    switch (val) {
      case "secondary":
      case "success":
        return "bg-secondary-100 text-secondary-800 border-secondary-200";
      case "tertiary":
      case "warning":
        return "bg-tertiary-100 text-tertiary-900 border-tertiary-200";
      case "accent":
      case "danger":
        return "bg-accent-100 text-accent-800 border-accent-200";
      case "blue":
      case "primary":
        return "bg-primary-50 text-primary-800 border-primary-200";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 w-full ${className}`}
    >
      {cardList.map((card) => {
        const isSelected =
          card.active ?? (card.isActive || (activeCardId ? card.id === activeCardId : false));

        const renderIcon = () => {
          if (!card.icon) return null;
          if (React.isValidElement(card.icon)) return card.icon;
          const IconComp = card.icon as React.ComponentType<{ className?: string }>;
          return <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />;
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
            className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-start transition-all cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
              isSelected
                ? "bg-white border-primary shadow-darna-card ring-2 ring-primary/20"
                : "bg-white/80 border-tertiary-200/70 hover:border-tertiary-400 hover:bg-white shadow-2xs"
            }`}
          >
            {/* Icon Tile */}
            <div
              aria-hidden="true"
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border ${getIconBg(
                card.iconBg,
                card.colorVariant
              )}`}
            >
              {renderIcon()}
            </div>

            {/* Label & Value */}
            <div className="min-w-0 flex-1">
              <span className="block font-mono text-base sm:text-lg font-bold text-primary leading-tight truncate">
                {typeof card.value === "number" ? formatNumber(card.value, locale) : card.value}
              </span>
              <span className="block text-[10px] sm:text-[11px] font-medium text-neutral-500 truncate leading-snug mt-0.5">
                {card.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
