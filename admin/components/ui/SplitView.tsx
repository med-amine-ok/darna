"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useLocale } from "next-intl";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { dur, ease, slideIn } from "@/lib/motion";

export interface SplitViewProps {
  isPanelOpen?: boolean;
  isOpen?: boolean;
  tableContent?: React.ReactNode;
  mainContent?: React.ReactNode;
  panelContent?: React.ReactNode;
  detailPanel?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  /** Accessible name of the detail panel when it is shown as a modal sheet (< lg). */
  panelLabel?: string;
}

const SMALL_SCREEN_QUERY = "(max-width: 1023.98px)";

export const SplitView: React.FC<SplitViewProps> = ({
  isPanelOpen,
  isOpen,
  tableContent,
  mainContent,
  panelContent,
  detailPanel,
  onClose,
  className = "",
  panelLabel,
}) => {
  const panelVisible = isOpen !== undefined ? isOpen : (isPanelOpen ?? false);
  const isRtl = useLocale() === "ar";
  const left = mainContent || tableContent;
  const right = detailPanel || panelContent;

  // Below lg the panel is an off-canvas modal sheet; above it is an inline column.
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(SMALL_SCREEN_QUERY);
    const update = () => setIsSmallScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const isModalSheet = panelVisible && isSmallScreen;
  // Focus trap, Escape, scroll lock and focus restore only while the panel is a modal sheet.
  const panelRef = useDialogA11y<HTMLDivElement>(isModalSheet, { onEscape: onClose });

  return (
    <div className={`flex flex-col lg:flex-row items-start gap-5 w-full relative ${className}`}>
      {/* Left Data Zone */}
      <div
        className={`w-full min-w-0 ${
          panelVisible ? "lg:flex-1 lg:max-w-[calc(100%-444px)]" : "w-full"
        }`}
      >
        {left}
      </div>

      {/* Right detail panel: slides in from the inline end. Off-canvas modal sheet below lg, sticky column above. */}
      <AnimatePresence>
        {panelVisible && (
          <>
            {/* Mobile backdrop */}
            <m.div
              key="split-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.fast, ease: ease.standard }}
              onClick={onClose}
              aria-hidden="true"
              className="fixed inset-0 z-40 backdrop-ink lg:hidden"
            />

            <m.div
              key="split-panel"
              ref={panelRef}
              role={isModalSheet ? "dialog" : undefined}
              aria-modal={isModalSheet ? true : undefined}
              aria-label={isModalSheet ? panelLabel : undefined}
              variants={slideIn("end", isRtl, isSmallScreen ? 48 : 24)}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-y-0 end-0 z-50 w-full sm:max-w-md lg:z-20 lg:w-[424px] lg:shrink-0 lg:sticky lg:top-[88px] lg:inset-auto flex flex-col h-[100dvh] lg:h-auto"
            >
              {right}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
