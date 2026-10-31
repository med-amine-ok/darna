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
      className={`p-3 rounded-xl bg-darnaBg-100 flex items-center gap-2.5 ${className}`}
    >
      {icon && (
        <div aria-hidden="true" className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-secondary-700 shadow-e1">
          {icon}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] text-primary-600 font-medium leading-tight">
          {label}
        </span>
        <span className="text-xs font-semibold text-primary-900 truncate leading-tight mt-0.5">
          {value}
        </span>
      </div>
    </div>
  );
};
