"use client";

/**
 * Sheet, bottom sheet on phones, side drawer from `sm` up.
 *
 *   <Sheet isOpen={open} onClose={close} title="Filters" side="end"
 *     footer={<Button fullWidth onClick={apply}>Show 120 homes</Button>}>
 *     …scrollable content…
 *   </Sheet>
 *
 * - Phones (< 640px): docks to the bottom (max 92dvh, rounded-t-3xl, e4), slides up with
 *   `spring.sheet`; drag the handle/header down to dismiss, otherwise it springs back.
 * - ≥ 640px: full-height drawer on the reading `end` edge (right in LTR, left in RTL) or
 *   `start`; slides in from that edge.
 * - Built on hook/useDialogA11y: focus trap, Escape, scroll lock, focus restore.
 * - Header (serif title + close), scrolling body, sticky footer with safe-area padding.
 */

import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useDragControls } from "framer-motion";
import { useTranslations } from "next-intl";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { BrandCloseIcon } from "@/components/icons";
import { dur, ease, spring } from "@/lib/motion";
import { IconButton } from "./Button";
import { SheetHandle, dismissOnDrag } from "./Dialog";
import { cn } from "./cn";
import { useIsPhone, useIsRtl } from "./hooks";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  ariaLabel?: string;
  /** Drawer edge from `sm` up (logical: end = right in LTR). */
  side?: "start" | "end";
  /** Drawer width from `sm` up. */
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
  busy?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  closeOnBackdrop?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const widths = {
  sm: "sm:w-[24rem]",
  md: "sm:w-[30rem]",
  lg: "sm:w-[40rem]",
} as const;

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  ariaLabel,
  side = "end",
  size = "md",
  footer,
  busy,
  initialFocusRef,
  closeOnBackdrop = true,
  className,
  bodyClassName,
  children,
}: SheetProps) {
  const t = useTranslations("ui");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const titleId = useId();
  const descId = useId();
  const isPhone = useIsPhone();
  const isRtl = useIsRtl();
  const dragControls = useDragControls();
  const panelRef = useDialogA11y<HTMLDivElement>(isOpen, {
    onEscape: busy ? undefined : onClose,
    initialFocusRef,
  });

  // Physical direction the drawer comes from.
  const fromRight = (side === "end") !== isRtl;
  const offscreen = fromRight ? "100%" : "-100%";

  // Portal to <body> so ancestors with transforms/filters (entrances) cannot trap `fixed`.
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="sheet" className="fixed inset-0 z-[90]">
          <m.div
            className="absolute inset-0 bg-primary-900/45 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: dur.base, ease: ease.out },
            }}
            exit={{ opacity: 0, transition: { duration: dur.fast } }}
            onMouseDown={() => closeOnBackdrop && !busy && onClose()}
            aria-hidden="true"
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : ariaLabel}
            aria-describedby={description ? descId : undefined}
            className={cn(
              "absolute flex flex-col bg-white shadow-e4 outline-none",
              isPhone
                ? "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl"
                : cn(
                    "inset-y-0 w-full",
                    widths[size],
                    fromRight
                      ? "right-0 rounded-l-3xl"
                      : "left-0 rounded-r-3xl",
                  ),
              className,
            )}
            initial={isPhone ? { y: "100%" } : { x: offscreen }}
            animate={
              isPhone
                ? { y: 0, transition: spring.sheet }
                : { x: 0, transition: spring.sheet }
            }
            exit={
              isPhone
                ? {
                    y: "100%",
                    transition: { duration: dur.base, ease: ease.inOut },
                  }
                : {
                    x: offscreen,
                    transition: { duration: dur.base, ease: ease.inOut },
                  }
            }
            drag={isPhone && !busy ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            dragSnapToOrigin
            onDragEnd={dismissOnDrag(onClose)}
          >
            {isPhone && (
              <SheetHandle onPointerDown={(e) => dragControls.start(e)} />
            )}
            {(title || description) && (
              <header
                onPointerDown={
                  isPhone ? (e) => dragControls.start(e) : undefined
                }
                className={cn(
                  "shrink-0 border-b border-primary/[0.08] px-6 pb-4",
                  isPhone ? "pt-7 touch-none" : "pt-6",
                )}
              >
                {title && (
                  <h2
                    id={titleId}
                    className="pe-12 font-serif text-heading text-primary-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id={descId}
                    className="mt-1 pe-12 text-body text-primary-600"
                  >
                    {description}
                  </p>
                )}
              </header>
            )}
            <IconButton
              label={t("close")}
              icon={<BrandCloseIcon size={18} />}
              onClick={onClose}
              disabled={busy}
              size="sm"
              className={cn(
                "!absolute end-4 z-[3]",
                isPhone ? "top-5" : "top-5",
              )}
            />
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5",
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-primary/[0.08] bg-white/95 px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-b-none">
                {footer}
              </div>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default Sheet;
