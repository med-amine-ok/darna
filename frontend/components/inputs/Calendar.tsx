"use client";

import React from "react";
import { DateRange, Range, RangeKeyDict } from "react-date-range";

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
  return (
    <div className="darna-calendar-wrapper">
      <DateRange
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
