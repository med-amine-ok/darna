"use client";

import React from "react";
import { X } from "lucide-react";
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
  if (isOpen === false) return null;

  const renderedStatusBadge = statusBadge || (status ? <StatusPill status={status as any} size="sm" /> : null);

  return (
    <div
      className={`bg-white rounded-2xl border border-tertiary-200/80 shadow-darna-card flex flex-col overflow-hidden max-h-[calc(100vh-100px)] ${className}`}
    >
      {/* Optional Header */}
      {(title || onClose) && (
        <div className="p-4 border-b border-neutral-100 flex items-start justify-between gap-3 shrink-0 bg-neutral-50/50">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-primary truncate">{title}</h3>
                {renderedStatusBadge}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-neutral-500 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {actions}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/70 transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs if provided */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 border-b border-neutral-100 px-4 bg-white shrink-0 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange && onTabChange(tab.id)}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-neutral-500 hover:text-primary"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100">
                    {tab.count}
                  </span>
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
        <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/70 shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
};
