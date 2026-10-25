"use client";

import React from "react";
import { Download } from "lucide-react";

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
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-primary tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center flex-wrap gap-2.5">
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-tertiary-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-neutral-500" />
            <span>{exportLabel}</span>
          </button>
        )}

        {isCustomActions ? (
          actions
        ) : (
          (actions as PageHeaderAction[]).map((act, idx) => {
          const isPrimary = act.variant === "primary";
          const isSecondary = act.variant === "secondary";
          const isAccent = act.variant === "accent";

          let btnClass = "border border-tertiary-300 bg-white hover:bg-neutral-50 text-neutral-700";
          if (isPrimary) {
            btnClass = "bg-primary hover:bg-primary-700 text-white shadow-xs border border-primary";
          } else if (isSecondary) {
            btnClass = "bg-secondary hover:bg-secondary-700 text-white shadow-xs border border-secondary";
          } else if (isAccent) {
            btnClass = "border border-accent/40 text-accent hover:bg-accent/10";
          }

          if (act.href) {
            return (
              <a
                key={idx}
                href={act.href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition select-none ${btnClass}`}
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer select-none ${btnClass}`}
            >
              {act.icon}
              <span>{act.label}</span>
            </button>
          );
        })
      )}

        {children}
      </div>
    </div>
  );
};
