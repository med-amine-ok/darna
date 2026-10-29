"use client";

import React, { useState, useMemo, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
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
} from "date-fns";
import { DateAvailabilityOverride, Listing, Reservation, User } from "@/types";
import { Link } from "@/navigation";
import { setListingDatePriceAction, setListingDatesBlockedAction } from "@/app/actions/calendar";
import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import { toDateKey } from "@/lib/booking/dates";
import { formatDzd } from "@/lib/currency";
import { dateFnsLocale } from "@/lib/i18n/date-locale";
import Dialog from "@/components/ui/Dialog";
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
import { useActionError } from "@/hook/useActionError";

type CalendarView = "month" | "week" | "day" | "year";

interface HostCalendarClientProps {
  hostListings: Listing[];
  reservations: Reservation[];
  currentUser?: User | null;
  /** Persisted blocked dates / per-date prices for the host's listings. */
  overrides: DateAvailabilityOverride[];
}

/** Statuses that occupy a night on the host calendar. */
const OCCUPYING = new Set(["confirmed", "pending", "completed"]);

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const DAY_SLOTS = [
  { time: "08:00", key: "morning" },
  { time: "11:00", key: "checkout" },
  { time: "13:00", key: "turnover" },
  { time: "15:00", key: "checkin" },
  { time: "20:00", key: "evening" },
] as const;

function overrideMaps(overrides: DateAvailabilityOverride[]) {
  const blocked: Record<string, boolean> = {};
  const prices: Record<string, number> = {};
  for (const o of overrides) {
    if (o.isBlocked) blocked[`${o.listingId}_${o.date}`] = true;
    if (typeof o.customPrice === "number") prices[`${o.listingId}_${o.date}`] = o.customPrice;
  }
  return { blocked, prices };
}

// Listing color palette for multi-listing indicators
const LISTING_COLORS = [
  { bg: "bg-emerald-600", border: "border-emerald-600", text: "text-emerald-700", light: "bg-emerald-50" },
  { bg: "bg-[#C96F4F]", border: "border-[#C96F4F]", text: "text-accent-700", light: "bg-[#C96F4F]/10" },
  { bg: "bg-[#6B7F5B]", border: "border-[#6B7F5B]", text: "text-[#55664A]", light: "bg-[#6B7F5B]/10" },
  { bg: "bg-amber-600", border: "border-amber-600", text: "text-amber-800", light: "bg-amber-50" },
  { bg: "bg-blue-600", border: "border-blue-600", text: "text-blue-700", light: "bg-blue-50" },
];

