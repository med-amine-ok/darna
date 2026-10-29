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
    // In RTL the month arrows swap sides with the flex row, so flip their glyphs too.
    <div className="darna-calendar-wrapper rtl:[&_.rdrNextPrevButton_i]:rotate-180">
      <DateRange
        locale={dateFnsLocale(locale)}
        ariaLabels={{
          prevButton: t("previousMonth"),
          nextButton: t("nextMonth"),
          monthPicker: t("monthPicker"),
          yearPicker: t("yearPicker"),
        }}
        rangeColors={["#C96F4F"]}
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
