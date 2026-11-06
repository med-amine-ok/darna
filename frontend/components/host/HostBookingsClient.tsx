"use client";

import React, { useState, useMemo, useId } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Reservation, Listing, User } from "@/types";
import { respondToReservationAction } from "@/app/actions/bookings";
import {
  BrandBanIcon,
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
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DialogFooter,
  IconButton,
  Input,
  KitEmptyState,
  RadioGroup,
  Select,
  TabPanel,
  Tabs,
  Textarea,
  cn,
  focusRing,
} from "@/components/ui";
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
  const tabsId = `host-bookings${baseId.replace(/:/g, "")}`;
  const customReasonId = `${baseId}-custom-reason`;

  const closeDetail = () => setSelectedReservation(null);

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

  const reference = (id: string) => id.replace(/^res_/, "").replace(/_/g, "-").toUpperCase();

  const statusBadge = (res: Reservation, cat: TabType) => {
    switch (res.status) {
      case "pending":
        return (
          <Badge tone="warning" dot>
            {t("badge.pending")}
          </Badge>
        );
      case "confirmed":
        return cat === "current" ? (
          <Badge tone="success" dot>
            {t("badge.current")}
          </Badge>
        ) : cat === "upcoming" ? (
          <Badge tone="olive">{t("badge.upcoming")}</Badge>
        ) : null;
      case "completed":
        return <Badge tone="neutral">{t("badge.completed")}</Badge>;
      case "declined":
        return (
          <Badge tone="danger" className="max-w-full truncate">
            {res.declineReason ? t("badge.declinedWithReason", { reason: res.declineReason }) : t("badge.declined")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge tone="danger" className="max-w-full truncate">
            {t(
              res.cancelledBy === "host"
                ? "badge.cancelledByHost"
                : res.cancelledBy === "system"
                ? "badge.cancelledBySystem"
                : "badge.cancelledByGuest",
              { refund: refundLabel(res) }
            )}
          </Badge>
        );
      case "expired":
        return <Badge tone="neutral">{t("badge.expired")}</Badge>;
      default:
        return null;
    }
  };

  const paymentTone = (status?: string): "success" | "danger" | "warning" =>
    status === "paid" || !status ? "success" : status === "refunded" ? "danger" : "warning";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="enter-up min-w-0">
          <p className="text-eyebrow uppercase text-secondary-700">{t("eyebrow")}</p>
          <h1 className="mt-2 font-serif text-display-md text-primary-900 [text-wrap:balance]">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-body text-primary-600 [text-wrap:pretty]">
            {isIndividual ? t("subtitleIndividual") : t("subtitleAgency")}
          </p>
        </div>

        <div className="enter-up flex flex-wrap items-center gap-3" style={{ animationDelay: "80ms" }}>
          <dl className="flex items-stretch gap-2">
            <div className="rounded-2xl bg-white px-4 py-2.5 shadow-e1">
              <dt className="text-meta text-primary-600">{t("totalStays")}</dt>
              <dd className="font-serif text-heading tabular-nums text-primary-900">
                {formatNumber(reservations.length, locale)}
              </dd>
            </div>
            <div className="rounded-2xl bg-white px-4 py-2.5 shadow-e1">
              <dt className="flex items-center gap-1.5 text-meta text-amber-800">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                {t("pending")}
              </dt>
              <dd className="font-serif text-heading tabular-nums text-primary-900">
                {formatNumber(counts.pending, locale)}
              </dd>
            </div>
          </dl>
          {isIndividual && (
            <Button
              variant="tertiary"
              size="md"
              onClick={() => setShowMiniCalendar(!showMiniCalendar)}
              aria-expanded={showMiniCalendar}
              aria-controls={miniCalendarId}
              leadingIcon={<BrandCalendarIcon size={16} aria-hidden="true" />}
            >
              {showMiniCalendar ? t("hideCalendar") : t("showCalendar")}
            </Button>
          )}
        </div>
      </header>

      {/* Solo host mini calendar */}
      {showMiniCalendar && (
        <Card
          as="section"
          id={miniCalendarId}
          aria-labelledby={`${miniCalendarId}-title`}
          padding="lg"
          radius="3xl"
          className="enter-up mb-8"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id={`${miniCalendarId}-title`} className="font-serif text-heading text-primary-900">
                {t("miniCalendar.title")}
              </h2>
              <p className="mt-1 text-meta text-primary-600">{t("miniCalendar.subtitle")}</p>
            </div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-meta text-primary-700">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-secondary-600" aria-hidden="true" />
                {t("miniCalendar.legendConfirmed")}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                {t("miniCalendar.legendPending")}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary-800" aria-hidden="true" />
                {t("miniCalendar.legendBlocked")}
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <Calendar
                value={calendarRange}
                onChange={(val) => setCalendarRange(val.selection)}
                disabledDates={blockedDates}
              />
            </div>
            <div className="space-y-4 rounded-2xl bg-darnaBg-300/60 p-5">
              <div>
                <p className="text-meta text-primary-600">{t("miniCalendar.selectedRange")}</p>
                <p className="mt-1 text-title text-primary-900" aria-live="polite">
                  {calendarRange.startDate && calendarRange.endDate
                    ? formatDateRange(toDateKey(calendarRange.startDate), toDateKey(calendarRange.endDate), locale)
                    : t("miniCalendar.selectDates")}
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={handleBlockSelectedDates}
                  leadingIcon={<BrandBanIcon size={16} aria-hidden="true" />}
                >
                  {t("miniCalendar.block")}
                </Button>
                <Button
                  variant="tertiary"
                  size="md"
                  fullWidth
                  onClick={handleUnblockSelectedDates}
                  leadingIcon={<BrandCheckIcon size={16} aria-hidden="true" />}
                >
                  {t("miniCalendar.unblock")}
                </Button>
              </div>
              <p className="text-meta text-primary-600 [text-wrap:pretty]">{t("miniCalendar.hint")}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline tabs */}
      <div className="-mx-4 mb-5 overflow-x-auto scrollbar-none px-4 sm:mx-0 sm:px-0">
        <Tabs
          id={tabsId}
          ariaLabel={t("tabs.label")}
          value={selectedTab}
          onChange={setSelectedTab}
          items={tabs.map((tab) => ({ value: tab.id, label: tab.label, count: tab.count }))}
          className="min-w-max"
        />
      </div>

      {/* Search & listing filter */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <Input
          id={searchId}
          type="search"
          label={t("searchLabel")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-controls={resultsId}
          prefix={<BrandSearchIcon size={18} aria-hidden="true" />}
          suffix={
            searchQuery ? (
              <IconButton
                label={t("clearSearch")}
                size="sm"
                icon={<BrandCloseIcon size={14} aria-hidden="true" />}
                onClick={() => setSearchQuery("")}
              />
            ) : undefined
          }
        />
        <Select
          id={listingFilterId}
          label={t("filterListing")}
          value={selectedListingId}
          onChange={(e) => setSelectedListingId(e.target.value)}
          aria-controls={resultsId}
          prefix={<BrandFilterIcon size={16} aria-hidden="true" />}
        >
          <option value="all">{t("allProperties", { count: formatNumber(hostListings.length, locale) })}</option>
          {hostListings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {t("listingOption", { title: listing.title, city: listing.city })}
            </option>
          ))}
        </Select>
      </div>

      {/* Results */}
      <TabPanel tabsId={tabsId} value={selectedTab} active={selectedTab}>
        <div id={resultsId} aria-live="polite">
          {filteredReservations.length === 0 ? (
            <Card padding="none">
              <KitEmptyState
                compact
                variant="calendar"
                title={!hasActiveFilters && hostListings.length === 0 ? t("noListingsTitle") : t("emptyTitle")}
                description={
                  hasActiveFilters
                    ? t("emptyFiltered")
                    : hostListings.length === 0
                      ? t("noListingsText")
                      : t("emptyNone")
                }
                action={
                  !hasActiveFilters && hostListings.length === 0 ? (
                    <Button href="/host/listings/new" size="md">
                      {t("createFirstListing")}
                    </Button>
                  ) : hasActiveFilters ? (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedListingId("all");
                        setSelectedTab("all");
                      }}
                    >
                      {t("resetFilters")}
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <ul className="space-y-4">
              {filteredReservations.map((res, index) => {
                const guest = res.user;
                const listing = res.listing;
                const listingTitle = listing?.title || t("fallbackListingTitle");
                const guestName = guest?.name || t("guestFallback");
                const cat = getReservationCategory(res, todayStr);
                const payout = computeHostPayout(res);
                const timer = getRemainingTime(res);
                const isRequest = res.status === "pending";

                return (
                  <li
                    key={res.id}
                    className={cn(
                      "enter-up group relative overflow-hidden rounded-2xl bg-white shadow-e1 transition-shadow duration-fast ease-standard hover:shadow-e2",
                      isRequest && !timer.expired && "ring-1 ring-amber-300/70"
                    )}
                    style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                  >
                    {isRequest && (
                      <div
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-meta sm:px-6",
                          timer.expired
                            ? "bg-primary/[0.04] text-primary-600"
                            : timer.urgent
                            ? "bg-accent-50 text-accent-800"
                            : "bg-amber-50 text-amber-900"
                        )}
                      >
                        <span className="font-semibold">{t("requestHeading")}</span>
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <BrandClockIcon size={14} aria-hidden="true" />
                          {timer.text}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center">
                      {/* Listing + guest */}
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-tertiary-100 sm:w-24">
                          <Image
                            src={listing?.imageSrc?.[0] || FALLBACK_LISTING_IMAGE}
                            alt={t("listingImageAlt", { title: listingTitle })}
                            fill
                            sizes="96px"
                            className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-2">
                            {statusBadge(res, cat)}
                            <span className="text-meta tabular-nums text-primary-500" dir="ltr" title={res.id}>
                              {t("reference", { code: reference(res.id) })}
                            </span>
                          </div>
                          <h3 className="truncate text-title text-primary-900">{listingTitle}</h3>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-primary-700">
                            <Avatar name={guestName} src={guest?.image} size="xs" decorative />
                            <span className="font-semibold text-primary-900">{guestName}</span>
                            <span title={t("idVerified")} className="inline-flex text-secondary-700">
                              <BrandShieldIcon size={14} aria-hidden="true" />
                              <span className="sr-only">{t("idVerified")}</span>
                            </span>
                            <span aria-hidden="true" className="text-primary-400">
                              ·
                            </span>
                            <span>{t("guestsCount", { count: res.guestsCount })}</span>
                          </div>

                          <p className="mt-1.5 flex items-center gap-1.5 text-meta font-medium text-primary-700">
                            <BrandCalendarIcon size={15} className="shrink-0 text-secondary-700" aria-hidden="true" />
                            <span className="tabular-nums">{formatDateRange(res.startDate, res.endDate, locale)}</span>
                          </p>

                          {res.guestMessage && (
                            <div className="mt-3 flex items-start gap-2 rounded-xl bg-darnaBg-300/60 p-3 text-meta text-primary-700">
                              <BrandMessageIcon size={16} className="mt-0.5 shrink-0 text-secondary-700" aria-hidden="true" />
                              <div className="min-w-0">
                                <span className="block font-semibold text-primary-800">{t("guestNote")}</span>
                                <q className="block italic leading-snug">{res.guestMessage}</q>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payout */}
                      <div className="flex items-end justify-between gap-4 border-t border-primary/[0.08] pt-4 lg:block lg:min-w-[12rem] lg:border-t-0 lg:pt-0 lg:text-end">
                        <div>
                          <p className="text-meta text-primary-600">{t("netPayout")}</p>
                          <p className="font-serif text-heading tabular-nums text-primary-900">{money(payout.net)}</p>
                          <p className="text-meta tabular-nums text-primary-600">
                            {t("guestPaidSummary", {
                              total: money(res.totalPrice),
                              commission: money(payout.commission),
                            })}
                          </p>
                        </div>
                        <Badge tone={paymentTone(res.paymentStatus)} className="shrink-0 lg:mt-2">
                          {t("paymentLabel", { status: t(`paymentStatus.${res.paymentStatus || "paid"}`) })}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:w-[15.5rem] lg:justify-end">
                        {isRequest ? (
                          timer.expired ? (
                            <Badge tone="neutral" size="md">
                              {t("requestExpired")}
                            </Badge>
                          ) : (
                            <>
                              <Button
                                variant="confirm"
                                size="md"
                                onClick={() => handleAccept(res.id)}
                                loading={actionLoading === res.id && !decliningId}
                                disabled={actionLoading === res.id}
                                leadingIcon={<BrandCheckIcon size={16} aria-hidden="true" />}
                                className="flex-1 sm:flex-none"
                              >
                                {t("accept")}
                              </Button>
                              <Button
                                variant="tertiary"
                                size="md"
                                onClick={() => handleDecline(res.id)}
                                disabled={actionLoading === res.id}
                                leadingIcon={<BrandCloseIcon size={16} aria-hidden="true" />}
                                className="flex-1 sm:flex-none !text-red-700 ring-1 ring-inset ring-red-200 hover:!bg-red-50"
                              >
                                {t("decline")}
                              </Button>
                            </>
                          )
                        ) : (
                          <>
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => setSelectedReservation(res)}
                              aria-haspopup="dialog"
                              leadingIcon={<BrandEyeIcon size={15} aria-hidden="true" />}
                            >
                              {t("details")}
                            </Button>
                            <Link
                              href="/host/messages"
                              title={t("messageGuest")}
                              aria-label={t("messageGuest")}
                              className={cn(
                                "inline-flex h-11 w-11 items-center justify-center rounded-full text-primary-700 transition-colors duration-fast ease-standard hover:bg-primary/[0.06]",
                                focusRing
                              )}
                            >
                              <BrandMessageIcon size={18} aria-hidden="true" />
                            </Link>
                            {res.status === "confirmed" && cat !== "past" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancellingId(res.id)}
                                title={t("cancelReservation")}
                                className="text-accent-700"
                              >
                                {t("cancel")}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </TabPanel>

      {/* Reservation detail */}
      <Dialog
        isOpen={!!selectedReservation}
        onClose={closeDetail}
        title={t("detail.title")}
        description={
          selectedReservation ? (
            <span dir="ltr" className="tabular-nums" title={selectedReservation.id}>
              {t("reference", { code: reference(selectedReservation.id) })}
            </span>
          ) : undefined
        }
        showClose
        size="lg"
        className="print-area relative w-full max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-e4 sm:max-w-2xl sm:rounded-3xl sm:p-8 sm:pb-8"
      >
        {selectedReservation && (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl bg-darnaBg-300/60 p-4 sm:p-5">
              <h3 className="text-meta font-semibold text-primary-600">{t("detail.guestProfile")}</h3>
              <div className="mt-3 flex items-center gap-3">
                <Avatar
                  name={selectedReservation.user?.name || t("guestFallback")}
                  src={selectedReservation.user?.image}
                  size="md"
                  verified={!!selectedReservation.user?.isIdentityVerified}
                  decorative
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-title text-primary-900">
                    {selectedReservation.user?.name || t("guestFallback")}
                    {selectedReservation.user?.isIdentityVerified && <span className="sr-only">{t("idVerified")}</span>}
                  </p>
                  {memberSinceYear && (
                    <p className="text-meta text-primary-600">{t("detail.memberSince", { year: memberSinceYear })}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 text-meta sm:grid-cols-2">
                <p className="flex min-w-0 items-center gap-2 rounded-xl bg-white p-3 text-primary-800 shadow-e1">
                  <BrandPhoneIcon size={16} className="shrink-0 text-secondary-700" aria-hidden="true" />
                  {selectedReservation.user?.phone ? (
                    <span className="tabular-nums" dir="ltr">
                      {selectedReservation.user.phone}
                    </span>
                  ) : (
                    <span>{t("detail.notProvided")}</span>
                  )}
                </p>
                <p className="flex min-w-0 items-center gap-2 rounded-xl bg-white p-3 text-primary-800 shadow-e1">
                  <BrandMailIcon size={16} className="shrink-0 text-secondary-700" aria-hidden="true" />
                  <span className="truncate" dir={selectedReservation.user?.email ? "ltr" : undefined}>
                    {selectedReservation.user?.email || t("detail.notProvided")}
                  </span>
                </p>
              </div>
            </section>

            <dl className="divide-y divide-primary/[0.08] text-body">
              {[
                [t("detail.listing"), selectedReservation.listing?.title],
                [t("detail.dates"), formatDateRange(selectedReservation.startDate, selectedReservation.endDate, locale)],
                [t("detail.guests"), t("guestsCount", { count: selectedReservation.guestsCount })],
                [t("detail.paymentChannel"), selectedReservation.paymentMethod || t("detail.paymentChannelDefault")],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-primary-600">{label}</dt>
                  <dd className="text-end font-semibold text-primary-900">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="rounded-2xl bg-secondary-50 p-4 ring-1 ring-inset ring-secondary-200/70 sm:p-5">
              <h3 className="text-meta font-semibold text-secondary-800">{t("detail.breakdown")}</h3>
              {(() => {
                const p = computeHostPayout(selectedReservation);
                const row = "flex justify-between gap-4 tabular-nums";
                return (
                  <div className="mt-3 space-y-1.5 text-meta text-primary-700">
                    <div className={row}>
                      <span>{t("detail.grossTotal")}</span>
                      <span className="font-semibold text-primary-900">{money(selectedReservation.totalPrice)}</span>
                    </div>
                    <div className={row}>
                      <span>{t("detail.subtotal")}</span>
                      <span>{money(p.subtotal)}</span>
                    </div>
                    {p.cleaningFee > 0 && (
                      <div className={row}>
                        <span>{t("detail.cleaningFee")}</span>
                        <span>{money(p.cleaningFee)}</span>
                      </div>
                    )}
                    {p.refunded > 0 && (
                      <div className={cn(row, "text-accent-800")}>
                        <span>{t("detail.refunded")}</span>
                        <span className="font-semibold">{t("detail.negative", { amount: money(p.refunded) })}</span>
                      </div>
                    )}
                    <div className={cn(row, "text-accent-800")}>
                      <span>
                        {selectedReservation.commissionRate
                          ? t("detail.commissionWithRate", { rate: formatNumber(selectedReservation.commissionRate, locale) })
                          : t("detail.commission")}
                      </span>
                      <span className="font-semibold">{t("detail.negative", { amount: money(p.commission) })}</span>
                    </div>
                    <div className={cn(row, "mt-2 items-baseline border-t border-secondary-200 pt-3 text-primary-900")}>
                      <span className="text-body font-semibold">{t("detail.net")}</span>
                      <span className="font-serif text-heading">{money(p.net)}</span>
                    </div>
                  </div>
                );
              })()}
            </section>

            <DialogFooter className="print:hidden">
              <Button
                variant="tertiary"
                size="md"
                onClick={() => window.print()}
                leadingIcon={<BrandReceiptIcon size={16} aria-hidden="true" />}
              >
                {t("detail.download")}
              </Button>
              <Button variant="secondary" size="md" onClick={closeDetail}>
                {t("detail.done")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Decline with reason */}
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
        <div className="mt-4 space-y-3">
          <RadioGroup
            legend={t("declineDialog.reasonLegend")}
            name="decline-reason"
            value={declineReasonOption}
            onChange={setDeclineReasonOption}
            options={declineOptions.map((opt) => ({ value: opt.id, label: opt.label }))}
            appearance="card"
          />
          {declineReasonOption === "other" && (
            <Textarea
              id={customReasonId}
              label={t("declineDialog.customLabel")}
              rows={2}
              value={customDeclineReason}
              onChange={(e) => setCustomDeclineReason(e.target.value)}
              placeholder={t("declineDialog.customPlaceholder")}
            />
          )}
        </div>
      </ConfirmDialog>

      {/* Cancel confirmation */}
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
