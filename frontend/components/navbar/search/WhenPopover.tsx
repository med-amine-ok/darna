"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Range, RangeKeyDict } from "react-date-range";
import Calendar from "@/components/inputs/Calendar";
import { Chip } from "@/components/ui/Chip";
import Button from "@/components/ui/Button";

/** Flexible-date options (UI only: shown in the summary, not sent to the search). */
export const FLEX_OPTIONS = [0, 1, 2, 3, 7] as const;
export type FlexDays = (typeof FLEX_OPTIONS)[number];

interface WhenPopoverProps {
  dateRange: Range;
  onChangeDateRange: (range: Range) => void;
  onClear?: () => void;
  onApply?: () => void;
  label?: string;
  flexDays?: FlexDays;
  onFlexDaysChange?: (days: FlexDays) => void;
}

export default function WhenPopover({ dateRange, onChangeDateRange, onClear, onApply, label, flexDays = 0, onFlexDaysChange }: WhenPopoverProps) {
  const t = useTranslations("search");
  const handleChange = (ranges: RangeKeyDict) => {
    if (ranges.selection) onChangeDateRange(ranges.selection);
  };

  return (
    <div className="max-w-[calc(100vw-2rem)]">
      <div className="flex items-center justify-between gap-4 px-1 pb-2">
        <h2 className="text-eyebrow uppercase font-semibold text-primary-500">{label ?? t("selectDates")}</h2>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded text-meta font-semibold text-primary-700 underline underline-offset-4 cursor-pointer hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            {t("clearDates")}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Calendar value={dateRange} onChange={handleChange} />
      </div>

      <div className="mt-2 flex flex-col gap-3 border-t border-primary/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
        {onFlexDaysChange && (
          <div role="group" aria-label={t("flex.label")} className="no-scrollbar flex gap-2 overflow-x-auto">
            {FLEX_OPTIONS.map((days) => (
              <Chip key={days} size="sm" selected={flexDays === days} onSelectedChange={() => onFlexDaysChange(days)}>
                {days === 0 ? t("flex.exact") : t("flex.plusMinus", { count: days })}
              </Chip>
            ))}
          </div>
        )}
        {onApply && (
          <Button variant="secondary" size="sm" onClick={onApply} className="shrink-0 self-end sm:self-auto">
            {t("done")}
          </Button>
        )}
      </div>
    </div>
  );
}
