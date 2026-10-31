"use client";

/**
 * Floating layers anchored to a trigger, Tooltip, Popover, DropdownMenu.
 *
 *   <Tooltip content="Copy link"><IconButton label="Share" icon={...} /></Tooltip>
 *
 *   <Popover trigger={<Button variant="tertiary">Guests</Button>} ariaLabel="Guests" align="start">
 *     {(close) => <GuestPicker onDone={close} />}
 *   </Popover>
 *
 *   <DropdownMenu
 *     trigger={<IconButton label="More" icon={<BrandMoreIcon size={18} />} />}
 *     items={[
 *       { label: "Edit", icon: <BrandEditIcon size={16} />, onSelect: edit },
 *       { type: "separator" },
 *       { label: "Delete", destructive: true, onSelect: remove },
 *     ]}
 *   />
 *
 * - Panels scale/fade from the corner nearest the trigger (origin-aware, mirrored in RTL).
 * - Popover/DropdownMenu close on outside click and Escape (focus returns to the trigger),
 *   via hook/useDismiss. Menus support ArrowUp/ArrowDown/Home/End and open with ArrowDown.
 * - Tooltip opens on hover (after `delay`) and on keyboard focus, closes on Escape/blur,
 *   and is linked with aria-describedby. Touch taps don't open tooltips.
 */

import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AnimatePresence, m } from "framer-motion";
import { Link } from "@/navigation";
import {
  useDismiss,
  handleMenuKeyDown,
  focusFirstMenuItem,
} from "@/hook/useDismiss";
import { dur, ease } from "@/lib/motion";
import { cn, focusRingInset } from "./cn";
import { useIsRtl } from "./hooks";

type Side = "top" | "bottom";
type Align = "start" | "center" | "end";

function originFor(side: Side, align: Align, isRtl: boolean) {
  const v = side === "bottom" ? "top" : "bottom";
  const h =
    align === "center"
      ? "center"
      : (align === "start") !== isRtl
        ? "left"
        : "right";
  return `${v} ${h}`;
}

function placement(side: Side, align: Align) {
  return cn(
    "absolute z-dropdown",
    side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
    align === "start" && "start-0",
    align === "end" && "end-0",
    align === "center" && "left-1/2 -translate-x-1/2",
  );
}

const panelMotion = (side: Side) => ({
  initial: { opacity: 0, scale: 0.96, y: side === "bottom" ? -4 : 4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: dur.fast, ease: ease.out },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.14, ease: ease.standard },
  },
});

