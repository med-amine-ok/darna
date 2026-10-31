"use client";

/**
 * Dialog, accessible modal (role="dialog", aria-modal, focus trap, Escape, focus restore,
 * scroll lock via hook/useDialogA11y).
 *
 *   <Dialog isOpen={open} onClose={close} title="Cancel this trip?" description="…" showClose>
 *     …body…
 *     <DialogFooter><Button variant="ghost" onClick={close}>Keep</Button><Button variant="destructive">Cancel trip</Button></DialogFooter>
 *   </Dialog>
 *
 * Look: blurred ink backdrop that fades in; white rounded-3xl panel with e4 that scales/fades
 * in (≥ 640px) or slides up as a bottom sheet with a drag handle (phones; drag down to
 * dismiss, springs back otherwise). Reduced motion → fades only (MotionConfig).
 * `className` / `backdropClassName` still override the panel / backdrop for legacy callers.
 * For side drawers or long mobile forms use `Sheet`.
 */

import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  m,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { useTranslations } from "next-intl";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { BrandCloseIcon } from "@/components/icons";
import { dur, ease, spring } from "@/lib/motion";
import { IconButton } from "./Button";
import { cn } from "./cn";
import { useIsPhone } from "./hooks";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Visible title; rendered with an id and wired to aria-labelledby. */
  title?: React.ReactNode;
  /** Optional lede under the title, wired to aria-describedby. */
  description?: React.ReactNode;
  /** Accessible name when there is no visible title. */
  ariaLabel?: string;
  /** Close when the backdrop is clicked (default true). */
  closeOnBackdrop?: boolean;
  /** Ignore Escape/backdrop/drag while an action is running. */
  busy?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Render a close IconButton in the top corner. */
  showClose?: boolean;
  /** Phones: slide up from the bottom with a drag handle (default true). */
  mobileSheet?: boolean;
  /** Panel width from `sm` (default "md" = 32rem). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Classes for the panel; replaces the default panel styling. */
  className?: string;
  backdropClassName?: string;
  titleClassName?: string;
  children: React.ReactNode;
}

const widths = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

export const dialogBackdrop =
  "fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary-900/45 backdrop-blur-[6px]";

/** Right-aligned action row for dialog footers (stacks full-width on phones). */
export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Small pill handle shown on phone sheets; starts the drag. */
export function SheetHandle({
  onPointerDown,
}: {
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute inset-x-0 top-0 z-[2] flex h-6 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      aria-hidden="true"
    >
      <span className="h-1.5 w-10 rounded-full bg-primary/20" />
    </div>
  );
}

/** Returns a drag-end handler that dismisses when pulled far/fast enough. */
export function dismissOnDrag(onClose: () => void, threshold = 110) {
  return (_: unknown, info: PanInfo) => {
    if (info.offset.y > threshold || info.velocity.y > 650) onClose();
  };
}

export default function Dialog({
  isOpen,
  onClose,
  title,
  description,
  ariaLabel,
  closeOnBackdrop = true,
  busy = false,
  initialFocusRef,
  showClose = false,
  mobileSheet = true,
  size = "md",
  className,
  backdropClassName = dialogBackdrop,
  titleClassName = "font-serif text-heading text-primary-900 pe-10",
  children,
}: DialogProps) {
  const t = useTranslations("ui");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const titleId = useId();
  const descId = useId();
  const isPhone = useIsPhone();
  const sheet = isPhone && mobileSheet;
  const dragControls = useDragControls();
  const panelRef = useDialogA11y<HTMLDivElement>(isOpen, {
    onEscape: busy ? undefined : onClose,
    initialFocusRef,
  });

  const panelClass =
    className ??
    cn(
      "relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-e4 p-6 sm:p-8 max-h-[92dvh] overflow-y-auto overscroll-contain",
      "pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8",
      widths[size],
    );

  // Portal to <body> so ancestors with transforms/filters (entrances) cannot trap `fixed`.
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <m.div
          key="dialog-backdrop"
          className={backdropClassName}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: dur.base, ease: ease.out },
          }}
          exit={{
            opacity: 0,
            transition: { duration: dur.fast, ease: ease.standard },
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && closeOnBackdrop && !busy)
              onClose();
          }}
        >
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : ariaLabel}
            aria-describedby={description ? descId : undefined}
            className={cn(panelClass, sheet && "pt-8")}
            initial={sheet ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={
              sheet
                ? { y: 0, transition: spring.sheet }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { duration: dur.base, ease: ease.out },
                  }
            }
            exit={
              sheet
                ? {
                    y: "100%",
                    transition: { duration: dur.base, ease: ease.inOut },
                  }
                : {
                    opacity: 0,
                    scale: 0.98,
                    transition: { duration: dur.fast, ease: ease.standard },
                  }
            }
            drag={sheet && !busy ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            dragSnapToOrigin
            onDragEnd={dismissOnDrag(onClose)}
          >
            {sheet && (
              <SheetHandle onPointerDown={(e) => dragControls.start(e)} />
            )}
            {showClose && (
              <IconButton
                label={t("close")}
                icon={<BrandCloseIcon size={18} />}
                onClick={onClose}
                disabled={busy}
                size="sm"
                className="!absolute top-4 end-4 z-[3]"
              />
            )}
            {title && (
              <h2 id={titleId} className={titleClassName}>
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-2 text-body text-primary-600">
                {description}
              </p>
            )}
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
