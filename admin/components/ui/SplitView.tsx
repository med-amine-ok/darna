"use client";

import React, { useEffect } from "react";

export interface SplitViewProps {
  isPanelOpen?: boolean;
  isOpen?: boolean;
  tableContent?: React.ReactNode;
  mainContent?: React.ReactNode;
  panelContent?: React.ReactNode;
  detailPanel?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const SplitView: React.FC<SplitViewProps> = ({
  isPanelOpen,
  isOpen,
  tableContent,
  mainContent,
  panelContent,
  detailPanel,
  onClose,
  className = "",
}) => {
  const panelVisible = isOpen !== undefined ? isOpen : (isPanelOpen ?? false);
  const left = mainContent || tableContent;
  const right = detailPanel || panelContent;

  // Lock body scroll on small screens when panel is open
  useEffect(() => {
    if (panelVisible && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [panelVisible]);

  return (
    <div className={`flex flex-col lg:flex-row items-start gap-5 w-full relative ${className}`}>
      {/* Left Data Zone */}
      <div
        className={`w-full transition-all duration-300 min-w-0 ${
          panelVisible ? "lg:flex-1 lg:max-w-[calc(100%-440px)]" : "w-full"
        }`}
      >
        {left}
      </div>

      {/* Right Detail Panel: Off-canvas full-height sheet on mobile/tablet (< 1024px), sticky column on desktop */}
      {panelVisible && (
        <>
          {/* Mobile Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          />

          <div className="fixed inset-y-0 end-0 z-50 w-full sm:max-w-md lg:static lg:z-20 lg:w-[420px] lg:shrink-0 lg:sticky lg:top-20 flex flex-col h-[100dvh] lg:h-auto animate-in slide-in-from-right duration-250">
            {right}
          </div>
        </>
      )}
    </div>
  );
};
