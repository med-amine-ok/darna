"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { Listing, Reservation, User } from "@/types";
import {
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandFilterIcon,
  BrandLockIcon,
  BrandDoorIcon,
  BrandClockIcon,
  BrandBedIcon,
  BrandCloseIcon,
} from "@/components/icons";
import { toast } from "react-toastify";

type CalendarView = "month" | "week" | "day" | "year";

interface HostCalendarClientProps {
  hostListings: Listing[];
  reservations: Reservation[];
  currentUser?: User | null;
}

// Listing color palette for multi-listing indicators
const LISTING_COLORS = [
  { bg: "bg-emerald-600", border: "border-emerald-600", text: "text-emerald-700", light: "bg-emerald-50" },
  { bg: "bg-[#C96F4F]", border: "border-[#C96F4F]", text: "text-[#C96F4F]", light: "bg-[#C96F4F]/10" },
  { bg: "bg-[#6B7F5B]", border: "border-[#6B7F5B]", text: "text-[#6B7F5B]", light: "bg-[#6B7F5B]/10" },
  { bg: "bg-amber-600", border: "border-amber-600", text: "text-amber-700", light: "bg-amber-50" },
  { bg: "bg-blue-600", border: "border-blue-600", text: "text-blue-700", light: "bg-blue-50" },
];

