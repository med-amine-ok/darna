"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface MiniCalendarProps {
  bookedDays?: number[];
  maintenanceDays?: number[];
  monthName?: string;
  year?: number;
  className?: string;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  bookedDays = [15, 16, 17, 18, 19, 20, 21],
  maintenanceDays = [8, 9],
  monthName = "Avril 2024",
  year = 2024,
  className = "",
}) => {
  const [currentMonth, setCurrentMonth] = useState(monthName);
  const daysInMonth = 30; // April has 30 days
  const startDayOffset = 0; // Monday start
  const daysOfWeek = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  return (
    <div
      className={`p-3.5 rounded-2xl border border-tertiary-200/80 bg-white shadow-xs ${className}`}
    >
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <button
          type="button"
          onClick={() => setCurrentMonth("Mars 2024")}
          className="p-1 rounded-md text-neutral-400 hover:text-primary hover:bg-neutral-100 transition"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
        <span className="text-xs font-bold text-primary">{currentMonth}</span>
        <button
          type="button"
          onClick={() => setCurrentMonth("Mai 2024")}
          className="p-1 rounded-md text-neutral-400 hover:text-primary hover:bg-neutral-100 transition"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-neutral-400 mb-1">
        {daysOfWeek.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const isBooked = bookedDays.includes(dayNumber);
          const isMaintenance = maintenanceDays.includes(dayNumber);

          let cellClass = "text-neutral-700 hover:bg-neutral-100";
          if (isBooked) {
            cellClass = "bg-secondary text-white font-bold rounded-lg shadow-2xs";
          } else if (isMaintenance) {
            cellClass = "bg-tertiary text-tertiary-950 font-bold rounded-lg";
          }

          return (
            <div
              key={i}
              className={`h-7 w-full flex items-center justify-center rounded-md transition select-none cursor-default ${cellClass}`}
            >
              {dayNumber}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-neutral-100 text-[10px] text-neutral-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span>Réservé</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-200" />
          <span>Disponible</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-tertiary" />
          <span>Maintenance</span>
        </span>
      </div>
    </div>
  );
};
