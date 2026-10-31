"use client";

import React from "react";
import { X } from "lucide-react";
import { m } from "framer-motion";
import { spring } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { StatusPill } from "./StatusPill";

export interface DetailPanelProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  status?: string;
  statusBadge?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  tabs?: { id: string; label: string; count?: number }[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  children,
  isOpen = true,
  onClose,
  title,
  subtitle,
  status,
  statusBadge,
  actions,
  footer,
  tabs,
  activeTab,
  onTabChange,
  className = "",
}) => {
  const t = useTranslations("ui");
  const indicatorId = `detail-tab-${React.useId()}`;
  if (isOpen === false) return null;

  const renderedStatusBadge = statusBadge || (status ? <StatusPill status={status as any} size="sm" /> : null);

  return (
    <div
      className={`bg-white rounded-none lg:rounded-2xl shadow-e4 lg:shadow-e2 flex flex-col h-full lg:max-h-[calc(100dvh-112px)] overflow-hidden ${className}`}
    >
      {/* Optional Header */}
      {(title || onClose) && (
        <div className="px-4 py-3.5 border-b border-primary/[0.06] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-primary-900 truncate">{title}</h3>
                {renderedStatusBadge}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-primary-600 truncate mt-0.5 tabular-nums">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {actions}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-primary-500 hover:text-primary-900 hover:bg-primary/[0.06] transition duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                aria-label={t("closePanel")}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs if provided */}
      {tabs && tabs.length > 0 && (
        <div role="tablist" className="flex items-center gap-4 border-b border-primary/[0.06] px-4 bg-white shrink-0 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange && onTabChange(tab.id)}
                className={`relative py-2.5 text-xs font-semibold transition-colors duration-fast ease-standard cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 rounded-sm ${
                  isActive ? "text-primary-900" : "text-primary-600 hover:text-primary-900"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ms-1 px-1.5 rounded-full text-[11px] tabular-nums bg-primary/[0.07] text-primary-700">
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <m.span
                    layoutId={indicatorId}
                    transition={spring.layout}
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-600"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Body Content */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">{children}</div>

      {/* Sticky Footer */}
      {footer && (
        <div className="p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-primary/[0.06] glass-light shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
};