export default function HostCalendarClient({
  hostListings,
  reservations,
  currentUser,
}: HostCalendarClientProps) {
  const safeListings: Listing[] = useMemo(() => {
    if (hostListings && hostListings.length > 0) return hostListings;
    return [
      {
        id: "lst_tipaza_villa",
        title: "Algerian Coastal Villa",
        description: "Luxurious coastal villa overlooking Tipaza ruins and the sea.",
        city: "Tipaza",
        price: 18500,
        category: "home" as const,
        type: "Villa",
        ownerType: "individual" as const,
        hostUserId: currentUser?.id || "usr_amina",
        imageSrc: ["/assets/hero.jpg"],
        createdAt: new Date().toISOString(),
        locationValue: "Tipaza",
        country: "Algeria",
        latlng: [36.7538, 3.0588] as [number, number],
        guestCount: 4,
        bedroomCount: 2,
        roomCount: 3,
        bathroomCount: 2,
        amenities: ["wifi", "air_conditioning"],
        houseRules: ["No smoking"],
        cancellationPolicy: "flexible" as const,
        instantBook: true,
        rating: 5.0,
        reviewCount: 0,
        bookingsCount: 0,
        status: "active" as const,
      },
    ];
  }, [hostListings, currentUser]);

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 7)); // Oct 7, 2026
  const [view, setView] = useState<CalendarView>("month");
  const [selectedListingId, setSelectedListingId] = useState<string>("all");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("all");

  // Blocked dates state: mapping "listingId_YYYY-MM-DD" -> true
  const [blockedDates, setBlockedDates] = useState<Record<string, boolean>>({
    [`${safeListings[0]?.id || "lst_tipaza_villa"}_2026-10-18`]: true,
    [`${safeListings[0]?.id || "lst_tipaza_villa"}_2026-10-19`]: true,
  });

  // Per-date price override state: mapping "listingId_YYYY-MM-DD" -> number
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  // Active selected day detail sheet/popover
  const [activeDay, setActiveDay] = useState<Date | null>(null);
  const [overridePriceInput, setOverridePriceInput] = useState<string>("");

  // Map listing colors
  const listingColorMap = useMemo(() => {
    const map: Record<string, typeof LISTING_COLORS[0]> = {};
    safeListings.forEach((l, idx) => {
      if (l?.id) {
        map[l.id] = LISTING_COLORS[idx % LISTING_COLORS.length];
      }
    });
    return map;
  }, [safeListings]);

  // Active listing if single selected
  const activeListing = useMemo(() => {
    return safeListings.find((l) => l.id === selectedListingId) || safeListings[0];
  }, [safeListings, selectedListingId]);

  // Navigate forward/back
  const handlePrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else if (view === "day") setCurrentDate(subDays(currentDate, 1));
    else if (view === "year") setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else if (view === "day") setCurrentDate(addDays(currentDate, 1));
    else if (view === "year") setCurrentDate(addYears(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 7));
  };

  // Check if a day has bookings
  const getBookingsForDay = (date: Date) => {
    return reservations.filter((res) => {
      if (res.status === "cancelled") return false;
      if (selectedListingId !== "all" && res.listingId !== selectedListingId) return false;
      const start = parseISO(res.startDate);
      const end = parseISO(res.endDate);
      return isWithinInterval(date, { start, end });
    });
  };

  // Check if a day is blocked for active listing
  const isDayBlocked = (date: Date, listingId?: string) => {
    if (!listingId) return false;
    const key = `${listingId}_${format(date, "yyyy-MM-dd")}`;
    return !!blockedDates[key];
  };

  // Get price for a day
  const getDayPrice = (date: Date, listing?: Listing) => {
    if (!listing) return 15000;
    const key = `${listing.id}_${format(date, "yyyy-MM-dd")}`;
    if (priceOverrides[key]) return priceOverrides[key];
    return listing.price || 15000;
  };

  // Toggle blocked status for day
  const handleToggleBlock = (date: Date) => {
    const targetListingId = selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId;
    if (!targetListingId) return;
    const key = `${targetListingId}_${format(date, "yyyy-MM-dd")}`;
    const nextState = !blockedDates[key];
    setBlockedDates((prev) => ({
      ...prev,
      [key]: nextState,
    }));
    toast.info(nextState ? "Date blocked from bookings" : "Date reopened for bookings");
  };

  // Save price override
  const handleSavePriceOverride = (date: Date) => {
    const targetListingId = selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId;
    if (!targetListingId) return;
    const parsed = parseInt(overridePriceInput, 10);
    const key = `${targetListingId}_${format(date, "yyyy-MM-dd")}`;
    if (isNaN(parsed) || parsed <= 0) {
      setPriceOverrides((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      toast.info("Restored standard listing price.");
    } else {
      setPriceOverrides((prev) => ({
        ...prev,
        [key]: parsed,
      }));
      toast.success(`Nightly rate set to ${parsed.toLocaleString()} DZD`);
    }
    setOverridePriceInput("");
  };

  // Open day detail
  const handleDayClick = (date: Date) => {
    setActiveDay(date);
    const targetListingId = selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId;
    const key = `${targetListingId}_${format(date, "yyyy-MM-dd")}`;
    if (priceOverrides[key]) {
      setOverridePriceInput(priceOverrides[key].toString());
    } else {
      setOverridePriceInput("");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
              Host Calendar & Availability
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
              date-fns Scheduler
            </span>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            Manage real-time availability, block maintenance dates, and configure custom seasonal DZD rates.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-tertiary/70 shadow-2xs self-start md:self-auto">
          {(["month", "week", "day", "year"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                view === v
                  ? "bg-primary text-white shadow-2xs"
                  : "text-neutral-600 hover:text-primary"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar: Navigation & Listing Chips */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 mb-6 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2 sm:gap-4 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 transition border border-tertiary/60"
              title="Previous interval"
            >
              <BrandChevronLeftIcon size={18} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 transition border border-tertiary/60"
              title="Next interval"
            >
              <BrandChevronRightIcon size={18} className="rtl:rotate-180" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-serif font-bold text-primary min-w-[160px] text-center">
            {view === "year"
              ? format(currentDate, "yyyy")
              : view === "day"
              ? format(currentDate, "MMMM d, yyyy")
              : format(currentDate, "MMMM yyyy")}
          </h2>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition shadow-2xs"
          >
            Today
          </button>
        </div>

        {/* Listing Filter Selector & Legend */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          <label htmlFor="calendar-property-select" className="text-xs font-bold text-neutral-500 flex items-center gap-1">
            <BrandFilterIcon size={14} /> Property:
          </label>
          <select
            id="calendar-property-select"
            value={selectedListingId}
            onChange={(e) => {
              setSelectedListingId(e.target.value);
              setSelectedRoomTypeId("all");
            }}
            className="px-3 py-1.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary flex-1 lg:flex-none lg:w-56"
          >
            <option value="all">All Properties ({safeListings.length})</option>
            {safeListings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} ({l.city})
              </option>
            ))}
          </select>

          {/* Room Type Sub-filter (Section 2) */}
          {activeListing?.roomTypes && activeListing.roomTypes.length > 0 && (
            <div className="flex items-center gap-1.5 ms-1">
              <label htmlFor="calendar-room-select" className="text-xs font-bold text-neutral-500 flex items-center gap-1">
                <BrandBedIcon size={14} className="text-secondary" /> Unit:
              </label>
              <select
                id="calendar-room-select"
                value={selectedRoomTypeId}
                onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                className="px-3 py-1.5 bg-neutral-50 border border-secondary/60 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
              >
                <option value="all">All Units ({activeListing.roomTypes.length})</option>
                {activeListing.roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({rt.bookingUnit === "bed" ? `${rt.inventoryCount || rt.totalInventory} beds` : `${rt.inventoryCount || rt.totalInventory} rooms`})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Listing Color Chips */}
          <div className="hidden sm:flex items-center gap-2 ms-2">
            {safeListings.slice(0, 3).map((l) => {
              const color = listingColorMap[l.id] || LISTING_COLORS[0];
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-50 px-2 py-1 rounded-lg border border-tertiary/40"
                >
                  <span className={`w-2 h-2 rounded-full ${color.bg}`} />
                  <span className="truncate max-w-[100px]">{(l.title || "Villa").split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* VIEW: MONTH GRID */}
      {view === "month" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[320px] sm:min-w-0">
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 border-b border-tertiary/60 bg-neutral-50 text-center py-2.5 text-xs font-bold text-neutral-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                  <div key={dayName} className="capitalize">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Month Matrix */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-tertiary/40">
                {(() => {
                  const monthStart = startOfMonth(currentDate);
                  const monthEnd = endOfMonth(monthStart);
                  const startDate = startOfWeek(monthStart);
                  const endDate = endOfWeek(monthEnd);
                  const days = eachDayOfInterval({ start: startDate, end: endDate });

                  return days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date(2026, 9, 7));
                    const dayBookings = getBookingsForDay(day);
                    const isBlocked = isDayBlocked(
                      day,
                      selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId
                    );
                    const price = getDayPrice(day, activeListing);
                    const isCustomPrice = !!priceOverrides[`${activeListing?.id || safeListings[0]?.id}_${format(day, "yyyy-MM-dd")}`];

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={`min-h-[90px] sm:min-h-[120px] p-1.5 sm:p-2 transition cursor-pointer flex flex-col justify-between ${
                          !isCurrentMonth
                            ? "bg-neutral-50/60 opacity-40"
                            : isBlocked
                            ? "bg-neutral-100/80"
                            : "hover:bg-primary/5"
                        }`}
                      >
                        {/* Top: Day Number + Price (stacked cleanly on mobile, side-by-side on desktop) */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 ${
                              isToday
                                ? "bg-primary text-white"
                                : "text-neutral-700"
                            }`}
                          >
                            {format(day, "d")}
                          </span>

                          {/* Nightly Price Badge */}
                          {isCurrentMonth && !isBlocked && (
                            <span
                              className={`text-[9px] sm:text-[11px] font-mono font-bold px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-md truncate max-w-full ${
                                isCustomPrice
                                  ? "bg-accent/15 text-accent border border-accent/30"
                                  : "text-neutral-500"
                              }`}
                            >
                              {price.toLocaleString()} DA
                            </span>
                          )}

                          {/* Blocked icon */}
                          {isBlocked && (
                            <span className="text-neutral-400 shrink-0" title="Blocked">
                              <BrandLockIcon size={14} />
                            </span>
                          )}
                        </div>

                        {/* Middle: Booking indicators / pills */}
                        <div className="space-y-1 my-1 min-w-0">
                          {dayBookings.slice(0, 2).map((b) => {
                            const color = listingColorMap[b.listingId] || LISTING_COLORS[0];
                            return (
                              <div
                                key={b.id}
                                className={`text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md truncate ${color.light} ${color.text} border ${color.border}/30 flex items-center gap-1 min-w-0`}
                                title={`${b.user?.name || "Guest"} - ${b.listing?.title}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${color.bg} shrink-0`} />
                                <span className="truncate">{b.user?.name || "Guest"}</span>
                              </div>
                            );
                          })}
                          {dayBookings.length > 2 && (
                            <span className="text-[9px] font-bold text-neutral-400 block ps-1">
                              +{dayBookings.length - 2} more
                            </span>
                          )}
                        </div>

                        {/* Bottom: Blocked / Available status label */}
                        <div className="text-[10px] font-medium text-neutral-400">
                          {isBlocked ? (
                            <span className="text-neutral-400 font-semibold">Blocked</span>
                          ) : dayBookings.length > 0 ? (
                            <span className="text-secondary font-bold">Booked</span>
                          ) : (
                            <span className="text-emerald-600 font-medium opacity-70">Available</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: WEEK VIEW */}
      {view === "week" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-tertiary/60 bg-neutral-50 text-center py-3">
              {(() => {
                const weekStart = startOfWeek(currentDate);
                const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                return weekDays.map((d) => (
                  <div key={d.toISOString()} className="px-2">
                    <span className="block text-xs font-bold text-neutral-500 uppercase">
                      {format(d, "EEE")}
                    </span>
                    <span
                      className={`inline-block text-sm font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                        isSameDay(d, new Date(2026, 9, 7))
                          ? "bg-primary text-white"
                          : "text-primary"
                      }`}
                    >
                      {format(d, "d MMM")}
                    </span>
                  </div>
                ));
              })()}
            </div>

            {/* Week Listings Rows */}
            <div className="divide-y divide-tertiary/40">
              {safeListings.map((listing) => {
                const color = listingColorMap[listing.id] || LISTING_COLORS[0];
                const weekStart = startOfWeek(currentDate);
                const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

                return (
                  <div key={listing.id} className="p-3">
                    <div className="flex items-center gap-2 mb-2 font-bold text-xs text-primary">
                      <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                      <span>{listing.title}</span>
                      <span className="text-neutral-400 font-normal">({listing.city})</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((d) => {
                        const dayBookings = reservations.filter(
                          (r) =>
                            r.listingId === listing.id &&
                            r.status !== "cancelled" &&
                            isWithinInterval(d, {
                              start: parseISO(r.startDate),
                              end: parseISO(r.endDate),
                            })
                        );
                        const isBlocked = isDayBlocked(d, listing.id);
                        const price = getDayPrice(d, listing);

                        return (
                          <div
                            key={d.toISOString()}
                            onClick={() => handleDayClick(d)}
                            className={`p-2 rounded-xl border text-xs min-h-[90px] flex flex-col justify-between cursor-pointer transition ${
                              isBlocked
                                ? "bg-neutral-100 border-neutral-300 text-neutral-400"
                                : dayBookings.length > 0
                                ? `${color.light} ${color.border} ${color.text}`
                                : "bg-neutral-50/50 border-tertiary/60 hover:bg-white hover:border-primary"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold">{format(d, "d")}</span>
                              <span className="text-[10px] font-mono font-semibold">
                                {price.toLocaleString()} DA
                              </span>
                            </div>

                            {dayBookings.length > 0 ? (
                              <div className="font-bold truncate text-[11px]">
                                {dayBookings[0].user?.name || "Guest Stay"}
                              </div>
                            ) : isBlocked ? (
                              <div className="text-[10px] font-semibold text-neutral-400">Blocked</div>
                            ) : (
                              <div className="text-[10px] text-emerald-600 font-medium">Open</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: DAY VIEW (VERTICAL AGENDA) */}
      {view === "day" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-tertiary/60 mb-6">
            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Daily Operations Timeline
              </span>
              <h3 className="font-serif text-2xl font-black text-primary">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleToggleBlock(currentDate)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-tertiary/80 hover:bg-neutral-50 transition flex items-center gap-1.5"
            >
              <BrandLockIcon size={16} />
              <span>Toggle Day Block</span>
            </button>
          </div>

          {/* Hourly Timeline */}
          <div className="space-y-4">
            {[
              { time: "08:00", title: "Morning Overview", desc: "Fleet readiness and housekeeping check" },
              { time: "11:00", title: "Standard Check-out", desc: "Guests departing prior stays" },
              { time: "13:00", title: "Room Turnover & Cleaning", desc: "Disinfection and fresh Algerian linen prep" },
              { time: "15:00", title: "Guest Check-in Window Opens", desc: "Smart lock access and guest welcome" },
              { time: "20:00", title: "Evening Concierge", desc: "Guest assistance and quiet hours notice" },
            ].map((slot) => {
              const bookings = getBookingsForDay(currentDate);

              return (
                <div
                  key={slot.time}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-neutral-50/70 border border-tertiary/40 hover:bg-white hover:shadow-xs transition"
                >
                  <div className="w-16 shrink-0 font-mono font-bold text-sm text-secondary flex items-center gap-1">
                    <BrandClockIcon size={16} />
                    <span>{slot.time}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-primary text-sm">{slot.title}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{slot.desc}</p>

                    {slot.time === "15:00" && bookings.length > 0 && (
                      <div className="mt-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                          Active Guests Arriving Today
                        </span>
                        {bookings.map((b) => (
                          <div key={b.id} className="flex items-center justify-between text-xs mt-1 text-emerald-900 font-semibold">
                            <span>{b.user?.name} ({b.guestsCount} guests)</span>
                            <span className="font-mono">{b.listing?.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: YEAR VIEW (12-MONTH DENSITY OVERVIEW) */}
      {view === "year" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const monthDate = new Date(currentDate.getFullYear(), monthIdx, 1);
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(monthDate);
            const sDate = startOfWeek(mStart);
            const eDate = endOfWeek(mEnd);
            const daysInMonth = eachDayOfInterval({ start: sDate, end: eDate });

            return (
              <div
                key={monthIdx}
                className="bg-white rounded-3xl border border-tertiary/70 p-4 shadow-2xs hover:shadow-md transition"
              >
                <div
                  onClick={() => {
                    setCurrentDate(monthDate);
                    setView("month");
                  }}
                  className="flex items-center justify-between pb-2 mb-2 border-b border-tertiary/40 cursor-pointer group"
                >
                  <h4 className="font-serif font-bold text-sm text-primary group-hover:text-accent transition">
                    {format(monthDate, "MMMM")}
                  </h4>
                  <span className="text-[10px] font-bold text-neutral-400 group-hover:text-primary">
                    View Month →
                  </span>
                </div>

                {/* Mini day of week headers */}
                <div className="grid grid-cols-7 text-center text-[9px] font-bold text-neutral-400 mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>

                {/* Mini days grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {daysInMonth.map((d) => {
                    const inThisMonth = isSameMonth(d, monthDate);
                    const bCount = getBookingsForDay(d).length;
                    const isBlocked = isDayBlocked(
                      d,
                      selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId
                    );

                    return (
                      <div
                        key={d.toISOString()}
                        onClick={() => {
                          setCurrentDate(d);
                          setView("month");
                        }}
                        className={`text-[9px] font-mono h-6 flex items-center justify-center rounded cursor-pointer transition ${
                          !inThisMonth
                            ? "opacity-10 text-neutral-300"
                            : isBlocked
                            ? "bg-neutral-200 text-neutral-500"
                            : bCount > 0
                            ? "bg-emerald-600 text-white font-bold"
                            : "hover:bg-neutral-100 text-neutral-700"
                        }`}
                        title={`${format(d, "MMM d")}: ${bCount > 0 ? "Booked" : isBlocked ? "Blocked" : "Available"}`}
                      >
                        {format(d, "d")}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Day Popover / Bottom Sheet Modal */}
      {activeDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/60 mb-4">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Date Customization
                </span>
                <h3 className="font-serif text-lg font-black text-primary">
                  {format(activeDay, "EEEE, MMMM d, yyyy")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDay(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm"
              >
                <BrandCloseIcon size={16} />
              </button>
            </div>

            {/* Target Property */}
            <div className="mb-4">
              <label className="text-xs font-bold text-neutral-500 block mb-1">
                Property
              </label>
              <div className="text-xs font-bold text-primary bg-neutral-50 p-2.5 rounded-xl border border-tertiary/60 truncate">
                {activeListing?.title || "Property"} ({activeListing?.city || "Algeria"})
              </div>
            </div>

            {/* Availability status & Toggle */}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/60 mb-4 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-primary">Availability</span>
                <span className="text-xs text-neutral-500">
                  {isDayBlocked(activeDay, activeListing?.id || safeListings[0]?.id)
                    ? "Blocked from traveler searches"
                    : "Available for Instant Booking"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleBlock(activeDay)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isDayBlocked(activeDay, activeListing?.id || safeListings[0]?.id)
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                {isDayBlocked(activeDay, activeListing?.id || safeListings[0]?.id) ? (
                  <>
                    <BrandDoorIcon size={15} />
                    <span>Unblock</span>
                  </>
                ) : (
                  <>
                    <BrandLockIcon size={15} />
                    <span>Block Date</span>
                  </>
                )}
              </button>
            </div>

            {/* Nightly Price Override */}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/60 mb-6">
              <span className="block text-xs font-bold text-primary mb-1">
                Per-Date Price Override (DZD)
              </span>
              <p className="text-[11px] text-neutral-500 mb-3">
                Default rate: {(activeListing?.price || 15000).toLocaleString()} DZD / night. Leave blank to reset.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={overridePriceInput}
                    onChange={(e) => setOverridePriceInput(e.target.value)}
                    placeholder={(activeListing?.price || 15000).toString()}
                    className="w-full px-3 py-2 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    DZD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSavePriceOverride(activeDay)}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs"
                >
                  Save Rate
                </button>
              </div>
            </div>

            {/* Existing Bookings on date */}
            {getBookingsForDay(activeDay).length > 0 && (
              <div className="p-3 bg-primary/5 rounded-2xl border border-primary/20 mb-4">
                <span className="block text-xs font-bold text-primary mb-1">
                  Reservation on this Date
                </span>
                {getBookingsForDay(activeDay).map((b) => (
                  <div key={b.id} className="text-xs text-neutral-700 flex items-center justify-between">
                    <span>{b.user?.name} ({b.guestsCount} guests)</span>
                    <span className="font-mono font-bold text-primary">
                      {b.totalPrice.toLocaleString()} DZD
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveDay(null)}
              className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