export default function HostCalendarClient({
  hostListings,
  reservations,
  overrides,
}: HostCalendarClientProps) {
  const t = useTranslations("hostCalendar");
  const tHost = useTranslations("host.calendar");
  const tCommon = useTranslations("common");
  const errorText = useActionError();
  const locale = useLocale();
  const dfLocale = dateFnsLocale(locale);
  const weekOpts = { locale: dfLocale };
  const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: dfLocale });
  const money = (amount: number) => formatDzd(amount, locale);
  const priceInputId = useId();
  const priceHelpId = useId();
  const priceErrorId = useId();

  const safeListings: Listing[] = useMemo(() => hostListings || [], [hostListings]);

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [selectedListingId, setSelectedListingId] = useState<string>("all");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("all");

  // Persisted overrides, keyed "listingId_YYYY-MM-DD" (saved through server actions).
  const initialMaps = useMemo(() => overrideMaps(overrides), [overrides]);
  const [blockedDates, setBlockedDates] = useState<Record<string, boolean>>(initialMaps.blocked);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(initialMaps.prices);
  const [isSaving, setIsSaving] = useState(false);

  // Replace one listing's entries with the server's current state.
  const applyServerOverrides = (listingId: string, rows: DateAvailabilityOverride[]) => {
    const maps = overrideMaps(rows);
    const strip = <T,>(prev: Record<string, T>, next: Record<string, T>) => {
      const out: Record<string, T> = {};
      for (const [k, v] of Object.entries(prev)) if (!k.startsWith(`${listingId}_`)) out[k] = v;
      return { ...out, ...next };
    };
    setBlockedDates((prev) => strip(prev, maps.blocked));
    setPriceOverrides((prev) => strip(prev, maps.prices));
  };

  // Active selected day detail dialog
  const [activeDay, setActiveDay] = useState<Date | null>(null);
  const [overridePriceInput, setOverridePriceInput] = useState<string>("");
  const [priceError, setPriceError] = useState<string | null>(null);

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
    setCurrentDate(new Date());
  };

  // Check if a day has bookings
  const getBookingsForDay = (date: Date) => {
    const key = toDateKey(date);
    return reservations.filter((res) => {
      if (!OCCUPYING.has(res.status)) return false;
      if (selectedListingId !== "all" && res.listingId !== selectedListingId) return false;
      // Nights are [check-in, checkout): the checkout day is free.
      return res.startDate <= key && key < res.endDate;
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
    if (!listing) return 0;
    const key = `${listing.id}_${format(date, "yyyy-MM-dd")}`;
    if (priceOverrides[key]) return priceOverrides[key];
    return listing.price;
  };

  const statusLabel = (blocked: boolean, booked: boolean) =>
    blocked ? t("status.blocked") : booked ? t("status.booked") : t("status.available");

  // Toggle blocked status for day
  const handleToggleBlock = async (date: Date) => {
    const targetListingId = selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId;
    if (!targetListingId || isSaving) return;
    const dateKey = toDateKey(date);
    const nextState = !blockedDates[`${targetListingId}_${dateKey}`];
    setIsSaving(true);
    try {
      const result = await setListingDatesBlockedAction({ listingId: targetListingId, dates: [dateKey], blocked: nextState });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      applyServerOverrides(targetListingId, result.data);
      toast.info(nextState ? t("toast.dateBlocked") : t("toast.dateReopened"));
    } catch {
      toast.error(t("toast.dateUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  // Save price override
  const handleSavePriceOverride = async (date: Date) => {
    const targetListingId = selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId;
    if (!targetListingId || isSaving) return;
    const trimmed = overridePriceInput.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && !isValidPriceDzd(parsed)) {
      setPriceError(t("toast.priceInvalid", { min: money(PRICE_MIN_DZD), max: money(PRICE_MAX_DZD) }));
      return;
    }
    setPriceError(null);
    setIsSaving(true);
    try {
      const result = await setListingDatePriceAction({ listingId: targetListingId, dates: [toDateKey(date)], price: parsed });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      applyServerOverrides(targetListingId, result.data);
      toast.success(parsed === null ? t("toast.priceReset") : t("toast.priceSet", { price: money(parsed) }));
      setOverridePriceInput("");
    } catch {
      toast.error(t("toast.priceSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  // Open day detail
  const handleDayClick = (date: Date) => {
    setActiveDay(date);
    setPriceError(null);
    const targetListingId = selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId;
    const key = `${targetListingId}_${format(date, "yyyy-MM-dd")}`;
    if (priceOverrides[key]) {
      setOverridePriceInput(priceOverrides[key].toString());
    } else {
      setOverridePriceInput("");
    }
  };

  if (safeListings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center max-w-lg mx-auto shadow-sm">
          <h1 className="text-xl font-serif font-black text-primary mb-2">{t("empty.title")}</h1>
          <p className="text-sm text-neutral-600 mb-6">{t("empty.body")}</p>
          <Link
            href="/become-a-host"
            className={`inline-flex items-center justify-center py-2.5 px-6 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition shadow-sm ${FOCUS_RING}`}
          >
            {t("empty.cta")}
          </Link>
        </div>
      </div>
    );
  }

  const viewLabels: Record<CalendarView, string> = {
    month: tHost("viewMonth"),
    week: tHost("viewWeek"),
    day: tHost("viewDay"),
    year: tHost("viewYear"),
  };

  const activeDayBlocked = activeDay ? isDayBlocked(activeDay, activeListing?.id || safeListings[0]?.id) : false;
  const activeDayBookings = activeDay ? getBookingsForDay(activeDay) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">{t("title")}</h1>
          <p className="text-sm text-neutral-600 mt-1">{t("subtitle")}</p>
        </div>

        {/* View Switcher Pills */}
        <div
          role="group"
          aria-label={t("viewSwitcherLabel")}
          className="flex items-center bg-white p-1 rounded-2xl border border-tertiary/70 shadow-2xs self-start md:self-auto"
        >
          {(["month", "week", "day", "year"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition ${FOCUS_RING} ${
                view === v ? "bg-primary text-white shadow-2xs" : "text-neutral-600 hover:text-primary"
              }`}
            >
              {viewLabels[v]}
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
              aria-label={t("previous", { view })}
              className={`p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 transition border border-tertiary/60 ${FOCUS_RING}`}
            >
              <BrandChevronLeftIcon size={18} className="rtl:rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={t("next", { view })}
              className={`p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 transition border border-tertiary/60 ${FOCUS_RING}`}
            >
              <BrandChevronRightIcon size={18} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>

          <h2
            aria-live="polite"
            className="text-base sm:text-lg font-serif font-bold text-primary min-w-[160px] text-center"
          >
            {view === "year" ? fmt(currentDate, "yyyy") : view === "day" ? fmt(currentDate, "PPP") : fmt(currentDate, "LLLL yyyy")}
          </h2>

          <button
            type="button"
            onClick={handleToday}
            className={`px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition shadow-2xs ${FOCUS_RING}`}
          >
            {tHost("today")}
          </button>
        </div>

        {/* Listing Filter Selector & Legend */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          <label htmlFor="calendar-property-select" className="text-xs font-bold text-neutral-600 flex items-center gap-1">
            <BrandFilterIcon size={14} aria-hidden="true" /> {t("propertyLabel")}
          </label>
          <select
            id="calendar-property-select"
            value={selectedListingId}
            onChange={(e) => {
              setSelectedListingId(e.target.value);
              setSelectedRoomTypeId("all");
            }}
            className={`px-3 py-1.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:border-primary flex-1 lg:flex-none lg:w-56 ${FOCUS_RING}`}
          >
            <option value="all">{t("allProperties", { count: safeListings.length })}</option>
            {safeListings.map((l) => (
              <option key={l.id} value={l.id}>
                {t("listingOption", { title: l.title, city: l.city })}
              </option>
            ))}
          </select>

          {/* Room Type Sub-filter (Section 2) */}
          {activeListing?.roomTypes && activeListing.roomTypes.length > 0 && (
            <div className="flex items-center gap-1.5 ms-1">
              <label htmlFor="calendar-room-select" className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                <BrandBedIcon size={14} className="text-secondary" aria-hidden="true" /> {t("unitLabel")}
              </label>
              <select
                id="calendar-room-select"
                value={selectedRoomTypeId}
                onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                className={`px-3 py-1.5 bg-neutral-50 border border-secondary/60 rounded-xl text-xs font-semibold text-primary focus:border-primary ${FOCUS_RING}`}
              >
                <option value="all">{t("allUnits", { count: activeListing.roomTypes.length })}</option>
                {activeListing.roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {t("unitOption", {
                      name: rt.name,
                      unit: rt.bookingUnit === "bed" ? "bed" : "room",
                      count: rt.inventoryCount || rt.totalInventory || 0,
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Listing Color Chips */}
          <ul aria-label={t("listingLegend")} className="hidden sm:flex items-center gap-2 ms-2">
            {safeListings.slice(0, 3).map((l) => {
              const color = listingColorMap[l.id] || LISTING_COLORS[0];
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-50 px-2 py-1 rounded-lg border border-tertiary/40"
                >
                  <span className={`w-2 h-2 rounded-full ${color.bg}`} aria-hidden="true" />
                  <span className="truncate max-w-[100px]" title={l.title}>
                    {(l.title || t("untitledListing")).split(" ")[0]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* VIEW: MONTH GRID */}
      {view === "month" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[320px] sm:min-w-0">
              {(() => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(monthStart);
                const startDate = startOfWeek(monthStart, weekOpts);
                const endDate = endOfWeek(monthEnd, weekOpts);
                const days = eachDayOfInterval({ start: startDate, end: endDate });

                return (
                  <>
                    {/* Day Headers (localized, locale week start) */}
                    <div
                      aria-hidden="true"
                      className="grid grid-cols-7 border-b border-tertiary/60 bg-neutral-50 text-center py-2.5 text-xs font-bold text-neutral-600"
                    >
                      {days.slice(0, 7).map((d) => (
                        <div key={d.toISOString()}>{fmt(d, "EEE")}</div>
                      ))}
                    </div>

                    {/* Month Matrix */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-tertiary/40 rtl:divide-x-reverse">
                      {days.map((day) => {
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, new Date());
                        const dayBookings = getBookingsForDay(day);
                        const isBlocked = isDayBlocked(
                          day,
                          selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId
                        );
                        const price = getDayPrice(day, activeListing);
                        const isCustomPrice = !!priceOverrides[`${activeListing?.id || safeListings[0]?.id}_${format(day, "yyyy-MM-dd")}`];
                        const status = statusLabel(isBlocked, dayBookings.length > 0);
                        const dateLabel = fmt(day, "PPPP");

                        return (
                          <button
                            type="button"
                            key={day.toISOString()}
                            onClick={() => handleDayClick(day)}
                            aria-haspopup="dialog"
                            aria-current={isToday ? "date" : undefined}
                            aria-label={
                              isCurrentMonth && !isBlocked
                                ? t("dayCellLabelWithPrice", { date: dateLabel, status, price: money(price) })
                                : t("dayCellLabel", { date: dateLabel, status })
                            }
                            className={`min-h-[90px] sm:min-h-[120px] p-1.5 sm:p-2 transition flex flex-col justify-between text-start ${FOCUS_RING} focus-visible:ring-offset-0 focus-visible:z-10 ${
                              !isCurrentMonth
                                ? "bg-neutral-50/60 opacity-40"
                                : isBlocked
                                ? "bg-neutral-100/80"
                                : "hover:bg-primary/5"
                            }`}
                          >
                            {/* Top: Day Number + Price */}
                            <span className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 min-w-0 w-full">
                              <span
                                className={`text-xs sm:text-sm font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 ${
                                  isToday ? "bg-primary text-white" : "text-neutral-700"
                                }`}
                              >
                                {fmt(day, "d")}
                              </span>

                              {/* Nightly Price Badge */}
                              {isCurrentMonth && !isBlocked && (
                                <span
                                  className={`text-[9px] sm:text-[11px] font-mono font-bold px-1 py-0.5 sm:px-1.5 rounded-md truncate max-w-full ${
                                    isCustomPrice ? "bg-accent/15 text-accent-700 border border-accent/30" : "text-neutral-600"
                                  }`}
                                >
                                  {money(price)}
                                </span>
                              )}

                              {/* Blocked icon */}
                              {isBlocked && (
                                <span className="text-neutral-500 shrink-0" aria-hidden="true">
                                  <BrandLockIcon size={14} />
                                </span>
                              )}
                            </span>

                            {/* Middle: Booking indicators / pills */}
                            <span className="block space-y-1 my-1 min-w-0 w-full">
                              {dayBookings.slice(0, 2).map((b) => {
                                const color = listingColorMap[b.listingId] || LISTING_COLORS[0];
                                const guest = b.user?.name || t("guestFallback");
                                return (
                                  <span
                                    key={b.id}
                                    className={`text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md truncate ${color.light} ${color.text} border ${color.border}/30 flex items-center gap-1 min-w-0`}
                                    title={t("bookingTitle", { guest, listing: b.listing?.title || "" })}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${color.bg} shrink-0`} aria-hidden="true" />
                                    <span className="truncate">{guest}</span>
                                  </span>
                                );
                              })}
                              {dayBookings.length > 2 && (
                                <span className="text-[9px] font-bold text-neutral-600 block ps-1">
                                  {t("moreBookings", { count: dayBookings.length - 2 })}
                                </span>
                              )}
                            </span>

                            {/* Bottom: Blocked / Available status label */}
                            <span className="block text-[10px] font-medium">
                              {isBlocked ? (
                                <span className="text-neutral-600 font-semibold">{t("status.blocked")}</span>
                              ) : dayBookings.length > 0 ? (
                                <span className="text-secondary font-bold">{t("status.booked")}</span>
                              ) : (
                                <span className="text-emerald-700 font-medium">{t("status.available")}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: WEEK VIEW */}
      {view === "week" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Week Header */}
            <div aria-hidden="true" className="grid grid-cols-7 border-b border-tertiary/60 bg-neutral-50 text-center py-3">
              {(() => {
                const weekStart = startOfWeek(currentDate, weekOpts);
                const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                return weekDays.map((d) => (
                  <div key={d.toISOString()} className="px-2">
                    <span className="block text-xs font-bold text-neutral-600 uppercase">{fmt(d, "EEE")}</span>
                    <span
                      className={`inline-block text-sm font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                        isSameDay(d, new Date()) ? "bg-primary text-white" : "text-primary"
                      }`}
                    >
                      {fmt(d, "d MMM")}
                    </span>
                  </div>
                ));
              })()}
            </div>

            {/* Week Listings Rows */}
            <div className="divide-y divide-tertiary/40">
              {safeListings.map((listing) => {
                const color = listingColorMap[listing.id] || LISTING_COLORS[0];
                const weekStart = startOfWeek(currentDate, weekOpts);
                const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

                return (
                  <div key={listing.id} className="p-3">
                    <h3 className="flex items-center gap-2 mb-2 font-bold text-xs text-primary">
                      <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} aria-hidden="true" />
                      <span>{listing.title}</span>
                      <span className="text-neutral-600 font-normal">({listing.city})</span>
                    </h3>

                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((d) => {
                        const dKey = toDateKey(d);
                        const dayBookings = reservations.filter(
                          (r) =>
                            r.listingId === listing.id &&
                            OCCUPYING.has(r.status) &&
                            r.startDate <= dKey &&
                            dKey < r.endDate
                        );
                        const isBlocked = isDayBlocked(d, listing.id);
                        const price = getDayPrice(d, listing);
                        const status = statusLabel(isBlocked, dayBookings.length > 0);

                        return (
                          <button
                            type="button"
                            key={d.toISOString()}
                            onClick={() => handleDayClick(d)}
                            aria-haspopup="dialog"
                            aria-current={isSameDay(d, new Date()) ? "date" : undefined}
                            aria-label={t("weekCellLabel", {
                              listing: listing.title,
                              date: fmt(d, "PPPP"),
                              status,
                              price: money(price),
                            })}
                            className={`p-2 rounded-xl border text-xs min-h-[90px] flex flex-col justify-between text-start transition ${FOCUS_RING} ${
                              isBlocked
                                ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                                : dayBookings.length > 0
                                ? `${color.light} ${color.border} ${color.text}`
                                : "bg-neutral-50/50 border-tertiary/60 hover:bg-white hover:border-primary"
                            }`}
                          >
                            <span className="flex justify-between items-center w-full gap-1">
                              <span className="font-bold">{fmt(d, "d")}</span>
                              <span className="text-[10px] font-mono font-semibold truncate">{money(price)}</span>
                            </span>

                            {dayBookings.length > 0 ? (
                              <span className="block font-bold truncate text-[11px] w-full">
                                {dayBookings[0].user?.name || t("guestFallback")}
                              </span>
                            ) : isBlocked ? (
                              <span className="block text-[10px] font-semibold text-neutral-600">{t("status.blocked")}</span>
                            ) : (
                              <span className="block text-[10px] text-emerald-700 font-medium">{t("status.available")}</span>
                            )}
                          </button>
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
          <div className="flex items-center justify-between pb-4 border-b border-tertiary/60 mb-6 gap-3">
            <div>
              <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{t("dayView.eyebrow")}</span>
              <h3 className="font-serif text-2xl font-black text-primary">{fmt(currentDate, "PPPP")}</h3>
            </div>
            {(() => {
              const blocked = isDayBlocked(
                currentDate,
                selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId
              );
              return (
                <button
                  type="button"
                  onClick={() => handleToggleBlock(currentDate)}
                  disabled={isSaving}
                  aria-pressed={blocked}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border border-tertiary/80 hover:bg-neutral-50 transition flex items-center gap-1.5 disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {blocked ? <BrandDoorIcon size={16} aria-hidden="true" /> : <BrandLockIcon size={16} aria-hidden="true" />}
                  <span>{blocked ? t("dayView.unblock") : t("dayView.block")}</span>
                </button>
              );
            })()}
          </div>

          {/* Hourly Timeline */}
          <ol className="space-y-4">
            {DAY_SLOTS.map((slot) => {
              const bookings = getBookingsForDay(currentDate);

              return (
                <li
                  key={slot.time}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-neutral-50/70 border border-tertiary/40 hover:bg-white hover:shadow-xs transition"
                >
                  <div className="w-16 shrink-0 font-mono font-bold text-sm text-secondary flex items-center gap-1">
                    <BrandClockIcon size={16} aria-hidden="true" />
                    <time>{slot.time}</time>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-primary text-sm">{t(`dayView.slots.${slot.key}.title`)}</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">{t(`dayView.slots.${slot.key}.desc`)}</p>

                    {slot.key === "checkin" && bookings.length > 0 && (
                      <div className="mt-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                          {t("dayView.arrivingToday")}
                        </span>
                        {bookings.map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-2 text-xs mt-1 text-emerald-900 font-semibold">
                            <span>{t("guestLine", { name: b.user?.name || t("guestFallback"), count: b.guestsCount })}</span>
                            <span className="font-mono">{b.listing?.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* VIEW: YEAR VIEW (12-MONTH DENSITY OVERVIEW) */}
      {view === "year" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const monthDate = new Date(currentDate.getFullYear(), monthIdx, 1);
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(monthDate);
            const sDate = startOfWeek(mStart, weekOpts);
            const eDate = endOfWeek(mEnd, weekOpts);
            const daysInMonth = eachDayOfInterval({ start: sDate, end: eDate });
            const monthName = fmt(monthDate, "LLLL");

            return (
              <section
                key={monthIdx}
                aria-label={fmt(monthDate, "LLLL yyyy")}
                className="bg-white rounded-3xl border border-tertiary/70 p-4 shadow-2xs hover:shadow-md transition"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCurrentDate(monthDate);
                    setView("month");
                  }}
                  aria-label={t("yearView.viewMonthLabel", { month: fmt(monthDate, "LLLL yyyy") })}
                  className={`w-full flex items-center justify-between pb-2 mb-2 border-b border-tertiary/40 group rounded-md ${FOCUS_RING}`}
                >
                  <span className="font-serif font-bold text-sm text-primary group-hover:text-accent-700 transition capitalize">
                    {monthName}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600 group-hover:text-primary flex items-center gap-0.5">
                    {t("yearView.viewMonth")}
                    <BrandChevronRightIcon size={12} className="rtl:rotate-180" aria-hidden="true" />
                  </span>
                </button>

                {/* Mini day of week headers */}
                <div aria-hidden="true" className="grid grid-cols-7 text-center text-[9px] font-bold text-neutral-600 mb-1">
                  {daysInMonth.slice(0, 7).map((d) => (
                    <span key={d.toISOString()}>{fmt(d, "EEEEE")}</span>
                  ))}
                </div>

                {/* Mini days grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {daysInMonth.map((d) => {
                    const inThisMonth = isSameMonth(d, monthDate);
                    if (!inThisMonth) {
                      return <span key={d.toISOString()} aria-hidden="true" className="h-6" />;
                    }
                    const bCount = getBookingsForDay(d).length;
                    const isBlocked = isDayBlocked(
                      d,
                      selectedListingId === "all" ? (safeListings[0]?.id || "") : selectedListingId
                    );
                    const status = statusLabel(isBlocked, bCount > 0);

                    return (
                      <button
                        type="button"
                        key={d.toISOString()}
                        onClick={() => {
                          setCurrentDate(d);
                          setView("month");
                        }}
                        aria-label={t("dayCellLabel", { date: fmt(d, "PPPP"), status })}
                        title={t("dayCellLabel", { date: fmt(d, "PP"), status })}
                        className={`text-[9px] font-mono h-6 flex items-center justify-center rounded transition ${FOCUS_RING} focus-visible:ring-offset-1 ${
                          bCount > 0
                            ? "bg-emerald-700 text-white font-bold"
                            : isBlocked
                            ? "bg-neutral-200 text-neutral-600"
                            : "hover:bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {fmt(d, "d")}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Selected Day Dialog / Bottom Sheet */}
      <Dialog
        isOpen={!!activeDay}
        onClose={() => setActiveDay(null)}
        busy={isSaving}
        title={activeDay ? fmt(activeDay, "PPPP") : ""}
        titleClassName="font-serif text-lg font-black text-primary pe-10"
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-tertiary shadow-2xl p-6 max-h-[92dvh] overflow-y-auto"
      >
        {activeDay && (
          <>
            <p className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider pb-3 border-b border-tertiary/60 mb-4">
              {t("dialog.eyebrow")}
            </p>
            <button
              type="button"
              onClick={() => setActiveDay(null)}
              aria-label={tCommon("close")}
              className={`absolute top-5 end-5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center ${FOCUS_RING}`}
            >
              <BrandCloseIcon size={16} aria-hidden="true" />
            </button>

            {/* Target Property */}
            <div className="mb-4">
              <span className="text-xs font-bold text-neutral-600 block mb-1">{t("dialog.property")}</span>
              <div className="text-xs font-bold text-primary bg-neutral-50 p-2.5 rounded-xl border border-tertiary/60 truncate">
                {activeListing
                  ? t("listingOption", { title: activeListing.title, city: activeListing.city })
                  : t("untitledListing")}
              </div>
            </div>

            {/* Availability status & Toggle */}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/60 mb-4 flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-primary">{t("dialog.availability")}</span>
                <span className="text-xs text-neutral-600">
                  {activeDayBlocked ? t("dialog.blockedDesc") : t("dialog.availableDesc")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleBlock(activeDay)}
                disabled={isSaving}
                aria-pressed={activeDayBlocked}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-60 ${FOCUS_RING} ${
                  activeDayBlocked
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                {activeDayBlocked ? (
                  <>
                    <BrandDoorIcon size={15} aria-hidden="true" />
                    <span>{t("dialog.unblock")}</span>
                  </>
                ) : (
                  <>
                    <BrandLockIcon size={15} aria-hidden="true" />
                    <span>{t("dialog.block")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Nightly Price Override */}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/60 mb-6">
              <span className="block text-xs font-bold text-primary mb-1">{t("dialog.priceTitle")}</span>
              <p id={priceHelpId} className="text-[11px] text-neutral-600 mb-3">
                {t("dialog.defaultRate", { price: money(activeListing?.price ?? 0) })}
              </p>
              <label htmlFor={priceInputId} className="sr-only">
                {t("dialog.priceInputLabel")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={priceInputId}
                  type="number"
                  inputMode="numeric"
                  value={overridePriceInput}
                  onChange={(e) => {
                    setOverridePriceInput(e.target.value);
                    if (priceError) setPriceError(null);
                  }}
                  placeholder={String(activeListing?.price ?? "")}
                  aria-invalid={priceError ? true : undefined}
                  aria-describedby={priceError ? `${priceHelpId} ${priceErrorId}` : priceHelpId}
                  className={`flex-1 min-w-0 px-3 py-2 bg-white border rounded-xl text-xs font-mono font-bold text-primary focus:border-primary ${FOCUS_RING} ${
                    priceError ? "border-status-error" : "border-tertiary/80"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleSavePriceOverride(activeDay)}
                  disabled={isSaving}
                  className={`disabled:opacity-60 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs ${FOCUS_RING}`}
                >
                  {t("dialog.saveRate")}
                </button>
              </div>
              {priceError && (
                <p id={priceErrorId} role="alert" className="mt-2 text-[11px] font-semibold text-status-error">
                  {priceError}
                </p>
              )}
            </div>

            {/* Existing Bookings on date */}
            {activeDayBookings.length > 0 && (
              <div className="p-3 bg-primary/5 rounded-2xl border border-primary/20 mb-4">
                <span className="block text-xs font-bold text-primary mb-1">{t("dialog.reservationsOnDate")}</span>
                {activeDayBookings.map((b) => (
                  <div key={b.id} className="text-xs text-neutral-700 flex items-center justify-between gap-2">
                    <span>{t("guestLine", { name: b.user?.name || t("guestFallback"), count: b.guestsCount })}</span>
                    <span className="font-mono font-bold text-primary">{money(b.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveDay(null)}
              className={`w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition ${FOCUS_RING}`}
            >
              {tCommon("close")}
            </button>
          </>
        )}
      </Dialog>
    </div>
  );
}
