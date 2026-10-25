"use client";

import React from "react";
import { Download, MoreHorizontal } from "lucide-react";
import { DropdownMenu } from "./DropdownMenu";

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "secondary" | "accent";
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onExport?: () => void;
  exportLabel?: string;
  actions?: PageHeaderAction[] | React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  onExport,
  exportLabel = "Exporter",
  actions = [],
  children,
}) => {
  const isCustomActions = React.isValidElement(actions);
  const actionList = Array.isArray(actions) ? (actions as PageHeaderAction[]) : [];

  // Split actions for mobile: primary action stays visible, others collapse into ... on mobile
  const primaryAction = actionList.find((a) => a.variant === "primary") || actionList[0];
  const secondaryActions = actionList.filter((a) => a !== primaryAction);

  const getButtonClass = (variant?: string) => {
    switch (variant) {
      case "primary":
        return "bg-primary hover:bg-primary-700 text-white shadow-xs border border-primary";
      case "secondary":
        return "bg-secondary hover:bg-secondary-700 text-white shadow-xs border border-secondary";
      case "accent":
        return "border border-accent/40 text-accent hover:bg-accent/10";
      default:
        return "border border-tertiary-300 bg-white hover:bg-neutral-50 text-neutral-700";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Title & Subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight break-words">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-neutral-500 mt-0.5 sm:mt-1 line-clamp-2 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center flex-wrap gap-2 shrink-0">
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl border border-tertiary-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-neutral-500" />
            <span>{exportLabel}</span>
          </button>
        )}

        {isCustomActions ? (
          actions
        ) : (
          <>
            {/* Desktop: render all action buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {actionList.map((act, idx) => {
                const btnClass = getButtonClass(act.variant);
                if (act.href) {
                  return (
                    <a
                      key={idx}
                      href={act.href}
                      className={`inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold transition select-none ${btnClass}`}
                    >
                      {act.icon}
                      <span>{act.label}</span>
                    </a>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={act.onClick}
                    className={`inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer select-none active:scale-95 ${btnClass}`}
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile (< sm): render primary action + dropdown for secondary actions */}
            <div className="flex sm:hidden items-center gap-2 w-full">
              {primaryAction && (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer select-none active:scale-95 ${getButtonClass(
                    primaryAction.variant
                  )}`}
                >
                  {primaryAction.icon}
                  <span className="truncate">{primaryAction.label}</span>
                </button>
              )}

              {secondaryActions.length > 0 && (
                <DropdownMenu
                  items={secondaryActions.map((act) => ({
                    label: act.label,
                    icon: act.icon,
                    onClick: act.onClick || (() => {}),
                    variant: act.variant === "accent" ? "danger" : "default",
                  }))}
                />
              )}
            </div>
          </>
        )}

        {children}
      </div>
    </div>
  );
};
