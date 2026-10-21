"use client";

import React from "react";
import { motion } from "framer-motion";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "pill" | "line";
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
  variant = "pill",
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1 overflow-x-auto darna-admin-scrollbar py-1 ${
        variant === "pill"
          ? "bg-darnaBg/80 p-1 rounded-2xl border border-tertiary/60"
          : "border-b border-tertiary/60 gap-4"
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === "pill") {
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold select-none transition-colors duration-150 cursor-pointer whitespace-nowrap ${
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
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-neutral-200/80 text-neutral-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        // Line variant
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 pb-2.5 text-xs font-semibold select-none transition-colors duration-150 cursor-pointer whitespace-nowrap ${
              isActive ? "text-primary border-b-2 border-primary -mb-[1px]" : "text-neutral-500 hover:text-primary"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
