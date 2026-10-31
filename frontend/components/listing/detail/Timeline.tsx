"use client";

import React from "react";
import { m } from "framer-motion";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { revealViewport } from "@/lib/motion";

export interface TimelineStep {
  key: string | number;
  /** Short marker inside the node ("1", "2"…). */
  marker: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Vertical itinerary timeline. The rail draws down when it scrolls into view
 * (decoration only); steps reveal with a stagger through data-reveal, so the
 * text is always in the server HTML. Logical properties, mirrors in RTL.
 */
export default function Timeline({ steps, label }: { steps: TimelineStep[]; label?: string }) {
  return (
    <div className="relative">
      <m.span
        aria-hidden="true"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={revealViewport}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ originY: 0 }}
        className="absolute top-5 bottom-5 start-5 w-px -translate-x-1/2 rtl:translate-x-1/2 bg-gradient-to-b from-accent-300 via-secondary-300 to-tertiary-300"
      />
      <RevealGroup as="ul" each={0.08} className="space-y-8">
        {steps.map((step) => (
          <RevealItem as="li" key={step.key} className="relative ps-16">
            <span
              aria-hidden="true"
              className="absolute start-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-e2 ring-4 ring-darnaBg font-serif text-title text-accent-700 tabular-nums"
            >
              {step.marker}
            </span>
            {step.eyebrow && <p className="text-eyebrow uppercase text-secondary-700 rtl:normal-case rtl:tracking-normal">{step.eyebrow}</p>}
            <h3 className="mt-1 font-serif text-heading text-primary-900">
              {label && <span className="sr-only">{label} </span>}
              {step.title}
            </h3>
            {step.children && <div className="mt-3">{step.children}</div>}
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
