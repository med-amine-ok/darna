"use client";

import React from "react";

export interface SplitViewProps {
  isPanelOpen?: boolean;
  isOpen?: boolean;
  tableContent?: React.ReactNode;
  mainContent?: React.ReactNode;
  panelContent?: React.ReactNode;
  detailPanel?: React.ReactNode;
  className?: string;
}

export const SplitView: React.FC<SplitViewProps> = ({
  isPanelOpen,
  isOpen,
  tableContent,
  mainContent,
  panelContent,
  detailPanel,
  className = "",
}) => {
  const panelVisible = isOpen !== undefined ? isOpen : (isPanelOpen ?? false);
  const left = mainContent || tableContent;
  const right = detailPanel || panelContent;

  return (
    <div className={`flex flex-col lg:flex-row items-start gap-5 w-full ${className}`}>
      {/* Left Data Zone */}
      <div
        className={`w-full transition-all duration-300 min-w-0 ${
          panelVisible ? "lg:flex-1 lg:max-w-[calc(100%-440px)]" : "w-full"
        }`}
      >
        {left}
      </div>

      {/* Right Detail Panel: Sticky ~420px */}
      {panelVisible && (
        <div className="w-full lg:w-[420px] lg:shrink-0 sticky top-20 z-20 animate-in fade-in slide-in-from-right-4 duration-300">
          {right}
        </div>
      )}
    </div>
  );
};
