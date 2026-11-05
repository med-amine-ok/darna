"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { DateRange, Range, RangeKeyDict } from "react-date-range";
import { dateFnsLocale } from "@/lib/i18n/date-locale";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface CalendarProps {
  value: Range;
  onChange: (value: RangeKeyDict) => void;
  disabledDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
}

export default function Calendar({
  value,
  onChange,
  disabledDates,
  minDate,
  maxDate,
}: CalendarProps) {
  const locale = useLocale();
  const t = useTranslations("common");

  return (
    // Styled by the "BLADUS kit, date range picker" block in styles/globals.css (range tint,
    // today dot, muted past days, chevron arrows mirrored in RTL).
    <div className="darna-calendar-wrapper w-full flex justify-center">
      <DateRange
        locale={dateFnsLocale(locale)}
        ariaLabels={{
          prevButton: t("previousMonth"),
          nextButton: t("nextMonth"),
          monthPicker: t("monthPicker"),
          yearPicker: t("yearPicker"),
        }}
        rangeColors={["#0B57D0"]}
        ranges={[value]}
        date={new Date()}
        onChange={onChange}
        direction="vertical"
        showDateDisplay={false}
        minDate={minDate || new Date()}
        maxDate={maxDate}
        disabledDates={disabledDates}
      />
    </div>
  );
}
