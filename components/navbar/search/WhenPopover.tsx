"use client";

import React, { useState } from "react";
import { format, addDays, nextFriday, nextSunday, isSameDay, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useTranslations, useLocale } from "next-intl";

interface Props {
  startDate: Date | null;
  endDate: Date | null;
  onSelectRange: (start: Date, end: Date) => void;
}

export default function WhenPopover({
  startDate,
  endDate,
  onSelectRange,
}: Props) {
  const t = useTranslations("nav");
  const locale = useLocale();

  // Use current local date
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const weekendStart = nextFriday(today);
  const weekendEnd = nextSunday(weekendStart);

  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [rangeStart, setRangeStart] = useState<Date | null>(startDate);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(endDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(day);
      setRangeEnd(null);
    } else if (rangeStart && !rangeEnd) {
      if (day < rangeStart) {
        setRangeStart(day);
        setRangeEnd(null);
      } else {
        setRangeEnd(day);
        onSelectRange(rangeStart, day);
      }
    }
  };

  const handleSelectPreset = (start: Date, end: Date) => {
    setRangeStart(start);
    setRangeEnd(end);
    onSelectRange(start, end);
  };

  const weekDayInitials = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-neutral-200/80 p-6 z-50 flex flex-col md:flex-row gap-6">
      {/* Left Column: Quick Presets matching Image 2 */}
      <div className="flex md:flex-col gap-3 w-full md:w-44 flex-shrink-0">
        {/* Today Card */}
        <button
          type="button"
          onClick={() => handleSelectPreset(today, today)}
          className="flex-1 p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 transition text-start hover:shadow-2xs cursor-pointer bg-white"
        >
          <div className="font-bold text-neutral-900 text-sm">
            {t("today")}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {format(today, "MMM d")}
          </div>
        </button>

        {/* Tomorrow Card */}
        <button
          type="button"
          onClick={() => handleSelectPreset(tomorrow, tomorrow)}
          className="flex-1 p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 transition text-start hover:shadow-2xs cursor-pointer bg-white"
        >
          <div className="font-bold text-neutral-900 text-sm">
            {t("tomorrow")}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {format(tomorrow, "MMM d")}
          </div>
        </button>

        {/* This Weekend Card */}
        <button
          type="button"
          onClick={() => handleSelectPreset(weekendStart, weekendEnd)}
          className="flex-1 p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 transition text-start hover:shadow-2xs cursor-pointer bg-white"
        >
          <div className="font-bold text-neutral-900 text-sm">
            {t("thisWeekend")}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {format(weekendStart, "MMM d")} – {format(weekendEnd, "d")}
          </div>
        </button>
      </div>

      {/* Right Column: Month Calendar matching Image 2 */}
      <div className="flex-1 min-w-[280px]">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-full text-neutral-600 hover:bg-neutral-100 transition"
          >
            <MdChevronLeft size={20} className="rtl:rotate-180" />
          </button>
          <h3 className="font-bold text-sm text-neutral-900">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-full text-neutral-600 hover:bg-neutral-100 transition"
          >
            <MdChevronRight size={20} className="rtl:rotate-180" />
          </button>
        </div>

        {/* Weekday Initials */}
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-400 mb-2">
          {weekDayInitials.map((initial, i) => (
            <div key={i} className="py-1">
              {initial}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
          {/* Empty cells before first day */}
          {[...Array(startDayOfWeek)].map((_, i) => (
            <div key={`empty-${i}`} className="h-9 w-9" />
          ))}

          {/* Days */}
          {daysInMonth.map((day) => {
            const isStart = rangeStart && isSameDay(day, rangeStart);
            const isEnd = rangeEnd && isSameDay(day, rangeEnd);
            const inRange =
              rangeStart && rangeEnd && isWithinInterval(day, { start: rangeStart, end: rangeEnd });
            const isToday = isSameDay(day, today);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDateClick(day)}
                className={`h-9 w-9 mx-auto rounded-full flex items-center justify-center font-medium transition cursor-pointer text-xs ${
                  isStart || isEnd
                    ? "bg-neutral-900 text-white font-bold"
                    : inRange
                    ? "bg-neutral-100 text-neutral-900"
                    : isToday
                    ? "border border-neutral-900 text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
