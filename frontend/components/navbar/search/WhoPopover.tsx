"use client";

import React from "react";
import Counter from "@/components/inputs/Counter";

interface WhoPopoverProps {
  guestCount: number;
  onChangeGuests: (count: number) => void;
  title?: string;
  subtitle?: string;
  onApply?: () => void;
}

export default function WhoPopover({
  guestCount,
  onChangeGuests,
  title = "Guests",
  subtitle = "Ages 13 or above",
  onApply,
}: WhoPopoverProps) {
  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-tertiary/70 p-5 w-72 sm:w-80 max-w-[calc(100vw-32px)] z-50">
      <div className="mb-2">
        <Counter
          title={title}
          subtitle={subtitle}
          value={guestCount}
          onChange={onChangeGuests}
        />
      </div>

      {onApply && (
        <div className="pt-3 border-t border-tertiary/30 flex justify-end">
          <button
            type="button"
            onClick={onApply}
            className="px-5 py-2 rounded-full bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition shadow-sm cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
