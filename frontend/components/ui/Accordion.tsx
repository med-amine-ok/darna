"use client";

/**
 * Accordion, disclosure list for FAQs, house rules, policies.
 *
 *   <Accordion
 *     items={[{ id: "cancel", title: "Cancellation policy", content: <p>…</p> }]}
 *     defaultOpen={["cancel"]}
 *     type="single"            // or "multiple"
 *   />
 *
 * Each header is a real <button aria-expanded aria-controls> inside a heading (level via
 * `headingLevel`). Panels open/close with a Framer height animation (dur.base, ease.out);
 * items listed in `defaultOpen` render expanded in the server HTML with no entrance animation.
 * Appearance "card" = white e1 surface with hairline dividers; "plain" = dividers only.
 */

import React, { useId, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { BrandChevronDownIcon } from "@/components/icons";
import { dur, ease } from "@/lib/motion";
import { cn, focusRingInset } from "./cn";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  /** Optional secondary line under the title. */
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  type?: "single" | "multiple";
  defaultOpen?: string[];
  appearance?: "card" | "plain";
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

export function Accordion({
  items,
  type = "single",
  defaultOpen = [],
  appearance = "card",
  headingLevel = 3,
  className,
}: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const Heading = `h${headingLevel}` as "h3";

  const toggle = (id: string) =>
    setOpen((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : type === "single"
          ? [id]
          : [...cur, id],
    );

  return (
    <div
      className={cn(
        appearance === "card" ? "rounded-2xl bg-white shadow-e1 px-5" : "",
        "divide-y divide-primary/[0.08]",
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const btnId = `${baseId}-${item.id}-btn`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <Heading className="m-0">
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
                className={cn(
                  "group flex w-full items-center gap-3 py-4 text-start cursor-pointer rounded-lg disabled:cursor-not-allowed disabled:opacity-50",
                  focusRingInset,
                )}
              >
                {item.icon && (
                  <span
                    aria-hidden="true"
                    className="inline-flex shrink-0 text-secondary-600"
                  >
                    {item.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-title font-semibold text-primary-900">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="mt-0.5 block text-meta text-primary-500">
                      {item.subtitle}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-600",
                    "transition-[transform,background-color] duration-base ease-out group-hover:bg-primary/[0.06]",
                    isOpen && "rotate-180",
                  )}
                >
                  <BrandChevronDownIcon size={18} />
                </span>
              </button>
            </Heading>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  key="panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: { duration: dur.base, ease: ease.out },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: { duration: dur.fast, ease: ease.inOut },
                  }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 text-body text-primary-700">
                    {item.content}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;
