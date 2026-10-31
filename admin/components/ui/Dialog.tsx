"use client";

import React, { useId } from "react";
import { X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { dur, ease, fadeScale } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  size?: "sm" | "md" | "lg" | "xl" | string;
  className?: string;
  /** id of a heading rendered inside `children` (when no `title` is passed). */
  labelledBy?: string;
  /** Accessible name when there is no visible title. */
  ariaLabel?: string;
  /** id of the element describing the dialog (defaults to the subtitle). */
  describedBy?: string;
  /** Element to focus when the dialog opens (defaults to the first focusable). */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

/**
 * Modal dialog: role="dialog" + aria-modal, labelled by its title, focus
 * trapped inside, Escape closes, focus returns to the opener on close.
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer,
  maxWidth,
  size = "md",
  className = "",
  labelledBy,
  ariaLabel,
  describedBy,
  initialFocusRef,
}) => {
  const t = useTranslations("ui");
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const containerRef = useDialogA11y<HTMLDivElement>(isOpen, { onEscape: onClose, initialFocusRef });
  const hasHeader = Boolean(title || subtitle || description);

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 text-start">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast, ease: ease.standard }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 backdrop-ink"
          />

          {/* Modal Container */}
          <m.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : labelledBy}
            aria-label={!title && !labelledBy ? ariaLabel : undefined}
            aria-describedby={describedBy ?? (subtitle || description ? descId : undefined)}
            variants={fadeScale}
            initial="hidden"
            animate="show"
            exit="exit"
            className={`relative w-full max-h-[calc(100dvh-2rem)] flex flex-col ${widthClasses[(size as keyof typeof widthClasses) || maxWidth || "md"] || "max-w-md"} bg-white rounded-2xl sm:rounded-3xl shadow-e4 overflow-hidden z-10 focus:outline-none ${className}`}
          >
            {/* Header */}
            {hasHeader && (
              <div className="p-4 sm:p-6 pb-3 sm:pb-4 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 id={titleId} className="text-title font-semibold text-primary-900 leading-tight">
                      {title}
                    </h2>
                  )}
                  {(subtitle || description) && (
                    <p id={descId} className="text-meta text-primary-600 mt-1">
                      {subtitle || description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 -me-1 -mt-1 rounded-xl flex items-center justify-center text-primary-500 hover:text-primary-900 hover:bg-primary/[0.06] transition duration-fast cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  aria-label={t("closeDialog")}
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-6 pt-2 space-y-4 overflow-y-auto flex-1">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-3 sm:p-4 px-4 sm:px-6 bg-darnaBg-100 border-t border-primary/[0.06] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 shrink-0">
                {footer}
              </div>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
