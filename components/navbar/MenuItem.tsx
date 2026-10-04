"use client";

import React from "react";

type Props = {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
};

function MenuItem({ onClick, label, icon, badge }: Props) {
  return (
    <div
      className="px-4 py-3.5 hover:bg-tertiary/20 text-primary transition font-semibold text-start flex items-center justify-between gap-3.5 cursor-pointer group select-none rounded-xl mx-2"
      onClick={onClick}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <span className="w-6 h-6 flex items-center justify-center text-primary/80 group-hover:text-primary transition-colors flex-shrink-0 text-[21px]">
            {icon}
          </span>
        )}
        <span className="truncate text-[15.5px] font-medium text-primary">{label}</span>
      </div>
      {badge && (
        <span className="text-[11px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2.5 py-0.5 rounded-full flex-shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}

export default MenuItem;
