"use client";

import React from "react";

export interface InfoTileProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}

export const InfoTile: React.FC<InfoTileProps> = ({
  icon,
  label,
  value,
  className = "",
}) => {
  return (
    <div
      className={`p-3 rounded-xl bg-neutral-50/80 border border-neutral-100 flex items-center gap-2.5 ${className}`}
    >
      {icon && (
        <div aria-hidden="true" className="w-8 h-8 rounded-lg bg-white border border-tertiary-200/80 flex items-center justify-center shrink-0 text-secondary shadow-2xs">
          {icon}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold leading-tight">
          {label}
        </span>
        <span className="text-xs font-bold text-primary truncate leading-tight mt-0.5">
          {value}
        </span>
      </div>
    </div>
  );
};
