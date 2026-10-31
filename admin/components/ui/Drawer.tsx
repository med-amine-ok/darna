"use client";

import React, { useId } from "react";
import { X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { dur, ease, spring } from "@/lib/motion";
import { useLocale, useTranslations } from "next-intl";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Accessible name when there is no visible title. */
  ariaLabel?: string;
}

/** Side sheet on the inline-end edge: modal dialog semantics, focus trap, Escape, focus restore. */
export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer,
  size = "md",
  className = "",
  ariaLabel,
}) => {
  const t = useTranslations("ui");
  const isRtl = useLocale() === "ar";
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const effectiveSubtitle = subtitle || description;
  const containerRef = useDialogA11y<HTMLDivElement>(isOpen, { onEscape: onClose });
  const offscreen = isRtl ? "-100%" : "100%";

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-start">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast, ease: ease.standard }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 backdrop-ink"
          />

          {/* Sliding Drawer Container */}
          <div className="fixed inset-y-0 end-0 flex max-w-full ps-10">
            <m.div
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={!title ? ariaLabel : undefined}
              aria-describedby={effectiveSubtitle ? descId : undefined}
              initial={{ x: offscreen }}
              animate={{ x: 0 }}
              exit={{ x: offscreen }}
              transition={spring.sheet}
              className={`w-screen ${sizeClasses[size]} bg-white shadow-e4 flex flex-col focus:outline-none sm:rounded-s-3xl overflow-hidden ${className}`}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-primary/[0.06] flex items-center justify-between gap-3">
                <div>
                  {title && (
                    <h2 id={titleId} className="text-title font-semibold text-primary-900">
                      {title}
                    </h2>
                  )}
                  {effectiveSubtitle && (
                    <p id={descId} className="text-meta text-primary-600 mt-0.5">
                      {effectiveSubtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-primary-500 hover:text-primary-900 hover:bg-primary/[0.06] transition duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  aria-label={t("closePanel")}
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 darna-admin-scrollbar">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="p-4 border-t border-primary/[0.06] bg-darnaBg-100 flex items-center justify-end gap-2.5">
                  {footer}
                </div>
              )}
            </m.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
