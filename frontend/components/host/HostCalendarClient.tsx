"use client";

import React, { useState, useMemo, useId, useRef, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
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
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
} from "date-fns";
import { DateAvailabilityOverride, Listing, Reservation, User } from "@/types";
import { setListingDatePriceAction, setListingDatesBlockedAction } from "@/app/actions/calendar";
import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import { addDaysToKey, fromDateKey, toDateKey } from "@/lib/booking/dates";
import { formatDzd } from "@/lib/currency";
import { dateFnsLocale } from "@/lib/i18n/date-locale";
import { dur, ease } from "@/lib/motion";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogFooter,
  IconButton,
  Input,
  KitEmptyState,
  SegmentedControl,
  Select,
  Switch,
  cn,
  focusRing,
  useIsRtl,
} from "@/components/ui";
import {
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandLockIcon,
  BrandDoorIcon,
  BrandBedIcon,
  BrandHomeIcon,
  BrandCalendarIcon,
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

const DAY_SLOTS = [
  { time: "08:00", key: "morning" },
  { time: "11:00", key: "checkout" },
  { time: "13:00", key: "turnover" },
  { time: "15:00", key: "checkin" },
  { time: "20:00", key: "evening" },
] as const;

/** Order used to pick the slide direction when switching views (finer to coarser). */
const VIEW_ORDER: CalendarView[] = ["day", "week", "month", "year"];

/** Diagonal hatching for blocked days (ink at low alpha, palette only). */
const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(46,58,47,0.07) 0px, rgba(46,58,47,0.07) 2px, transparent 2px, transparent 7px)",
};

function overrideMaps(overrides: DateAvailabilityOverride[]) {
  const blocked: Record<string, boolean> = {};
  const prices: Record<string, number> = {};
  for (const o of overrides) {
    if (o.isBlocked) blocked[`${o.listingId}_${o.date}`] = true;
    if (typeof o.customPrice === "number") prices[`${o.listingId}_${o.date}`] = o.customPrice;
  }
  return { blocked, prices };
}

/** Every date key from a to b inclusive (either order). */
function keysBetween(a: string, b: string): string[] {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const out: string[] = [];
  for (let k = lo; k <= hi && out.length < 400; k = addDaysToKey(k, 1)) out.push(k);
  return out;
}

// Listing colours for multi-listing indicators (five BLADUS hues).
const LISTING_COLORS = [
  { dot: "bg-secondary-600", pill: "bg-secondary-100 text-secondary-800" },
  { dot: "bg-accent-600", pill: "bg-accent-100 text-accent-800" },
  { dot: "bg-primary-700", pill: "bg-primary/[0.08] text-primary-800" },
  { dot: "bg-amber-600", pill: "bg-amber-100 text-amber-800" },
  { dot: "bg-tertiary-600", pill: "bg-tertiary-200 text-tertiary-900" },
];

