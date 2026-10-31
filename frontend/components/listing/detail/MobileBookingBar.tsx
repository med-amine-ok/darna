"use client";

import React from "react";
import { Button } from "@/components/ui";

interface MobileBookingBarProps {
  /** Price headline (usually an AnimatedNumber). */
  price: React.ReactNode;
  /** Small word after the price ("total", "/ person"). */
  priceSuffix?: React.ReactNode;
  /** Second line: dates, room or departure. Rendered as a button that opens the sheet. */
  detail?: React.ReactNode;
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
  /** Accessible description for the detail button. */
  detailLabel?: string;
}

/**
 * Sticky bottom booking bar for phones and tablets (Airbnb pattern): glass, e4,
 * safe-area padding, price + dates on the reading start, primary CTA on the end.
 */
export default function MobileBookingBar({ price, priceSuffix, detail, ctaLabel, onCta, disabled, detailLabel }: MobileBookingBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-primary/[0.08] shadow-e4 px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-semibold text-title text-primary-900 tabular-nums">{price}</span>
            {priceSuffix && <span className="text-meta text-primary-500">{priceSuffix}</span>}
          </p>
          {detail && (
            <button
              type="button"
              onClick={onCta}
              aria-label={detailLabel}
              className="block max-w-full truncate text-meta font-medium text-primary-700 underline underline-offset-2 decoration-primary/30 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              {detail}
            </button>
          )}
        </div>
        <Button size="lg" onClick={onCta} disabled={disabled} aria-haspopup="dialog" className="shrink-0">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
