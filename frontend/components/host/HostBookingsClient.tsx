"use client";

import React, { useState, useMemo, useId } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Reservation, Listing, User } from "@/types";
import { respondToReservationAction } from "@/app/actions/bookings";
import {
  BrandCalendarIcon,
  BrandSearchIcon,
  BrandFilterIcon,
  BrandCheckIcon,
  BrandCloseIcon,
  BrandMessageIcon,
  BrandEyeIcon,
  BrandClockIcon,
  BrandPhoneIcon,
  BrandMailIcon,
  BrandReceiptIcon,
  BrandShieldIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import Calendar from "@/components/inputs/Calendar";
import { Range } from "react-date-range";
import { addDays } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { setListingDatesBlockedAction } from "@/app/actions/calendar";
import { computeHostPayout } from "@/lib/booking/payout";
import { formatDateRange, fromDateKey, todayKey, toDateKey } from "@/lib/booking/dates";
import { formatDzd } from "@/lib/currency";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { useActionError } from "@/hook/useActionError";

interface HostBookingsClientProps {
  initialReservations: Reservation[];
  hostListings: Listing[];
  currentUser?: User | null;
  /** Host-blocked date keys per listing (server-built). */
  blockedByListing?: Record<string, string[]>;
}

type TabType = "all" | "upcoming" | "current" | "past" | "cancelled" | "pending";

/** Tab a reservation belongs to, relative to today's date key. */
function getReservationCategory(res: Reservation, todayStr: string): TabType {
  if (res.status === "cancelled" || res.status === "declined" || res.status === "expired") return "cancelled";
  if (res.status === "pending") return "pending";
  if (res.status === "completed") return "past";
  if (res.endDate < todayStr) return "past";
  if (res.startDate <= todayStr && res.endDate >= todayStr) return "current";
  return "upcoming";
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const FALLBACK_LISTING_IMAGE = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914";

export default function HostBookingsClient({
  initialReservations,
  hostListings,
  currentUser,
  blockedByListing = {},
}: HostBookingsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("hostBookings");
  const errorText = useActionError();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [selectedTab, setSelectedTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListingId, setSelectedListingId] = useState<string>("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReasonOption, setDeclineReasonOption] = useState<string>("dates_unavailable");
  const [customDeclineReason, setCustomDeclineReason] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const baseId = useId();
  const miniCalendarId = `${baseId}-mini-calendar`;
  const resultsId = `${baseId}-results`;
  const searchId = `${baseId}-search`;
  const listingFilterId = `${baseId}-listing-filter`;
  const detailTitleId = `${baseId}-detail-title`;
  const customReasonId = `${baseId}-custom-reason`;

  const closeDetail = () => setSelectedReservation(null);
  const detailRef = useDialogA11y<HTMLDivElement>(!!selectedReservation, { onEscape: closeDetail });

  const money = (amount: number) => formatDzd(amount, locale);

  // Solo Host Mini-Calendar State (Section 4)
  const isIndividual = currentUser?.hostType === "individual" || !currentUser?.hostType;
  const [showMiniCalendar, setShowMiniCalendar] = useState<boolean>(isIndividual);
  const [calendarRange, setCalendarRange] = useState<Range>({
    startDate: new Date(),
    endDate: addDays(new Date(), 2),
    key: "selection",
  });
  // Blocking applies to the filtered listing, or the host's first listing.
  const blockTargetId = selectedListingId !== "all" ? selectedListingId : hostListings[0]?.id || "";
  const [blockedKeys, setBlockedKeys] = useState<Record<string, string[]>>(blockedByListing);
  const blockedDates = useMemo(
    () => (blockedKeys[blockTargetId] || []).map(fromDateKey),
    [blockedKeys, blockTargetId]
  );

  const updateBlocked = async (blocked: boolean) => {
    if (!calendarRange.startDate || !calendarRange.endDate || !blockTargetId) return;
    const result = await setListingDatesBlockedAction({
      listingId: blockTargetId,
      from: toDateKey(calendarRange.startDate),
      to: toDateKey(calendarRange.endDate),
      blocked,
    });
    if (!result.ok) {
      toast.error(errorText(result));
      return;
    }
    setBlockedKeys((prev) => ({
      ...prev,
      [blockTargetId]: result.data.filter((o) => o.isBlocked).map((o) => o.date),
    }));
    if (blocked) toast.success(t("toast.datesBlocked"));
    else toast.info(t("toast.datesUnblocked"));
    router.refresh();
  };
  const handleBlockSelectedDates = () => updateBlocked(true);
  const handleUnblockSelectedDates = () => updateBlocked(false);

  const todayStr = todayKey();

  // Helper to compute remaining 24h approval time
  const getRemainingTime = (res: Reservation) => {
    const expiresAt = res.expiresAt
      ? new Date(res.expiresAt).getTime()
      : new Date(res.createdAt).getTime() + 24 * 60 * 60 * 1000;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return { expired: true, text: t("timer.expired"), urgent: false };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      expired: false,
      urgent: hours < 4,
      text: t("timer.left", { hours, minutes }),
    };
  };

  // Tab counts
  const counts = useMemo(() => {
    const resCounts: Record<TabType, number> = {
      all: reservations.length,
      upcoming: 0,
      current: 0,
      past: 0,
      cancelled: 0,
      pending: 0,
    };

    reservations.forEach((r) => {
      const cat = getReservationCategory(r, todayStr);
      resCounts[cat] = (resCounts[cat] || 0) + 1;
    });

    return resCounts;
  }, [reservations, todayStr]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      // Tab filter
      if (selectedTab !== "all") {
        const cat = getReservationCategory(res, todayStr);
        if (cat !== selectedTab) return false;
      }

      // Listing filter
      if (selectedListingId !== "all" && res.listingId !== selectedListingId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const guestName = (res.user?.name || "").toLowerCase();
        const listingTitle = (res.listing?.title || "").toLowerCase();
        const code = res.id.toLowerCase();
        if (!guestName.includes(q) && !listingTitle.includes(q) && !code.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [reservations, selectedTab, selectedListingId, searchQuery, todayStr]);

  // Action handlers
  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await respondToReservationAction(id, "confirm");
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: result.data.status } : r)));
      toast.success(t("toast.confirmed"));
      router.refresh();
    } catch {
      toast.error(t("toast.confirmFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const executeDecline = async (id: string) => {
    setActionLoading(id);
    const reasonText =
      declineReasonOption === "other"
        ? customDeclineReason.trim() || t("declineDialog.reasonDefault")
        : declineReasonOption === "dates_unavailable"
        ? t("declineDialog.reasonDatesUnavailable")
        : declineReasonOption === "maintenance"
        ? t("declineDialog.reasonMaintenance")
        : t("declineDialog.reasonPolicyMismatch");

    try {
      const result = await respondToReservationAction(id, "decline", reasonText);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: result.data.status,
                declineReason: result.data.declineReason,
                paymentStatus: result.data.paymentStatus,
              }
            : r
        )
      );
      toast.info(t("toast.declined"));
      router.refresh();
    } catch {
      toast.error(t("toast.declineFailed"));
    } finally {
      setActionLoading(null);
      setDecliningId(null);
      setCustomDeclineReason("");
    }
  };

  const handleDecline = (id: string) => {
    setDecliningId(id);
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await respondToReservationAction(id, "cancel");
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: result.data.status, paymentStatus: result.data.paymentStatus } : r
        )
      );
      toast.info(t("toast.cancelled"));
      setCancellingId(null);
      if (selectedReservation?.id === id) {
        setSelectedReservation(null);
      }
      router.refresh();
    } catch {
      toast.error(t("toast.cancelFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const refundLabel = (res: Reservation) =>
    res.paymentStatus === "refunded"
      ? t("refund.refunded")
      : res.paymentStatus === "partially_refunded"
      ? t("refund.partial", { amount: money(res.refundAmount ?? 0) })
      : res.paymentStatus === "voided"
      ? t("refund.voided")
      : t("refund.none");

  const hasActiveFilters = !!searchQuery || selectedListingId !== "all" || selectedTab !== "all";

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "all", label: t("tabs.all"), count: counts.all },
    { id: "pending", label: t("tabs.pending"), count: counts.pending },
    { id: "upcoming", label: t("tabs.upcoming"), count: counts.upcoming },
    { id: "current", label: t("tabs.current"), count: counts.current },
    { id: "past", label: t("tabs.past"), count: counts.past },
    { id: "cancelled", label: t("tabs.cancelled"), count: counts.cancelled },
  ];

  const declineOptions = [
    { id: "dates_unavailable", label: t("declineDialog.optionDatesUnavailable") },
    { id: "maintenance", label: t("declineDialog.optionMaintenance") },
    { id: "policy_mismatch", label: t("declineDialog.optionPolicyMismatch") },
    { id: "other", label: t("declineDialog.optionOther") },
  ];

  const memberSinceYear = selectedReservation?.user?.createdAt
    ? formatDate(selectedReservation.user.createdAt, locale, { year: "numeric" })
    : "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">{t("title")}</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {isIndividual ? t("subtitleIndividual") : t("subtitleAgency")}
          </p>
        </div>

        {/* Quick summary stats & Solo calendar toggle */}
        <div className="flex items-center gap-3">
          {isIndividual && (
            <button
              type="button"
              onClick={() => setShowMiniCalendar(!showMiniCalendar)}
              aria-expanded={showMiniCalendar}
              aria-controls={miniCalendarId}
              className={`px-4 py-2.5 rounded-2xl border border-tertiary bg-white hover:bg-neutral-50 text-xs font-bold text-primary flex items-center gap-2 shadow-2xs transition btn-press cursor-pointer ${FOCUS_RING}`}
            >
              <BrandCalendarIcon size={16} className="text-secondary" aria-hidden="true" />
              <span>{showMiniCalendar ? t("hideCalendar") : t("showCalendar")}</span>
            </button>
          )}

          <div className="bg-white border border-tertiary/70 rounded-2xl px-4 py-2.5 shadow-2xs text-center">
            <span className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
              {t("totalStays")}
            </span>
            <span className="text-lg font-black text-primary">{formatNumber(reservations.length, locale)}</span>
          </div>
          <div className="bg-white border border-tertiary/70 rounded-2xl px-4 py-2.5 shadow-2xs text-center">
            <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider">{t("pending")}</span>
            <span className="text-lg font-black text-amber-700">{formatNumber(counts.pending, locale)}</span>
          </div>
        </div>
      </div>

      {/* Embedded Mini-Calendar for Solo Host (Section 4) */}
      {showMiniCalendar && (
        <section
          id={miniCalendarId}
          aria-labelledby={`${miniCalendarId}-title`}
          className="mb-6 p-6 bg-white rounded-3xl border border-tertiary/70 shadow-2xs animate-in fade-in space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tertiary/40 pb-4">
            <div>
              <h2
                id={`${miniCalendarId}-title`}
                className="font-serif text-base sm:text-lg font-bold text-primary flex items-center gap-2"
              >
                <BrandCalendarIcon className="text-secondary" aria-hidden="true" />
                <span>{t("miniCalendar.title")}</span>
              </h2>
              <p className="text-xs text-neutral-600">{t("miniCalendar.subtitle")}</p>
            </div>
            <ul className="flex items-center gap-3 text-xs">
              <li className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-neutral-600 font-medium">{t("miniCalendar.legendConfirmed")}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                <span className="text-neutral-600 font-medium">{t("miniCalendar.legendPending")}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-800" aria-hidden="true" />
                <span className="text-neutral-600 font-medium">{t("miniCalendar.legendBlocked")}</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Calendar Widget */}
            <div className="lg:col-span-2">
              <Calendar
                value={calendarRange}
                onChange={(val) => setCalendarRange(val.selection)}
                disabledDates={blockedDates}
              />
            </div>

            {/* Date Block Actions */}
            <div className="bg-neutral-50 rounded-2xl p-5 border border-tertiary/60 space-y-4 text-xs">
              <div>
                <span className="font-bold text-xs text-neutral-600 uppercase tracking-wider block">
                  {t("miniCalendar.selectedRange")}
                </span>
                <span className="text-sm font-bold text-primary block mt-0.5" aria-live="polite">
                  {calendarRange.startDate && calendarRange.endDate
                    ? formatDateRange(toDateKey(calendarRange.startDate), toDateKey(calendarRange.endDate), locale)
                    : t("miniCalendar.selectDates")}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-tertiary/40">
                <button
                  type="button"
                  onClick={handleBlockSelectedDates}
                  className={`w-full py-2.5 px-3 bg-neutral-800 hover:bg-black text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer btn-press ${FOCUS_RING}`}
                >
                  <BrandCloseIcon size={15} aria-hidden="true" />
                  <span>{t("miniCalendar.block")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleUnblockSelectedDates}
                  className={`w-full py-2.5 px-3 bg-white hover:bg-neutral-100 text-primary border border-tertiary/80 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer btn-press ${FOCUS_RING}`}
                >
                  <BrandCheckIcon size={15} className="text-emerald-600" aria-hidden="true" />
                  <span>{t("miniCalendar.unblock")}</span>
                </button>
              </div>

              <p className="pt-2 text-[11px] text-neutral-600 leading-relaxed">{t("miniCalendar.hint")}</p>
            </div>
          </div>
        </section>
      )}

      {/* Status filter tabs */}
      <div
        role="group"
        aria-label={t("tabs.label")}
        className="flex items-center gap-2 border-b border-tertiary/60 overflow-x-auto pb-1 mb-6 scrollbar-none"
      >
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              aria-pressed={isActive}
              aria-controls={resultsId}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${FOCUS_RING} ${
                isActive
                  ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                  : "border-transparent text-neutral-600 hover:text-primary hover:border-tertiary"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-primary text-white"
                    : tab.id === "pending" && tab.count > 0
                    ? "bg-amber-100 text-amber-800 animate-pulse"
                    : "bg-tertiary/40 text-neutral-700"
                }`}
              >
                {formatNumber(tab.count, locale)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Listing Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 mb-6 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <label htmlFor={searchId} className="sr-only">
            {t("searchLabel")}
          </label>
          <BrandSearchIcon
            size={18}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-controls={resultsId}
            className="w-full ps-10 pe-9 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary placeholder:text-neutral-500 focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={t("clearSearch")}
              className={`absolute end-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-700 font-bold rounded ${FOCUS_RING}`}
            >
              <BrandCloseIcon size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Listing Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label
            htmlFor={listingFilterId}
            className="text-xs font-bold text-neutral-600 whitespace-nowrap flex items-center gap-1"
          >
            <BrandFilterIcon size={14} aria-hidden="true" /> {t("filterListing")}
          </label>
          <select
            id={listingFilterId}
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            aria-controls={resultsId}
            className="w-full md:w-64 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <option value="all">{t("allProperties", { count: formatNumber(hostListings.length, locale) })}</option>
            {hostListings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {t("listingOption", { title: listing.title, city: listing.city })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookings List */}
      <div id={resultsId} aria-live="polite">
        {filteredReservations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-tertiary/70 p-12 text-center shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4 text-secondary">
              <BrandCalendarIcon size={32} aria-hidden="true" />
            </div>
            <h2 className="font-serif text-lg font-bold text-primary mb-1">{t("emptyTitle")}</h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto mb-4">
              {hasActiveFilters ? t("emptyFiltered") : t("emptyNone")}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedListingId("all");
                  setSelectedTab("all");
                }}
                className={`px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs ${FOCUS_RING}`}
              >
                {t("resetFilters")}
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredReservations.map((res) => {
              const guest = res.user;
              const listing = res.listing;
              const listingTitle = listing?.title || t("fallbackListingTitle");
              const guestName = guest?.name || t("guestFallback");
              const cat = getReservationCategory(res, todayStr);
              const payout = computeHostPayout(res);
              const netPayout = payout.net;
              const timer = getRemainingTime(res);

              return (
                <li
                  key={res.id}
                  className="bg-white rounded-2xl border border-tertiary/70 p-4 sm:p-6 shadow-2xs hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  {/* Start: Guest & Listing Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                    {/* Listing thumbnail */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-100 border border-tertiary/50">
                      <Image
                        src={listing?.imageSrc?.[0] || FALLBACK_LISTING_IMAGE}
                        alt={t("listingImageAlt", { title: listingTitle })}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-mono font-bold text-neutral-600" dir="ltr">
                          {res.id}
                        </span>
                        {/* Status Badges */}
                        {res.status === "pending" && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" aria-hidden="true" />
                              {t("badge.pending")}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                                timer.expired
                                  ? "bg-neutral-100 text-neutral-600 border-neutral-300"
                                  : timer.urgent
                                  ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              <BrandClockIcon size={12} aria-hidden="true" />
                              {timer.text}
                            </span>
                          </div>
                        )}
                        {res.status === "confirmed" && cat === "current" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                            {t("badge.current")}
                          </span>
                        )}
                        {res.status === "confirmed" && cat === "upcoming" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            {t("badge.upcoming")}
                          </span>
                        )}
                        {res.status === "completed" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
                            {t("badge.completed")}
                          </span>
                        )}
                        {res.status === "declined" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {res.declineReason
                              ? t("badge.declinedWithReason", { reason: res.declineReason })
                              : t("badge.declined")}
                          </span>
                        )}
                        {res.status === "cancelled" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            {t(
                              res.cancelledBy === "host"
                                ? "badge.cancelledByHost"
                                : res.cancelledBy === "system"
                                ? "badge.cancelledBySystem"
                                : "badge.cancelledByGuest",
                              { refund: refundLabel(res) }
                            )}
                          </span>
                        )}
                        {res.status === "expired" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
                            {t("badge.expired")}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif font-bold text-primary text-base sm:text-lg truncate mb-1">
                        {listingTitle}
                      </h3>

                      {/* Guest info row */}
                      <div className="flex items-center gap-2 text-xs text-neutral-600 mb-2">
                        <div className="relative w-5 h-5 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                          <Image
                            src={guest?.image || "/assets/avatar.png"}
                            alt=""
                            fill
                            sizes="20px"
                            className="object-cover"
                          />
                        </div>
                        <span className="font-bold text-primary">{guestName}</span>
                        <span title={t("idVerified")}>
                          <BrandShieldIcon size={14} className="text-secondary" aria-hidden="true" />
                          <span className="sr-only">{t("idVerified")}</span>
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>{t("guestsCount", { count: res.guestsCount })}</span>
                      </div>

                      {/* Dates & duration */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                        <BrandCalendarIcon size={15} className="text-secondary shrink-0" aria-hidden="true" />
                        <span>{formatDateRange(res.startDate, res.endDate, locale)}</span>
                      </div>

                      {/* Guest note if provided */}
                      {res.guestMessage && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-neutral-50/80 border border-tertiary/70 text-xs text-neutral-700 flex items-start gap-2">
                          <BrandMessageIcon size={16} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block">
                              {t("guestNote")}
                            </span>
                            <q className="italic text-neutral-600 leading-snug block">{res.guestMessage}</q>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Center: Financials */}
                  <div className="lg:text-end border-t lg:border-t-0 pt-3 lg:pt-0 border-tertiary/50">
                    <span className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                      {t("netPayout")}
                    </span>
                    <div className="text-lg font-black text-primary">{money(netPayout)}</div>
                    <span className="text-[11px] text-neutral-600">
                      {t("guestPaidSummary", {
                        total: money(res.totalPrice),
                        commission: money(payout.commission),
                      })}
                    </span>
                    <div className="mt-1">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          res.paymentStatus === "paid" || !res.paymentStatus
                            ? "bg-emerald-50 text-emerald-700"
                            : res.paymentStatus === "refunded"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {t("paymentLabel", { status: t(`paymentStatus.${res.paymentStatus || "paid"}`) })}
                      </span>
                    </div>
                  </div>

                  {/* End: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {res.status === "pending" ? (
                      <>
                        {timer.expired ? (
                          <span className="px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-bold">
                            {t("requestExpired")}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAccept(res.id)}
                              disabled={actionLoading === res.id}
                              aria-busy={actionLoading === res.id}
                              className={`px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 ${FOCUS_RING}`}
                            >
                              <BrandCheckIcon size={16} aria-hidden="true" />
                              <span>{t("accept")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecline(res.id)}
                              disabled={actionLoading === res.id}
                              className={`px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5 disabled:opacity-50 ${FOCUS_RING}`}
                            >
                              <BrandCloseIcon size={16} aria-hidden="true" />
                              <span>{t("decline")}</span>
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedReservation(res)}
                          aria-haspopup="dialog"
                          className={`px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${FOCUS_RING}`}
                        >
                          <BrandEyeIcon size={15} aria-hidden="true" />
                          <span>{t("details")}</span>
                        </button>

                        <Link
                          href="/host/messages"
                          className={`p-2 border border-tertiary/80 hover:bg-neutral-50 text-neutral-700 rounded-xl transition ${FOCUS_RING}`}
                          title={t("messageGuest")}
                          aria-label={t("messageGuest")}
                        >
                          <BrandMessageIcon size={18} aria-hidden="true" />
                        </Link>

                        {res.status === "confirmed" && cat !== "past" && (
                          <button
                            type="button"
                            onClick={() => setCancellingId(res.id)}
                            className={`px-2.5 py-2 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl transition ${FOCUS_RING}`}
                            title={t("cancelReservation")}
                          >
                            {t("cancel")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div
            ref={detailRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailTitleId}
            className="print-area bg-white rounded-3xl max-w-2xl w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8"
          >
            <div className="flex items-center justify-between pb-4 border-b border-tertiary/60 mb-6">
              <div>
                <span className="text-[11px] font-mono font-bold text-neutral-600" dir="ltr">
                  {selectedReservation.id}
                </span>
                <h2 id={detailTitleId} className="font-serif text-xl font-black text-primary">
                  {t("detail.title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                aria-label={t("detail.close")}
                className={`print:hidden w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm ${FOCUS_RING}`}
              >
                <BrandCloseIcon size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Guest details section */}
            <div className="bg-neutral-50 rounded-2xl p-4 border border-tertiary/60 mb-6">
              <h3 className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3">
                {t("detail.guestProfile")}
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-200">
                  <Image
                    src={selectedReservation.user?.image || "/assets/avatar.png"}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-primary text-base">
                    <span>{selectedReservation.user?.name || t("guestFallback")}</span>
                    {selectedReservation.user?.isIdentityVerified && (
                      <>
                        <BrandShieldIcon size={14} className="text-secondary" aria-hidden="true" />
                        <span className="sr-only">{t("idVerified")}</span>
                      </>
                    )}
                  </div>
                  {memberSinceYear && (
                    <span className="text-xs text-neutral-600">
                      {t("detail.memberSince", { year: memberSinceYear })}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-700 bg-white p-2.5 rounded-xl border border-tertiary/40">
                  <BrandPhoneIcon size={16} className="text-secondary" aria-hidden="true" />
                  {selectedReservation.user?.phone ? (
                    <span className="font-mono" dir="ltr">
                      {selectedReservation.user.phone}
                    </span>
                  ) : (
                    <span>{t("detail.notProvided")}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-neutral-700 bg-white p-2.5 rounded-xl border border-tertiary/40">
                  <BrandMailIcon size={16} className="text-secondary" aria-hidden="true" />
                  <span className="truncate" dir={selectedReservation.user?.email ? "ltr" : undefined}>
                    {selectedReservation.user?.email || t("detail.notProvided")}
                  </span>
                </div>
              </div>
            </div>

            {/* Stays info */}
            <dl className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between items-center gap-4 py-2 border-b border-tertiary/30">
                <dt className="text-neutral-600">{t("detail.listing")}</dt>
                <dd className="font-bold text-primary text-end">{selectedReservation.listing?.title}</dd>
              </div>
              <div className="flex justify-between items-center gap-4 py-2 border-b border-tertiary/30">
                <dt className="text-neutral-600">{t("detail.dates")}</dt>
                <dd className="font-bold text-primary text-end">
                  {formatDateRange(selectedReservation.startDate, selectedReservation.endDate, locale)}
                </dd>
              </div>
              <div className="flex justify-between items-center gap-4 py-2 border-b border-tertiary/30">
                <dt className="text-neutral-600">{t("detail.guests")}</dt>
                <dd className="font-bold text-primary text-end">
                  {t("guestsCount", { count: selectedReservation.guestsCount })}
                </dd>
              </div>
              <div className="flex justify-between items-center gap-4 py-2 border-b border-tertiary/30">
                <dt className="text-neutral-600">{t("detail.paymentChannel")}</dt>
                <dd className="font-bold text-primary text-end">
                  {selectedReservation.paymentMethod || t("detail.paymentChannelDefault")}
                </dd>
              </div>
            </dl>

            {/* Financial Payout Breakdown */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 mb-6">
              <h3 className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                {t("detail.breakdown")}
              </h3>
              <div className="space-y-1.5 text-xs text-neutral-700">
                <div className="flex justify-between">
                  <span>{t("detail.grossTotal")}</span>
                  <span className="font-bold font-mono">{money(selectedReservation.totalPrice)}</span>
                </div>
                {(() => {
                  const p = computeHostPayout(selectedReservation);
                  return (
                    <>
                      <div className="flex justify-between text-neutral-600">
                        <span>{t("detail.subtotal")}</span>
                        <span className="font-mono">{money(p.subtotal)}</span>
                      </div>
                      {p.cleaningFee > 0 && (
                        <div className="flex justify-between text-neutral-600">
                          <span>{t("detail.cleaningFee")}</span>
                          <span className="font-mono">{money(p.cleaningFee)}</span>
                        </div>
                      )}
                      {p.refunded > 0 && (
                        <div className="flex justify-between text-rose-700">
                          <span>{t("detail.refunded")}</span>
                          <span className="font-mono font-bold">
                            {t("detail.negative", { amount: money(p.refunded) })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-rose-700">
                        <span>
                          {selectedReservation.commissionRate
                            ? t("detail.commissionWithRate", {
                                rate: formatNumber(selectedReservation.commissionRate, locale),
                              })
                            : t("detail.commission")}
                        </span>
                        <span className="font-mono font-bold">
                          {t("detail.negative", { amount: money(p.commission) })}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-black text-primary pt-2 border-t border-primary/20">
                        <span>{t("detail.net")}</span>
                        <span className="font-mono">{money(p.net)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Modal actions */}
            <div className="print:hidden flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className={`w-full sm:w-auto px-4 py-2.5 border border-tertiary/80 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${FOCUS_RING}`}
              >
                <BrandReceiptIcon size={16} aria-hidden="true" />
                <span>{t("detail.download")}</span>
              </button>
              <button
                type="button"
                onClick={closeDetail}
                className={`w-full sm:w-auto px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs ${FOCUS_RING}`}
              >
                {t("detail.done")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Confirmation Modal with Reason */}
      <ConfirmDialog
        isOpen={!!decliningId}
        variant="destructive"
        title={t("declineDialog.title")}
        message={t("declineDialog.message")}
        confirmLabel={t("declineDialog.confirm")}
        cancelLabel={t("declineDialog.keep")}
        isLoading={actionLoading === decliningId}
        onConfirm={() => {
          if (decliningId) executeDecline(decliningId);
        }}
        onCancel={() => {
          setDecliningId(null);
          setCustomDeclineReason("");
        }}
      >
        <fieldset className="space-y-3 mt-3 pt-3 border-t border-tertiary/50 text-xs">
          <legend className="font-bold text-neutral-700 block">{t("declineDialog.reasonLegend")}</legend>
          <div className="space-y-2">
            {declineOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100/70 border border-tertiary/60 cursor-pointer transition focus-within:ring-2 focus-within:ring-accent-600"
              >
                <input
                  type="radio"
                  name="decline-reason"
                  value={opt.id}
                  checked={declineReasonOption === opt.id}
                  onChange={(e) => setDeclineReasonOption(e.target.value)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-neutral-700 font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          {declineReasonOption === "other" && (
            <div className="mt-2">
              <label htmlFor={customReasonId} className="sr-only">
                {t("declineDialog.customLabel")}
              </label>
              <textarea
                id={customReasonId}
                rows={2}
                value={customDeclineReason}
                onChange={(e) => setCustomDeclineReason(e.target.value)}
                placeholder={t("declineDialog.customPlaceholder")}
                className="w-full text-xs p-2.5 rounded-xl border border-tertiary/70 bg-white focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 transition resize-none placeholder:text-neutral-500"
              />
            </div>
          )}
        </fieldset>
      </ConfirmDialog>

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!cancellingId}
        variant="destructive"
        title={t("cancelDialog.title")}
        message={t("cancelDialog.message")}
        callout={t("cancelDialog.callout")}
        confirmLabel={t("cancelDialog.confirm")}
        cancelLabel={t("cancelDialog.keep")}
        isLoading={actionLoading === cancellingId}
        onConfirm={() => {
          if (cancellingId) handleCancel(cancellingId);
        }}
        onCancel={() => setCancellingId(null)}
      />
    </div>
  );
}
