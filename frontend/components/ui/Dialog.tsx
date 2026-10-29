"use client";

import React, { useId } from "react";
import { useDialogA11y } from "@/hook/useDialogA11y";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Visible title; rendered with an id and wired to aria-labelledby. */
  title?: React.ReactNode;
  /** Accessible name when there is no visible title. */
  ariaLabel?: string;
  /** Close when the backdrop is clicked (default true). */
  closeOnBackdrop?: boolean;
  /** Ignore Escape/backdrop while an action is running. */
  busy?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Classes for the panel; defaults to a centered card / mobile bottom sheet. */
  className?: string;
  backdropClassName?: string;
  titleClassName?: string;
  children: React.ReactNode;
}

/**
 * Accessible modal dialog: role="dialog", aria-modal, labelled by its title,
 * focus trapped inside, Escape closes, focus returns to the opener.
 * Use this for every overlay instead of hand-rolled `fixed inset-0` divs.
 */
export default function Dialog({
  isOpen,
  onClose,
  title,
  ariaLabel,
  closeOnBackdrop = true,
  busy = false,
  initialFocusRef,
  className = "relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-tertiary/60 shadow-darna-modal p-6 max-h-[92dvh] overflow-y-auto",
  backdropClassName = "fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary/60 backdrop-blur-sm",
  titleClassName = "text-lg font-bold text-primary",
  children,
}: DialogProps) {
  const titleId = useId();
  const panelRef = useDialogA11y<HTMLDivElement>(isOpen, {
    onEscape: busy ? undefined : onClose,
    initialFocusRef,
  });

  if (!isOpen) return null;

  return (
    <div
      className={backdropClassName}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        className={className}
      >
        {title && (
          <h2 id={titleId} className={titleClassName}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
