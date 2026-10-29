"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  label,
}: WhenPopoverProps) {
  const t = useTranslations("search");
  const handleChange = (ranges: RangeKeyDict) => {
    if (ranges.selection) {
      onChangeDateRange(ranges.selection);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-tertiary/70 p-4 w-auto max-w-[calc(100vw-32px)] z-50">
      <div className="flex items-center justify-between px-2 pb-3 border-b border-tertiary/30 mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
          {label ?? t("selectDates")}
        </h2>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-accent-700 hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            {t("clearDates")}
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
            className="px-5 py-2 rounded-full bg-accent-600 text-white text-xs font-semibold hover:bg-accent-700 transition shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            {t("done")}
          </button>
        </div>
      )}
    </div>
  );
}
