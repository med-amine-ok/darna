"use client";

import React from "react";
import { Eye, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import { StatusPill } from "./StatusPill";

export interface ReviewItemData {
  id: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  statusText: string;
  statusVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  onInspect?: () => void;
  onToggleStatus?: () => void;
}

export interface ReviewChecklistProps {
  title?: string;
  items: ReviewItemData[];
  className?: string;
}

export const ReviewChecklist: React.FC<ReviewChecklistProps> = ({
  title = "Vérification et conformité",
  items,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-tertiary-200/80 shadow-darna-card p-4 space-y-3.5 ${className}`}
    >
      <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
        <ShieldCheck className="w-4 h-4 text-secondary" />
        <h3 className="text-xs font-bold text-primary">{title}</h3>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-neutral-100 bg-neutral-50/60 hover:bg-neutral-50 transition"
          >
            {/* Left: Icon & Text */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white border border-tertiary-200/60 flex items-center justify-center shrink-0 text-secondary">
                {item.icon || <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-primary truncate leading-tight">
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">
                    {item.subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Status Pill & Eye Inspect Button */}
            <div className="flex items-center gap-2 shrink-0">
              <StatusPill
                label={item.statusText}
                variant={item.statusVariant || "success"}
                size="sm"
              />
              {item.onInspect && (
                <button
                  type="button"
                  onClick={item.onInspect}
                  className="p-1 rounded-lg text-neutral-400 hover:text-primary hover:bg-neutral-200/60 transition cursor-pointer"
                  title="Inspecter le document justificatif"
                  aria-label="Inspecter le document justificatif"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