/* ------------------------------------------------------------------ Tooltip */

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: Side;
  /** ms before showing on hover. */
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delay = 350,
  className,
}: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = (immediate = false) => {
    clearTimeout(timer.current);
    if (immediate) setOpen(true);
    else timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const child = isValidElement(children)
    ? cloneElement(
        children as React.ReactElement<{ "aria-describedby"?: string }>,
        { "aria-describedby": open ? id : undefined },
      )
    : children;

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType !== "touch" && show()}
      onPointerLeave={hide}
      onFocus={(e) => {
        // Keyboard focus only (pointer focus already handled by hover).
        if ((e.target as HTMLElement).matches?.(":focus-visible")) show(true);
      }}
      onBlur={hide}
    >
      {child}
      <AnimatePresence>
        {open && (
          <span
            className={cn("pointer-events-none", placement(side, "center"))}
          >
            <m.span
              id={id}
              role="tooltip"
              {...panelMotion(side)}
              style={{
                transformOrigin:
                  side === "top" ? "bottom center" : "top center",
              }}
              className={cn(
                "block max-w-[16rem] w-max rounded-lg bg-primary-900 px-2.5 py-1.5 text-meta font-medium text-white shadow-e3",
                className,
              )}
            >
              {content}
            </m.span>
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ Popover */

interface TriggerProps {
  ref?: React.Ref<HTMLElement>;
  onClick?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-haspopup"?: React.AriaAttributes["aria-haspopup"];
}

function useAnchored(
  open: boolean | undefined,
  onOpenChange?: (o: boolean) => void,
) {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternal(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  useDismiss(isOpen, wrapperRef, () => setOpen(false), triggerRef);
  return { isOpen, setOpen, wrapperRef, triggerRef };
}

export interface PopoverProps {
  /** The element that toggles the popover (a kit Button / IconButton or any ref-forwarding element). */
  trigger: React.ReactElement;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Accessible name for the panel (role="dialog", non-modal). */
  ariaLabel: string;
  side?: Side;
  align?: Align;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Panel classes (width, padding). */
  className?: string;
  wrapperClassName?: string;
}

export function Popover({
  trigger,
  children,
  ariaLabel,
  side = "bottom",
  align = "start",
  open,
  onOpenChange,
  className,
  wrapperClassName,
}: PopoverProps) {
  const isRtl = useIsRtl();
  const panelId = useId();
  const { isOpen, setOpen, wrapperRef, triggerRef } = useAnchored(
    open,
    onOpenChange,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen, triggerRef]);

  const t = trigger as React.ReactElement<TriggerProps>;
  const clonedTrigger = cloneElement(t, {
    ref: triggerRef,
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? panelId : undefined,
    "aria-haspopup": "dialog",
    onClick: (e: React.MouseEvent) => {
      t.props.onClick?.(e);
      setOpen(!isOpen);
    },
  });

  return (
    <div
      ref={wrapperRef}
      className={cn("relative inline-block", wrapperClassName)}
    >
      {clonedTrigger}
      <AnimatePresence>
        {isOpen && (
          <div className={placement(side, align)}>
            <m.div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={ariaLabel}
              {...panelMotion(side)}
              style={{ transformOrigin: originFor(side, align, isRtl) }}
              className={cn(
                "min-w-[14rem] rounded-2xl bg-white p-4 shadow-e3",
                className,
              )}
            >
              {typeof children === "function" ? children(close) : children}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ DropdownMenu */

export type DropdownItem =
  | {
      type?: "item";
      label: React.ReactNode;
      icon?: React.ReactNode;
      description?: React.ReactNode;
      onSelect?: () => void;
      href?: string;
      destructive?: boolean;
      disabled?: boolean;
      /** Shortcut / trailing meta text. */
      meta?: React.ReactNode;
    }
  | { type: "separator" }
  | { type: "label"; label: React.ReactNode };

export interface DropdownMenuProps {
  trigger: React.ReactElement;
  items: DropdownItem[];
  /** Accessible name of the menu (defaults to the trigger's label). */
  ariaLabel?: string;
  side?: Side;
  align?: Align;
  className?: string;
  wrapperClassName?: string;
}

export function DropdownMenu({
  trigger,
  items,
  ariaLabel,
  side = "bottom",
  align = "end",
  className,
  wrapperClassName,
}: DropdownMenuProps) {
  const isRtl = useIsRtl();
  const menuId = useId();
  const { isOpen, setOpen, wrapperRef, triggerRef } = useAnchored(undefined);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() =>
      focusFirstMenuItem(menuRef.current),
    );
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  const closeAndReturn = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const t = trigger as React.ReactElement<TriggerProps>;
  const clonedTrigger = cloneElement(t, {
    ref: triggerRef,
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? menuId : undefined,
    "aria-haspopup": "menu",
    onClick: (e: React.MouseEvent) => {
      t.props.onClick?.(e);
      setOpen(!isOpen);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      t.props.onKeyDown?.(e);
      if (e.key === "ArrowDown" && !isOpen) {
        e.preventDefault();
        setOpen(true);
      }
    },
  });

  const itemClass = (destructive?: boolean) =>
    cn(
      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium cursor-pointer",
      "transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-40",
      destructive
        ? "text-accent-700 hover:bg-accent-50 focus-visible:bg-accent-50"
        : "text-primary-800 hover:bg-primary/[0.05] hover:text-primary-900 focus-visible:bg-primary/[0.05]",
      focusRingInset,
    );

  return (
    <div
      ref={wrapperRef}
      className={cn("relative inline-block", wrapperClassName)}
    >
      {clonedTrigger}
      <AnimatePresence>
        {isOpen && (
          <div className={placement(side, align)}>
            <m.div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={ariaLabel}
              onKeyDown={(e) => {
                handleMenuKeyDown(e);
                if (e.key === "Tab") setOpen(false);
              }}
              {...panelMotion(side)}
              style={{ transformOrigin: originFor(side, align, isRtl) }}
              className={cn(
                "min-w-[13rem] rounded-2xl bg-white p-1.5 shadow-e3",
                className,
              )}
            >
              {items.map((item, i) => {
                if (item.type === "separator")
                  return (
                    <div
                      key={i}
                      role="separator"
                      className="my-1.5 h-px bg-primary/[0.08]"
                    />
                  );
                if (item.type === "label")
                  return (
                    <div
                      key={i}
                      role="presentation"
                      className="px-3 pb-1 pt-2 text-eyebrow uppercase font-semibold text-primary-500"
                    >
                      {item.label}
                    </div>
                  );
                const inner = (
                  <>
                    {item.icon && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex shrink-0",
                          item.destructive
                            ? "text-accent-700"
                            : "text-primary-500 group-hover:text-primary-800",
                        )}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      {item.description && (
                        <span className="block text-meta font-normal text-primary-500">
                          {item.description}
                        </span>
                      )}
                    </span>
                    {item.meta && (
                      <span className="shrink-0 text-meta text-primary-500">
                        {item.meta}
                      </span>
                    )}
                  </>
                );
                if (item.href && !item.disabled) {
                  return (
                    <Link
                      key={i}
                      href={item.href}
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => setOpen(false)}
                      className={itemClass(item.destructive)}
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    disabled={item.disabled}
                    onClick={() => {
                      item.onSelect?.();
                      closeAndReturn();
                    }}
                    className={itemClass(item.destructive)}
                  >
                    {inner}
                  </button>
                );
              })}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