export default function HostCalendarClient({ hostListings, reservations, overrides }: HostCalendarClientProps) {
  const t = useTranslations("hostCalendar");
  const tHost = useTranslations("host.calendar");
  const tCommon = useTranslations("common");
  const errorText = useActionError();
  const locale = useLocale();
  const isRtl = useIsRtl();
  const dfLocale = dateFnsLocale(locale);
  const weekOpts = { locale: dfLocale };
  const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: dfLocale });
  const money = (amount: number) => formatDzd(amount, locale);
  const compactMoney = (amount: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-DZ" : "en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  const gridId = useId();

  const safeListings: Listing[] = useMemo(() => hostListings || [], [hostListings]);

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [direction, setDirection] = useState(1);
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

  // Single day dialog
  const [activeDay, setActiveDay] = useState<Date | null>(null);
  const [overridePriceInput, setOverridePriceInput] = useState<string>("");
  const [priceError, setPriceError] = useState<string | null>(null);

  // Range selection (drag with a mouse, Shift + arrows on a keyboard, tap-tap in range mode on touch).
  const [selection, setSelection] = useState<{ anchor: string; end: string } | null>(null);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangePriceInput, setRangePriceInput] = useState("");
  const [rangePriceError, setRangePriceError] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const todayKey = toDateKey(new Date());

  const listingColorMap = useMemo(() => {
    const map: Record<string, (typeof LISTING_COLORS)[0]> = {};
    safeListings.forEach((l, idx) => {
      if (l?.id) map[l.id] = LISTING_COLORS[idx % LISTING_COLORS.length];
    });
    return map;
  }, [safeListings]);

  // Active listing if single selected
  const activeListing = useMemo(() => {
    return safeListings.find((l) => l.id === selectedListingId) || safeListings[0];
  }, [safeListings, selectedListingId]);

  const targetListingId = selectedListingId === "all" ? safeListings[0]?.id || "" : selectedListingId;

  const selectedKeys = useMemo(
    () => (selection ? keysBetween(selection.anchor, selection.end).filter((k) => k >= todayKey) : []),
    [selection, todayKey]
  );
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const openDayFromKey = useCallback(
    (key: string) => {
      const date = fromDateKey(key);
      setActiveDay(date);
      setPriceError(null);
      const existing = priceOverrides[`${targetListingId}_${key}`];
      setOverridePriceInput(existing ? existing.toString() : "");
    },
    [priceOverrides, targetListingId]
  );

  const finishSelection = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel) return;
    if (sel.anchor === sel.end) {
      setSelection(null);
      openDayFromKey(sel.anchor);
      return;
    }
    const keys = keysBetween(sel.anchor, sel.end).filter((k) => k >= todayKey);
    if (keys.length === 0) {
      setSelection(null);
      return;
    }
    setRangePriceInput("");
    setRangePriceError(null);
    setRangeOpen(true);
  }, [openDayFromKey, todayKey]);

  // End a mouse drag anywhere on the page.
  useEffect(() => {
    const up = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      finishSelection();
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [finishSelection]);

  // Navigate forward/back
  const handlePrev = () => {
    setDirection(-1);
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else if (view === "day") setCurrentDate(subDays(currentDate, 1));
    else if (view === "year") setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = () => {
    setDirection(1);
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else if (view === "day") setCurrentDate(addDays(currentDate, 1));
    else if (view === "year") setCurrentDate(addYears(currentDate, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setDirection(now >= currentDate ? 1 : -1);
    setCurrentDate(now);
  };

  const changeView = (next: CalendarView, date?: Date) => {
    setDirection(VIEW_ORDER.indexOf(next) >= VIEW_ORDER.indexOf(view) ? 1 : -1);
    if (date) setCurrentDate(date);
    setView(next);
    setSelection(null);
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

  const priceUnit = (listing?: Listing) => t("priceUnit", { category: listing?.category ?? "home" });

  // Save blocked state for one or more dates (existing server action).
  const saveBlocked = async (dates: string[], blocked: boolean, successMessage: string) => {
    if (!targetListingId || isSaving || dates.length === 0) return false;
    setIsSaving(true);
    try {
      const result = await setListingDatesBlockedAction({ listingId: targetListingId, dates, blocked });
      if (!result.ok) {
        toast.error(errorText(result));
        return false;
      }
      applyServerOverrides(targetListingId, result.data);
      toast.info(successMessage);
      return true;
    } catch {
      toast.error(t("toast.dateUpdateFailed"));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle blocked status for day
  const handleToggleBlock = async (date: Date) => {
    if (!targetListingId) return;
    const dateKey = toDateKey(date);
    const nextState = !blockedDates[`${targetListingId}_${dateKey}`];
    await saveBlocked([dateKey], nextState, nextState ? t("toast.dateBlocked") : t("toast.dateReopened"));
  };

  /** Validates a price field: number, null (reset) or false (invalid; error already set). */
  const parsePrice = (raw: string, setError: (msg: string | null) => void): number | null | false => {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && !isValidPriceDzd(parsed)) {
      setError(t("toast.priceInvalid", { min: money(PRICE_MIN_DZD), max: money(PRICE_MAX_DZD) }));
      return false;
    }
    setError(null);
    return parsed;
  };

  const savePrice = async (dates: string[], price: number | null, successMessage: string) => {
    if (!targetListingId || isSaving || dates.length === 0) return false;
    setIsSaving(true);
    try {
      const result = await setListingDatePriceAction({ listingId: targetListingId, dates, price });
      if (!result.ok) {
        toast.error(errorText(result));
        return false;
      }
      applyServerOverrides(targetListingId, result.data);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error(t("toast.priceSaveFailed"));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Save price override
  const handleSavePriceOverride = async (date: Date) => {
    const parsed = parsePrice(overridePriceInput, setPriceError);
    if (parsed === false) return;
    const ok = await savePrice(
      [toDateKey(date)],
      parsed,
      parsed === null ? t("toast.priceReset") : t("toast.priceSet", { price: money(parsed) })
    );
    if (ok) setOverridePriceInput("");
  };

  const closeRange = () => {
    setRangeOpen(false);
    setSelection(null);
    setRangeMode(false);
  };

  const handleRangeBlock = async (blocked: boolean) => {
    const count = selectedKeys.length;
    const ok = await saveBlocked(
      selectedKeys,
      blocked,
      blocked ? t("toast.rangeBlocked", { count }) : t("toast.rangeReopened", { count })
    );
    if (ok) closeRange();
  };

  const handleRangePrice = async () => {
    const parsed = parsePrice(rangePriceInput, setRangePriceError);
    if (parsed === false) return;
    const count = selectedKeys.length;
    const ok = await savePrice(
      selectedKeys,
      parsed,
      parsed === null ? t("toast.rangePriceReset", { count }) : t("toast.rangePriceSet", { count, price: money(parsed) })
    );
    if (ok) closeRange();
  };

  // Open day detail
  const handleDayClick = (date: Date) => openDayFromKey(toDateKey(date));

  /* ---------------------------------------------------------------- month grid interaction */

  const onCellPointerDown = (e: React.PointerEvent, key: string, past: boolean) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || past) return;
    draggingRef.current = true;
    setSelection({ anchor: key, end: key });
  };

  const onCellPointerEnter = (key: string, past: boolean) => {
    setHoverKey(key);
    if (draggingRef.current && !past) setSelection((s) => (s ? { ...s, end: key } : s));
  };

  const onCellClick = (key: string, past: boolean) => {
    if (suppressClickRef.current) return;
    if (rangeMode) {
      if (past) return;
      const sel = selectionRef.current;
      if (!sel) {
        setSelection({ anchor: key, end: key });
        return;
      }
      const next = { ...sel, end: key };
      setSelection(next);
      selectionRef.current = next;
      finishSelection();
      return;
    }
    const sel = selectionRef.current;
    if (sel && sel.anchor !== sel.end) {
      finishSelection();
      return;
    }
    setSelection(null);
    openDayFromKey(key);
  };

  const onCellKeyDown = (e: React.KeyboardEvent, key: string) => {
    const deltas: Record<string, number> = {
      ArrowLeft: isRtl ? 1 : -1,
      ArrowRight: isRtl ? -1 : 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (e.key === "Escape" && selectionRef.current) {
      e.stopPropagation();
      setSelection(null);
      return;
    }
    const delta = deltas[e.key];
    if (delta === undefined) return;
    const target = addDaysToKey(key, delta);
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`);
    if (!el) return;
    e.preventDefault();
    el.focus();
    if (e.shiftKey) {
      setSelection((s) => ({ anchor: s?.anchor ?? key, end: target }));
    } else if (!rangeMode) {
      setSelection(null);
    }
  };

  /* ---------------------------------------------------------------- render */

  if (safeListings.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card padding="lg" className="mx-auto max-w-lg">
          <KitEmptyState
            variant="calendar"
            title={t("empty.title")}
            description={t("empty.body")}
            action={<Button href="/become-a-host">{t("empty.cta")}</Button>}
          />
        </Card>
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

  const periodLabel =
    view === "year"
      ? fmt(currentDate, "yyyy")
      : view === "day"
        ? fmt(currentDate, "PPPP")
        : view === "week"
          ? t("weekRange", {
              start: fmt(startOfWeek(currentDate, weekOpts), "d MMM"),
              end: fmt(endOfWeek(currentDate, weekOpts), "d MMM yyyy"),
            })
          : fmt(currentDate, "LLLL yyyy");

  const periodKey =
    view === "year"
      ? fmt(currentDate, "yyyy")
      : view === "month"
        ? format(currentDate, "yyyy-MM")
        : view === "week"
          ? toDateKey(startOfWeek(currentDate, weekOpts))
          : toDateKey(currentDate);

  const sign = isRtl ? -1 : 1;
  const periodVariants = {
    enter: (d: number) => ({ opacity: 0, x: d * sign * 32 }),
    center: { opacity: 1, x: 0, transition: { duration: dur.base, ease: ease.out } },
    exit: (d: number) => ({ opacity: 0, x: -d * sign * 32, transition: { duration: dur.fast, ease: ease.standard } }),
  };

  // Details panel (hovered / focused day, else today)
  const detailKey = hoverKey ?? todayKey;
  const detailDate = fromDateKey(detailKey);
  const detailBookings = getBookingsForDay(detailDate);
  const detailBlocked = isDayBlocked(detailDate, targetListingId);
  const detailPast = detailKey < todayKey;
  const detailCustom = !!priceOverrides[`${targetListingId}_${detailKey}`];

  const legend = (
    <ul aria-label={t("legend.title")} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-primary-700">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-md bg-white ring-1 ring-primary/15" />
        {t("legend.available")}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-md bg-secondary-100 ring-1 ring-secondary-600/30" />
        {t("legend.booked")}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-md bg-tertiary-100 ring-1 ring-primary/10" style={HATCH} />
        {t("legend.blocked")}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-600" />
        {t("legend.special")}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full ring-2 ring-accent-600" />
        {t("legend.today")}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-md bg-accent-100 ring-1 ring-accent-500/50" />
        {t("legend.selected")}
      </li>
    </ul>
  );

  /* ---------------------------------------------------------------- views */

  const renderMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: startOfWeek(monthStart, weekOpts), end: endOfWeek(monthEnd, weekOpts) });

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card padding="none" className="overflow-hidden">
          <div
            aria-hidden="true"
            className="grid grid-cols-7 border-b border-primary/[0.08] bg-darnaBg/60 py-2.5 text-center text-meta font-semibold text-primary-600"
          >
            {days.slice(0, 7).map((d) => (
              <div key={d.toISOString()}>{fmt(d, "EEEEEE")}</div>
            ))}
          </div>

          <div
            ref={gridRef}
            id={gridId}
            role="group"
            aria-label={t("gridLabel", { month: fmt(monthStart, "LLLL yyyy") })}
            onPointerLeave={() => setHoverKey(null)}
            className="grid select-none grid-cols-7 gap-px bg-primary/[0.06]"
          >
            {days.map((day) => {
              const key = toDateKey(day);
              const inMonth = isSameMonth(day, monthStart);
              const isToday = key === todayKey;
              const past = key < todayKey;
              const dayBookings = getBookingsForDay(day);
              const booked = dayBookings.length > 0;
              const isBlocked = isDayBlocked(day, targetListingId);
              const price = getDayPrice(day, activeListing);
              const isCustomPrice = !!priceOverrides[`${targetListingId}_${key}`];
              const selected = selectedSet.has(key);
              const status = past ? t("status.past") : statusLabel(isBlocked, booked);
              const dateLabel = fmt(day, "PPPP");

              return (
                <button
                  type="button"
                  key={key}
                  data-date={key}
                  onPointerDown={(e) => onCellPointerDown(e, key, past)}
                  onPointerEnter={() => onCellPointerEnter(key, past)}
                  onFocus={() => setHoverKey(key)}
                  onClick={() => onCellClick(key, past)}
                  onKeyDown={(e) => onCellKeyDown(e, key)}
                  aria-haspopup="dialog"
                  aria-pressed={selected || undefined}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={
                    !past && inMonth && !isBlocked
                      ? t("dayCellLabelWithPrice", { date: dateLabel, status, price: money(price) })
                      : t("dayCellLabel", { date: dateLabel, status })
                  }
                  style={isBlocked && !past ? HATCH : undefined}
                  className={cn(
                    "group relative flex min-h-[3.75rem] flex-col items-stretch p-1 text-start sm:min-h-[6rem] sm:p-2 xl:min-h-[6.75rem]",
                    "transition-colors duration-fast ease-standard",
                    "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600",
                    !inMonth
                      ? "bg-darnaBg/70 text-primary-300"
                      : past
                        ? "bg-darnaBg/50 text-primary-400"
                        : isBlocked
                          ? "bg-tertiary-100/70 text-primary-600"
                          : booked
                            ? "bg-secondary-100/60 text-primary-800 hover:bg-secondary-100"
                            : "bg-white text-primary-800 hover:bg-primary/[0.03]"
                  )}
                >
                  {/* Live selection fill */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0.5 rounded-lg bg-accent-100/80 ring-1 ring-inset ring-accent-500/50 transition-opacity duration-fast ease-standard",
                      selected ? "opacity-100" : "opacity-0"
                    )}
                  />

                  <span className="relative flex w-full items-start justify-between gap-1">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-meta tabular-nums sm:h-7 sm:w-7",
                        isToday ? "bg-accent-600 font-semibold text-white shadow-e1" : "font-medium",
                        !isToday && inMonth && !past && "text-primary-900"
                      )}
                    >
                      {fmt(day, "d")}
                    </span>

                    {inMonth && !past && isBlocked && (
                      <BrandLockIcon size={14} aria-hidden="true" className="mt-1 shrink-0 text-primary-500" />
                    )}
                    {inMonth && !past && !isBlocked && (
                      <span
                        className={cn(
                          "mt-1 hidden min-w-0 items-center gap-1 truncate text-[0.6875rem] tabular-nums sm:inline-flex xl:text-meta",
                          isCustomPrice ? "font-semibold text-accent-700" : "font-medium text-primary-500"
                        )}
                      >
                        {isCustomPrice && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />}
                        <span className="truncate xl:hidden">{compactMoney(price)}</span>
                        <span className="hidden truncate xl:inline">{money(price)}</span>
                      </span>
                    )}
                  </span>

                  {/* Bookings: pills from sm, dots on phones */}
                  {inMonth && booked && (
                    <span className="relative mt-auto hidden w-full min-w-0 space-y-1 sm:block">
                      {dayBookings.slice(0, 2).map((b) => {
                        const color = listingColorMap[b.listingId] || LISTING_COLORS[0];
                        const guest = b.user?.name || t("guestFallback");
                        return (
                          <span
                            key={b.id}
                            title={t("bookingTitle", { guest, listing: b.listing?.title || "" })}
                            className={cn(
                              "flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                              color.pill
                            )}
                          >
                            <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color.dot)} />
                            <span className="truncate">{guest}</span>
                          </span>
                        );
                      })}
                      {dayBookings.length > 2 && (
                        <span className="block ps-1 text-[0.6875rem] font-semibold text-primary-600">
                          {t("moreBookings", { count: dayBookings.length - 2 })}
                        </span>
                      )}
                    </span>
                  )}
                  {inMonth && (booked || (isCustomPrice && !isBlocked && !past)) && (
                    <span aria-hidden="true" className="relative mt-auto flex gap-0.5 sm:hidden">
                      {dayBookings.slice(0, 3).map((b) => (
                        <span
                          key={b.id}
                          className={cn("h-1.5 w-1.5 rounded-full", (listingColorMap[b.listingId] || LISTING_COLORS[0]).dot)}
                        />
                      ))}
                      {!booked && <span className="h-1.5 w-1.5 rounded-full bg-accent-600" />}
                    </span>
                  )}
                  {inMonth && !past && isBlocked && (
                    <span className="relative mt-auto hidden text-[0.6875rem] font-semibold text-primary-600 sm:block">
                      {t("status.blocked")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Details + legend */}
        <aside className="space-y-4 lg:self-start">
          {selectedKeys.length > 1 && !rangeOpen ? (
            <Card padding="md" className="enter-up">
              <p className="text-eyebrow uppercase text-accent-700">{t("details.selection")}</p>
              <p className="mt-1 font-serif text-heading text-primary-900">{t("range.title", { count: selectedKeys.length })}</p>
              <p className="mt-1 text-meta text-primary-600">
                {t("range.dates", {
                  start: fmt(fromDateKey(selectedKeys[0]), "d MMM"),
                  end: fmt(fromDateKey(selectedKeys[selectedKeys.length - 1]), "d MMM"),
                })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => finishSelection()}>
                  {t("range.edit")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelection(null)}>
                  {t("range.clear")}
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="md" aria-live="polite">
              <p className="text-eyebrow uppercase text-primary-500">{t("details.title")}</p>
              <p className="mt-1 font-serif text-heading text-primary-900">{fmt(detailDate, "EEEE d MMMM")}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  tone={detailPast ? "neutral" : detailBlocked ? "sand" : detailBookings.length ? "success" : "olive"}
                  dot
                >
                  {detailPast ? t("status.past") : statusLabel(detailBlocked, detailBookings.length > 0)}
                </Badge>
                {detailCustom && !detailPast && (
                  <Badge tone="terracotta" dot>
                    {t("status.special")}
                  </Badge>
                )}
              </div>
              {!detailPast && !detailBlocked && (
                <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="whitespace-nowrap font-serif text-heading tabular-nums text-primary-900">
                    {money(getDayPrice(detailDate, activeListing))}
                  </span>
                  <span className="text-meta text-primary-600">{priceUnit(activeListing)}</span>
                </p>
              )}
              <div className="mt-4 border-t border-primary/[0.08] pt-3">
                {detailBookings.length === 0 ? (
                  <p className="text-meta text-primary-600">{t("details.noBookings")}</p>
                ) : (
                  <ul className="space-y-2">
                    {detailBookings.map((b) => {
                      const color = listingColorMap[b.listingId] || LISTING_COLORS[0];
                      return (
                        <li key={b.id} className="flex items-start gap-2 text-meta">
                          <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", color.dot)} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-primary-900">
                              {t("guestLine", { name: b.user?.name || t("guestFallback"), count: b.guestsCount })}
                            </span>
                            <span className="block truncate text-primary-600">{b.listing?.title}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <p className="mt-4 hidden text-meta text-primary-500 lg:block">{t("details.hint")}</p>
            </Card>
          )}

          <Card padding="md" variant="sunken">
            <p className="mb-3 text-eyebrow uppercase text-primary-500">{t("legend.title")}</p>
            {legend}
          </Card>
        </aside>
      </div>
    );
  };

  const renderWeek = () => {
    const weekStart = startOfWeek(currentDate, weekOpts);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[46rem]">
            <div
              aria-hidden="true"
              className="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))] border-b border-primary/[0.08] bg-darnaBg/60"
            >
              <div />
              {weekDays.map((d) => {
                const isToday = toDateKey(d) === todayKey;
                return (
                  <div key={d.toISOString()} className="px-2 py-3 text-center">
                    <span className="block text-meta font-medium text-primary-600">{fmt(d, "EEE")}</span>
                    <span
                      className={cn(
                        "mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-body font-semibold tabular-nums",
                        isToday ? "bg-accent-600 text-white shadow-e1" : "text-primary-900"
                      )}
                    >
                      {fmt(d, "d")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="divide-y divide-primary/[0.06]">
              {safeListings.map((listing) => {
                const color = listingColorMap[listing.id] || LISTING_COLORS[0];
                return (
                  <div key={listing.id} className="grid grid-cols-[12rem_repeat(7,minmax(0,1fr))] items-stretch gap-1.5 p-2">
                    <div className="flex min-w-0 items-center gap-2.5 px-2">
                      <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color.dot)} />
                      <span className="min-w-0">
                        <span className="block truncate text-meta font-semibold text-primary-900">{listing.title}</span>
                        <span className="block truncate text-meta text-primary-600">{listing.city}</span>
                      </span>
                    </div>
                    {weekDays.map((d) => {
                      const dKey = toDateKey(d);
                      const past = dKey < todayKey;
                      const dayBookings = reservations.filter(
                        (r) => r.listingId === listing.id && OCCUPYING.has(r.status) && r.startDate <= dKey && dKey < r.endDate
                      );
                      const isBlocked = isDayBlocked(d, listing.id);
                      const price = getDayPrice(d, listing);
                      const custom = !!priceOverrides[`${listing.id}_${dKey}`];
                      const status = past ? t("status.past") : statusLabel(isBlocked, dayBookings.length > 0);

                      return (
                        <button
                          type="button"
                          key={dKey}
                          onClick={() => handleDayClick(d)}
                          aria-haspopup="dialog"
                          aria-current={dKey === todayKey ? "date" : undefined}
                          aria-label={t("weekCellLabel", { listing: listing.title, date: fmt(d, "PPPP"), status, price: money(price) })}
                          style={isBlocked && !past ? HATCH : undefined}
                          className={cn(
                            "flex min-h-[4.5rem] flex-col justify-between rounded-xl p-2 text-start transition-[box-shadow,background-color] duration-fast ease-standard",
                            focusRing,
                            past
                              ? "bg-darnaBg/60 text-primary-400"
                              : isBlocked
                                ? "bg-tertiary-100/70 text-primary-600"
                                : dayBookings.length > 0
                                  ? color.pill
                                  : "bg-white text-primary-800 ring-1 ring-inset ring-primary/[0.08] hover:shadow-e2",
                            dKey === todayKey && "ring-2 ring-inset ring-accent-600"
                          )}
                        >
                          <span
                            className={cn(
                              "truncate text-[0.6875rem] tabular-nums xl:text-meta",
                              custom && !past ? "font-semibold text-accent-700" : "font-medium"
                            )}
                          >
                            {past ? "" : isBlocked ? t("status.blocked") : money(price)}
                          </span>
                          {dayBookings.length > 0 && (
                            <span className="block w-full truncate text-meta font-semibold">
                              {dayBookings[0].user?.name || t("guestFallback")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderDay = () => {
    const blocked = isDayBlocked(currentDate, targetListingId);
    const bookings = getBookingsForDay(currentDate);
    const past = toDateKey(currentDate) < todayKey;
    return (
      <Card padding="lg" className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-primary/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-eyebrow uppercase text-primary-500">{t("dayView.eyebrow")}</p>
            <h3 className="mt-1 font-serif text-display-md text-primary-900">{fmt(currentDate, "EEEE d MMMM")}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={past ? "neutral" : blocked ? "sand" : bookings.length ? "success" : "olive"} dot>
                {past ? t("status.past") : statusLabel(blocked, bookings.length > 0)}
              </Badge>
              {!past && !blocked && (
                <span className="text-meta tabular-nums text-primary-700">
                  {money(getDayPrice(currentDate, activeListing))} {priceUnit(activeListing)}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => handleToggleBlock(currentDate)}
            loading={isSaving}
            aria-pressed={blocked}
            leadingIcon={blocked ? <BrandDoorIcon size={16} aria-hidden="true" /> : <BrandLockIcon size={16} aria-hidden="true" />}
          >
            {blocked ? t("dayView.unblock") : t("dayView.block")}
          </Button>
        </div>

        <ol className="relative space-y-3 before:absolute before:inset-y-3 before:start-[2.4rem] before:w-px before:bg-primary/[0.1]">
          {DAY_SLOTS.map((slot) => (
            <li key={slot.time} className="relative flex items-start gap-4">
              <time className="relative z-[1] mt-2 inline-flex h-7 w-[4.8rem] shrink-0 items-center justify-center rounded-full bg-white text-meta font-semibold tabular-nums text-secondary-800 shadow-e1">
                {slot.time}
              </time>
              <div className="min-w-0 flex-1 rounded-2xl bg-darnaBg/60 p-4 transition-shadow duration-fast ease-standard hover:bg-white hover:shadow-e2">
                <h4 className="text-body font-semibold text-primary-900">{t(`dayView.slots.${slot.key}.title`)}</h4>
                <p className="mt-0.5 text-meta text-primary-600">{t(`dayView.slots.${slot.key}.desc`)}</p>
                {slot.key === "checkin" && bookings.length > 0 && (
                  <div className="mt-3 rounded-xl bg-secondary-100 p-3">
                    <p className="text-meta font-semibold text-secondary-800">{t("dayView.arrivingToday")}</p>
                    <ul className="mt-1.5 space-y-1">
                      {bookings.map((b) => (
                        <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-3 text-meta text-primary-800">
                          <span className="font-semibold">
                            {t("guestLine", { name: b.user?.name || t("guestFallback"), count: b.guestsCount })}
                          </span>
                          <span className="truncate text-primary-600">{b.listing?.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    );
  };

  const renderYear = () => (
    <div className="space-y-5">
      <div className="hidden sm:block">{legend}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, monthIdx) => {
          const monthDate = new Date(currentDate.getFullYear(), monthIdx, 1);
          const mStart = startOfMonth(monthDate);
          const daysInMonth = eachDayOfInterval({ start: startOfWeek(mStart, weekOpts), end: endOfWeek(endOfMonth(monthDate), weekOpts) });
          const bookedDays = daysInMonth.filter((d) => isSameMonth(d, monthDate) && getBookingsForDay(d).length > 0).length;

          return (
            <Card key={monthIdx} as="section" padding="sm" aria-label={fmt(monthDate, "LLLL yyyy")} className="transition-shadow duration-fast ease-standard hover:shadow-e2">
              <button
                type="button"
                onClick={() => changeView("month", monthDate)}
                aria-label={t("yearView.viewMonthLabel", { month: fmt(monthDate, "LLLL yyyy") })}
                className={cn("group mb-2 flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1", focusRing)}
              >
                <span className="min-w-0 text-start">
                  <span className="block font-serif text-title font-normal capitalize text-primary-900 transition-colors duration-fast group-hover:text-accent-700">
                    {fmt(monthDate, "LLLL")}
                  </span>
                  <span className="block text-meta text-primary-600">{t("yearView.bookedDays", { count: bookedDays })}</span>
                </span>
                <BrandChevronRightIcon size={16} aria-hidden="true" className="shrink-0 text-primary-400 transition-transform duration-fast group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </button>

              <div aria-hidden="true" className="mb-1 grid grid-cols-7 text-center text-[0.6875rem] font-semibold text-primary-500">
                {daysInMonth.slice(0, 7).map((d) => (
                  <span key={d.toISOString()}>{fmt(d, "EEEEE")}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {daysInMonth.map((d) => {
                  if (!isSameMonth(d, monthDate)) return <span key={d.toISOString()} aria-hidden="true" className="h-7" />;
                  const key = toDateKey(d);
                  const bCount = getBookingsForDay(d).length;
                  const isBlocked = isDayBlocked(d, targetListingId);
                  const past = key < todayKey;
                  const status = past ? t("status.past") : statusLabel(isBlocked, bCount > 0);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => changeView("month", d)}
                      aria-label={t("dayCellLabel", { date: fmt(d, "PPPP"), status })}
                      title={t("dayCellLabel", { date: fmt(d, "PP"), status })}
                      style={isBlocked && !past && bCount === 0 ? HATCH : undefined}
                      className={cn(
                        "flex h-7 items-center justify-center rounded-md text-[0.6875rem] tabular-nums transition-colors duration-fast ease-standard",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
                        bCount > 0
                          ? past
                            ? "bg-secondary-200 font-semibold text-secondary-800"
                            : "bg-secondary-600 font-semibold text-white"
                          : isBlocked && !past
                            ? "bg-tertiary-100 text-primary-600"
                            : past
                              ? "text-primary-300"
                              : "text-primary-700 hover:bg-primary/[0.06]",
                        key === todayKey && "ring-2 ring-accent-600"
                      )}
                    >
                      {fmt(d, "d")}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const listingOptions = [
    { value: "all", label: t("allProperties", { count: safeListings.length }) },
    ...safeListings.map((l) => ({ value: l.id, label: t("listingOption", { title: l.title, city: l.city }) })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 enter-up">
          <p className="text-eyebrow uppercase text-secondary-700">{t("eyebrow")}</p>
          <h1 className="mt-2 text-balance font-serif text-display-md text-primary-900">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-pretty text-body text-primary-600">{t("subtitle")}</p>
        </div>
        <SegmentedControl
          ariaLabel={t("viewSwitcherLabel")}
          options={VIEW_ORDER.map((v) => ({ value: v, label: viewLabels[v] }))}
          value={view}
          onChange={(v) => changeView(v)}
          className="self-start lg:self-auto"
        />
      </header>

      {/* Toolbar */}
      <Card padding="sm" className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <IconButton
            variant="tertiary"
            size="sm"
            onClick={handlePrev}
            label={t("previous", { view })}
            icon={<BrandChevronLeftIcon size={18} className="rtl:rotate-180" aria-hidden="true" />}
          />
          <IconButton
            variant="tertiary"
            size="sm"
            onClick={handleNext}
            label={t("next", { view })}
            icon={<BrandChevronRightIcon size={18} className="rtl:rotate-180" aria-hidden="true" />}
          />
          <h2 aria-live="polite" className="min-w-0 flex-1 truncate px-1 font-serif text-heading font-normal capitalize text-primary-900 lg:min-w-[13rem] lg:flex-none">
            {periodLabel}
          </h2>
          <Button variant="tertiary" size="sm" onClick={handleToday}>
            {tHost("today")}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            label={t("propertyLabel")}
            prefix={<BrandHomeIcon size={16} aria-hidden="true" />}
            value={selectedListingId}
            onChange={(e) => {
              setSelectedListingId(e.target.value);
              setSelectedRoomTypeId("all");
              setSelection(null);
            }}
            options={listingOptions}
            containerClassName="sm:w-72"
          />
          {activeListing?.roomTypes && activeListing.roomTypes.length > 0 && (
            <Select
              label={t("unitLabel")}
              prefix={<BrandBedIcon size={16} aria-hidden="true" />}
              value={selectedRoomTypeId}
              onChange={(e) => setSelectedRoomTypeId(e.target.value)}
              options={[
                { value: "all", label: t("allUnits", { count: activeListing.roomTypes.length }) },
                ...activeListing.roomTypes.map((rt) => ({
                  value: rt.id,
                  label: t("unitOption", {
                    name: rt.name,
                    unit: rt.bookingUnit === "bed" ? "bed" : "room",
                    count: rt.inventoryCount || rt.totalInventory || 0,
                  }),
                })),
              ]}
              containerClassName="sm:w-60"
            />
          )}
        </div>
      </Card>

      {/* Range helper (month view) */}
      {view === "month" && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRangeMode((v) => !v);
              setSelection(null);
            }}
            aria-pressed={rangeMode}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-meta font-semibold transition-[background-color,box-shadow,color] duration-fast ease-standard",
              focusRing,
              rangeMode ? "bg-primary-800 text-white shadow-e2" : "bg-white text-primary-800 shadow-e1 hover:shadow-e2"
            )}
          >
            <BrandCalendarIcon size={16} aria-hidden="true" />
            {t("range.modeLabel")}
          </button>
          <p className="text-meta text-primary-600" aria-live="polite">
            {rangeMode ? (selection ? t("range.pickEnd") : t("range.pickStart")) : t("range.hint")}
          </p>
          {safeListings.length > 1 && (
            <ul aria-label={t("listingLegend")} className="ms-auto hidden items-center gap-3 md:flex">
              {safeListings.slice(0, 4).map((l) => (
                <li key={l.id} className="flex max-w-[9rem] items-center gap-1.5 text-meta text-primary-700">
                  <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", (listingColorMap[l.id] || LISTING_COLORS[0]).dot)} />
                  <span className="truncate" title={l.title}>
                    {l.title || t("untitledListing")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Views with directional transitions */}
      <div className="-mx-1 overflow-hidden px-1 pb-2">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <m.div
            key={`${view}-${periodKey}`}
            custom={direction}
            variants={periodVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {view === "month" && renderMonth()}
            {view === "week" && renderWeek()}
            {view === "day" && renderDay()}
            {view === "year" && renderYear()}
          </m.div>
        </AnimatePresence>
      </div>

      {view !== "month" && view !== "year" && <div className="mt-4">{legend}</div>}

      {/* Selected day */}
      <Dialog
        isOpen={!!activeDay}
        onClose={() => setActiveDay(null)}
        busy={isSaving}
        title={activeDay ? fmt(activeDay, "PPPP") : ""}
        description={activeListing ? t("listingOption", { title: activeListing.title, city: activeListing.city }) : t("untitledListing")}
        showClose
        size="sm"
      >
        {activeDay && (
          <div className="space-y-5">
            <Card variant="sunken" padding="sm">
              <Switch
                label={t("dialog.openForBookings")}
                description={activeDayBlocked ? t("dialog.blockedDesc") : t("dialog.availableDesc")}
                checked={!activeDayBlocked}
                disabled={isSaving}
                onCheckedChange={() => handleToggleBlock(activeDay)}
              />
            </Card>

            <div>
              <p className="mb-2 text-body font-semibold text-primary-900">{t("dialog.priceTitle")}</p>
              <div className="flex items-start gap-2">
                <Input
                  label={t("dialog.priceInputLabel")}
                  type="number"
                  inputMode="numeric"
                  value={overridePriceInput}
                  onChange={(e) => {
                    setOverridePriceInput(e.target.value);
                    if (priceError) setPriceError(null);
                  }}
                  placeholder={String(activeListing?.price ?? "")}
                  suffix={locale === "ar" ? "د.ج" : "DZD"}
                  helper={t("dialog.defaultRate", { price: money(activeListing?.price ?? 0) })}
                  error={priceError ?? undefined}
                  containerClassName="flex-1"
                />
                <Button className="mt-1.5" onClick={() => handleSavePriceOverride(activeDay)} loading={isSaving}>
                  {t("dialog.saveRate")}
                </Button>
              </div>
            </div>

            {activeDayBookings.length > 0 && (
              <div className="rounded-2xl bg-secondary-100/70 p-4">
                <p className="mb-2 text-meta font-semibold text-secondary-800">{t("dialog.reservationsOnDate")}</p>
                <ul className="space-y-1.5">
                  {activeDayBookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2 text-meta text-primary-800">
                      <span>{t("guestLine", { name: b.user?.name || t("guestFallback"), count: b.guestsCount })}</span>
                      <span className="font-semibold tabular-nums text-primary-900">{money(b.totalPrice)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setActiveDay(null)}>
                {tCommon("close")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Selected range */}
      <Dialog
        isOpen={rangeOpen}
        onClose={closeRange}
        busy={isSaving}
        title={t("range.title", { count: selectedKeys.length })}
        description={
          selectedKeys.length > 0
            ? t("range.dates", {
                start: fmt(fromDateKey(selectedKeys[0]), "PPP"),
                end: fmt(fromDateKey(selectedKeys[selectedKeys.length - 1]), "PPP"),
              })
            : undefined
        }
        showClose
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-meta text-primary-600">
            {activeListing ? t("listingOption", { title: activeListing.title, city: activeListing.city }) : t("untitledListing")}
          </p>
          {(() => {
            const bookedInside = selectedKeys.filter((k) => getBookingsForDay(fromDateKey(k)).length > 0).length;
            return bookedInside > 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-meta text-amber-900">{t("range.bookedInside", { count: bookedInside })}</p>
            ) : null;
          })()}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => handleRangeBlock(true)}
              loading={isSaving}
              leadingIcon={<BrandLockIcon size={16} aria-hidden="true" />}
            >
              {t("range.block")}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => handleRangeBlock(false)}
              disabled={isSaving}
              leadingIcon={<BrandDoorIcon size={16} aria-hidden="true" />}
            >
              {t("range.reopen")}
            </Button>
          </div>
          <div className="border-t border-primary/[0.08] pt-5">
            <p className="mb-2 text-body font-semibold text-primary-900">{t("range.priceTitle")}</p>
            <div className="flex items-start gap-2">
              <Input
                label={t("range.priceInputLabel")}
                type="number"
                inputMode="numeric"
                value={rangePriceInput}
                onChange={(e) => {
                  setRangePriceInput(e.target.value);
                  if (rangePriceError) setRangePriceError(null);
                }}
                placeholder={String(activeListing?.price ?? "")}
                suffix={locale === "ar" ? "د.ج" : "DZD"}
                helper={t("dialog.defaultRate", { price: money(activeListing?.price ?? 0) })}
                error={rangePriceError ?? undefined}
                containerClassName="flex-1"
              />
              <Button className="mt-1.5" onClick={handleRangePrice} disabled={isSaving}>
                {t("range.savePrice")}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeRange}>
              {t("range.clear")}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
