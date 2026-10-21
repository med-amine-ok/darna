"use client";

import React from "react";
import { Range, RangeKeyDict } from "react-date-range";
import Calendar from "@/components/inputs/Calendar";

interface WhenPopoverProps {
  dateRange: Range;
  onChangeDateRange: (range: Range) => void;
  onClear?: () => void;
  onApply?: () => void;
  label?: string;
}

export default function WhenPopover({
  dateRange,
  onChangeDateRange,
  onClear,
  onApply,
  label = "Select dates",
}: WhenPopoverProps) {
  const handleChange = (ranges: RangeKeyDict) => {
    if (ranges.selection) {
      onChangeDateRange(ranges.selection);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-tertiary/70 p-4 w-auto max-w-[calc(100vw-32px)] z-50">
      <div className="flex items-center justify-between px-2 pb-3 border-b border-tertiary/30 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-accent hover:underline cursor-pointer"
          >
            Clear dates
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Calendar value={dateRange} onChange={handleChange} />
      </div>

      {onApply && (
        <div className="pt-3 border-t border-tertiary/30 flex justify-end">
          <button
            type="button"
            onClick={onApply}
            className="px-5 py-2 rounded-full bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
