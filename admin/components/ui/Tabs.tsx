"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { formatNumber } from "@/lib/utils/format";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs?: TabItem[];
  items?: TabItem[];
  activeTab?: string;
  activeId?: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "pill" | "line";
  /** Accessible name of the tab list. */
  ariaLabel?: string;
  /** Builds the id of the tabpanel controlled by each tab (enables aria-controls). */
  getPanelId?: (tabId: string) => string;
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  items,
  activeTab,
  activeId,
  onChange,
  className = "",
  variant = "pill",
  ariaLabel,
  getPanelId,
}) => {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabList = items || tabs || [];
  const selectedTab = activeId !== undefined ? activeId : (activeTab || "");
  const selectedIndex = tabList.findIndex((tab) => tab.id === selectedTab);
  // Roving tabindex: the selected tab (or the first one) is the single tab stop.
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const focusAndSelect = (index: number) => {
    const tab = tabList[index];
    if (!tab) return;
    tabRefs.current[index]?.focus();
    onChange(tab.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabList.length - 1;
    const forward = isRtl ? "ArrowLeft" : "ArrowRight";
    const backward = isRtl ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (e.key === forward) next = index >= last ? 0 : index + 1;
    else if (e.key === backward) next = index <= 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    focusAndSelect(next);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={`flex items-center gap-1 overflow-x-auto darna-admin-scrollbar py-1 ${
        variant === "pill"
          ? "bg-darnaBg/80 p-1 rounded-2xl border border-tertiary/60"
          : "border-b border-tertiary/60 gap-4"
      } ${className}`}
    >
      {tabList.map((tab, index) => {
        const isActive = selectedTab === tab.id;
        const common = {
          ref: (el: HTMLButtonElement | null) => {
            tabRefs.current[index] = el;
          },
          type: "button" as const,
          role: "tab",
          id: getPanelId ? `${getPanelId(tab.id)}-tab` : undefined,
          "aria-selected": isActive,
          "aria-controls": getPanelId ? getPanelId(tab.id) : undefined,
          tabIndex: index === tabStopIndex ? 0 : -1,
          onClick: () => onChange(tab.id),
          onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => handleKeyDown(e, index),
        };

        if (variant === "pill") {
          return (
            <button
              key={tab.id}
              {...common}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 min-h-[44px] sm:min-h-[34px] rounded-xl text-xs font-semibold select-none transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${focusRing} ${
                isActive ? "text-primary" : "text-neutral-600 hover:text-primary hover:bg-white/40"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-tertiary/60 -z-10"
                />
              )}
              {tab.icon && (
                <span className="shrink-0" aria-hidden="true">
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-neutral-200/80 text-neutral-700"
                  }`}
                >
                  {formatNumber(tab.count, locale)}
                </span>
              )}
            </button>
          );
        }

        // Line variant
        return (
          <button
            key={tab.id}
            {...common}
            className={`relative flex items-center gap-2 px-2 pb-2.5 min-h-[44px] sm:min-h-[36px] text-xs font-semibold select-none transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${focusRing} ${
              isActive ? "text-primary border-b-2 border-primary -mb-[1px]" : "text-neutral-500 hover:text-primary"
            }`}
          >
            {tab.icon && (
              <span className="shrink-0" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold tabular-nums">
                {formatNumber(tab.count, locale)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
