"use client";

/**
 * Tabs + TabPanel, and SegmentedControl.
 *
 *   const [tab, setTab] = useState("upcoming");
 *   <Tabs id="trips" value={tab} onChange={setTab} ariaLabel="Trips"
 *     items={[{ value: "upcoming", label: "Upcoming", count: 3 }, { value: "past", label: "Past" }]} />
 *   <TabPanel tabsId="trips" value="upcoming" active={tab}>…</TabPanel>
 *
 *   <SegmentedControl ariaLabel="View" value={view} onChange={setView}
 *     options={[{ value: "grid", label: "Grid" }, { value: "map", label: "Map" }]} />
 *
 * Tabs: WAI-ARIA tablist with roving tabindex; Arrow keys (mirrored in RTL), Home/End,
 * automatic activation. The indicator slides between tabs with a shared layoutId
 * (`spring.layout`). Variants: "underline" (page sections) and "pill" (ink pill like the
 * home vertical switcher). SegmentedControl is a radiogroup with the same sliding pill on
 * a sunken track, use it for 2–4 mutually exclusive view options.
 */

import React, { useId, useRef } from "react";
import { m } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "./cn";
import { useIsRtl } from "./hooks";

export interface TabItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

function moveFocus(
  e: React.KeyboardEvent,
  container: HTMLElement | null,
  selector: string,
  isRtl: boolean,
  vertical = false,
): HTMLElement | null {
  if (!container) return null;
  const items = Array.from(
    container.querySelectorAll<HTMLElement>(selector),
  ).filter((el) => !el.hasAttribute("disabled"));
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = vertical ? "ArrowDown" : isRtl ? "ArrowLeft" : "ArrowRight";
  const prev = vertical ? "ArrowUp" : isRtl ? "ArrowRight" : "ArrowLeft";
  let target: HTMLElement | undefined;
  if (e.key === next) target = items[(i + 1) % items.length];
  else if (e.key === prev)
    target = items[(i - 1 + items.length) % items.length];
  else if (e.key === "Home") target = items[0];
  else if (e.key === "End") target = items[items.length - 1];
  if (!target) return null;
  e.preventDefault();
  target.focus();
  return target;
}

export interface TabsProps<T extends string = string> {
  /** Stable id used to link tabs and panels (`${id}-tab-${value}` / `${id}-panel-${value}`). */
  id: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  variant?: "underline" | "pill";
  className?: string;
}

export function Tabs<T extends string = string>({
  id,
  items,
  value,
  onChange,
  ariaLabel,
  variant = "underline",
  className,
}: TabsProps<T>) {
  const isRtl = useIsRtl();
  const listRef = useRef<HTMLDivElement>(null);
  const pill = variant === "pill";
  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        const el = moveFocus(e, listRef.current, '[role="tab"]', isRtl);
        const v = el?.dataset.value as T | undefined;
        if (v) onChange(v);
      }}
      className={cn(
        "relative flex max-w-full overflow-x-auto scrollbar-none",
        pill
          ? "inline-flex gap-1 rounded-full bg-white/80 p-1.5 shadow-e2"
          : "gap-6 border-b border-primary/[0.08]",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${id}-tab-${item.value}`}
            aria-selected={active}
            aria-controls={`${id}-panel-${item.value}`}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            data-value={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold cursor-pointer",
              "transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg",
              pill
                ? cn(
                    "rounded-full px-4 py-2.5",
                    active
                      ? "text-white"
                      : "text-primary-700 hover:text-primary-900",
                  )
                : cn(
                    "rounded-md pb-3 pt-2",
                    active
                      ? "text-primary-900"
                      : "text-primary-500 hover:text-primary-900",
                  ),
            )}
          >
            {active && (
              <m.span
                layoutId={`${id}-tab-indicator`}
                transition={spring.layout}
                aria-hidden="true"
                className={
                  pill
                    ? "absolute inset-0 rounded-full bg-primary-800 shadow-e2"
                    : "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-900"
                }
              />
            )}
            {item.icon && (
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-flex",
                  pill
                    ? active
                      ? "text-tertiary-200"
                      : "text-secondary-600"
                    : "",
                )}
              >
                {item.icon}
              </span>
            )}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "relative inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums",
                  active
                    ? pill
                      ? "bg-white/20 text-white"
                      : "bg-primary-800 text-white"
                    : "bg-primary/[0.07] text-primary-600",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  tabsId: string;
  value: string;
  /** The currently selected tab value. */
  active: string;
  children: React.ReactNode;
  className?: string;
  /** Keep inactive panels in the DOM (hidden) so their content is server-rendered. */
  keepMounted?: boolean;
}

export function TabPanel({
  tabsId,
  value,
  active,
  children,
  className,
  keepMounted,
}: TabPanelProps) {
  const isActive = value === active;
  if (!isActive && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      id={`${tabsId}-panel-${value}`}
      aria-labelledby={`${tabsId}-tab-${value}`}
      hidden={!isActive}
      tabIndex={0}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-4 rounded-xl",
        isActive && "enter-up",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ SegmentedControl */

export interface SegmentedControlProps<T extends string = string> {
  options: Array<{
    value: T;
    label: React.ReactNode;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  fullWidth,
  className,
}: SegmentedControlProps<T>) {
  const id = useId();
  const isRtl = useIsRtl();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        const el = moveFocus(e, ref.current, '[role="radio"]', isRtl);
        const v = el?.dataset.value as T | undefined;
        if (v) onChange(v);
      }}
      className={cn(
        "relative inline-flex gap-1 rounded-full bg-darnaBg-300 p-1 shadow-[inset_0_1px_2px_rgba(30,38,31,0.08)]",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={o.disabled}
            data-value={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold cursor-pointer",
              "transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
              size === "sm" ? "h-8 px-3 text-meta" : "h-10 px-4 text-sm",
              active
                ? "text-primary-900"
                : "text-primary-600 hover:text-primary-900",
            )}
          >
            {active && (
              <m.span
                layoutId={`${id}-segment`}
                transition={spring.layout}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-white shadow-e1"
              />
            )}
            {o.icon && (
              <span aria-hidden="true" className="relative inline-flex">
                {o.icon}
              </span>
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
