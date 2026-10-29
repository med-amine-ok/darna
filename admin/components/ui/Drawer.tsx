"use client";

import React, { useId } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-black/45 backdrop-blur-xs"
          />

          {/* Sliding Drawer Container */}
          <div className="fixed inset-y-0 end-0 flex max-w-full ps-10">
            <motion.div
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={!title ? ariaLabel : undefined}
              aria-describedby={effectiveSubtitle ? descId : undefined}
              initial={{ x: offscreen }}
              animate={{ x: 0 }}
              exit={{ x: offscreen }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className={`w-screen ${sizeClasses[size]} bg-white shadow-darna-modal flex flex-col border-s border-tertiary/70 focus:outline-none ${className}`}
            >
              {/* Header */}
              <div className="p-5 border-b border-tertiary/60 flex items-center justify-between gap-3 bg-darnaBg/30">
                <div>
                  {title && (
                    <h2 id={titleId} className="text-base sm:text-lg font-serif font-black text-primary">
                      {title}
                    </h2>
                  )}
                  {effectiveSubtitle && (
                    <p id={descId} className="text-xs text-neutral-600 mt-0.5">
                      {effectiveSubtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-neutral-500 hover:text-primary hover:bg-neutral-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  aria-label={t("closePanel")}
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 darna-admin-scrollbar">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="p-4 border-t border-tertiary/60 bg-white flex items-center justify-end gap-2.5">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
