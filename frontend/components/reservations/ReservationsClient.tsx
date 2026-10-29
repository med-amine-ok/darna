"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { occupancy, periodWindows } from "@/lib/host-kpis";
import { Link, useRouter } from "@/navigation";
import { Reservation, Listing } from "@/types";
import { respondToReservationAction } from "@/app/actions/bookings";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { useCurrency } from "@/hook/useCurrency";
import { formatDateRange, todayKey } from "@/lib/booking/dates";
import { formatNumber } from "@/lib/i18n/date-locale";
import {
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandMessageIcon,
  BrandCheckIcon,
  BrandCloseIcon,
  BrandSearchIcon,
} from "@/components/icons";
import { useActionError } from "@/hook/useActionError";

interface ReservationsClientProps {
  initialReservations: Reservation[];
  listings: Listing[];
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const FILTER_TABS = [
  { id: "all", labelKey: "tabAll" },
  { id: "pending", labelKey: "tabPending" },
  { id: "confirmed", labelKey: "tabConfirmed" },
  { id: "completed", labelKey: "tabCompleted" },
  { id: "cancelled", labelKey: "tabCancelled" },
] as const;

const STATUS_BADGE: Partial<Record<Reservation["status"], string>> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800 animate-pulse",
  completed: "bg-neutral-100 text-neutral-700",
  cancelled: "bg-rose-100 text-rose-800",
};

export default function ReservationsClient({ initialReservations, listings }: ReservationsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("reservations");
  const errorText = useActionError();
  const { formatDzd, formatEur, convertToEur } = useCurrency();
  const searchId = useId();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  // Filter reservations
  const filtered = reservations.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const listingTitle = r.listing?.title.toLowerCase() || "";
      const id = r.id.toLowerCase();
      if (!listingTitle.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  // Calculate Host KPIs
  const totalRevenue = reservations
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((acc, curr) => acc + curr.totalPrice, 0);
  const occupancyStats = occupancy(reservations, listings, periodWindows("30days", todayKey()).current);
  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;

  const handleStatusChange = async (id: string, newStatus: "confirmed" | "cancelled") => {
    setIsProcessing(id);
    try {
      const result = await respondToReservationAction(id, newStatus === "confirmed" ? "confirm" : "decline");
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: result.data.status } : r)));
      router.refresh();
      if (newStatus === "confirmed") {
        toast.success(t("toastAccepted"));
      } else {
        toast.info(t("toastDeclined"));
      }
    } catch {
      toast.error(t("toastUpdateFailed"));
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">{t("pageTitle")}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t("pageSubtitle")}</p>
        </div>

        <Link
          href="/host/listings"
          className={`inline-flex items-center justify-center px-4 py-2 bg-white border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-50 transition shadow-xs ${FOCUS_RING}`}
        >
          {t("manageListings")}
        </Link>
      </div>

      {/* KPI Stats Banner */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <dt className="text-xs font-semibold text-neutral-500">{t("kpiRevenue")}</dt>
          <dd className="text-xl sm:text-2xl font-bold text-primary mt-1 font-serif">{formatDzd(totalRevenue)}</dd>
          <dd className="text-[11px] text-neutral-500 mt-0.5">{formatEur(convertToEur(totalRevenue))}</dd>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <dt className="text-xs font-semibold text-neutral-500">{t("kpiConfirmed")}</dt>
          <dd className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">{formatNumber(confirmedCount, locale)}</dd>
          <dd className="text-[11px] text-neutral-500 mt-0.5">{t("kpiConfirmedHint")}</dd>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <dt className="text-xs font-semibold text-neutral-500">{t("kpiPending")}</dt>
          <dd className={`text-xl sm:text-2xl font-bold mt-1 ${pendingCount > 0 ? "text-amber-700" : "text-neutral-700"}`}>
            {formatNumber(pendingCount, locale)}
          </dd>
          <dd className="text-[11px] text-neutral-500 mt-0.5">{t("kpiPendingHint")}</dd>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <dt className="text-xs font-semibold text-neutral-500">{t("kpiOccupancy")}</dt>
          <dd className="text-xl sm:text-2xl font-bold text-primary mt-1">
            {occupancyStats ? formatNumber(occupancyStats.rate, locale, { style: "percent" }) : "—"}
          </dd>
          <dd className="text-[11px] text-neutral-500 mt-0.5">{t("kpiOccupancyHint")}</dd>
        </div>
      </dl>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div
          role="group"
          aria-label={t("filtersLabel")}
          className="flex flex-wrap items-center gap-1.5 bg-tertiary/20 p-1.5 rounded-2xl border border-tertiary/40"
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filterStatus === tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${FOCUS_RING} ${
                filterStatus === tab.id ? "bg-white text-primary shadow-xs" : "text-neutral-600 hover:text-primary"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <label htmlFor={searchId} className="sr-only">
            {t("searchLabel")}
          </label>
          <BrandSearchIcon
            size={16}
            aria-hidden="true"
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            id={searchId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full ps-9 pe-4 py-2 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary placeholder-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          />
        </div>
      </div>

      {/* Reservation Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center max-w-md mx-auto my-6 shadow-xs">
          <BrandCalendarIcon size={36} className="text-tertiary mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-base font-bold text-primary">{t("emptyTitle")}</h2>
          <p className="text-xs text-neutral-500 mt-1">{t("noMatchDesc")}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((res) => {
            const listing = res.listing;
            const coverImage = listing?.imageSrc?.[0] || "/assets/placeholder.jpg";
            const title = listing?.title || t("propertyFallback");
            const badge = STATUS_BADGE[res.status];

            return (
              <li
                key={res.id}
                className="bg-white rounded-2xl border border-tertiary p-5 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Start: Thumbnail & Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
                    <Image
                      src={coverImage}
                      alt={t("photoAlt", { title })}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase">
                        {t("reservationId", { id: res.id })}
                      </span>
                      {badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge}`}>
                          {t(`status.${res.status}`)}
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-primary text-sm sm:text-base line-clamp-1 hover:text-accent-700 transition">
                      <Link href={`/listings/${res.listingId}`} className={`rounded ${FOCUS_RING}`}>
                        {title}
                      </Link>
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>{formatDateRange(res.startDate, res.endDate, locale)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <BrandUsersIcon size={14} aria-hidden="true" />
                        {t("guestsCount", { count: res.guestsCount })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* End: Payout and Actions */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-tertiary/40">
                  <div className="text-start md:text-end">
                    <div className="text-xs text-neutral-500">{t("payout")}</div>
                    <div className="font-bold text-primary text-base sm:text-lg">{formatDzd(res.totalPrice)}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {res.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing === res.id}
                          onClick={() => handleStatusChange(res.id, "confirmed")}
                          aria-label={t("acceptAria", { id: res.id })}
                          className={`px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition flex items-center gap-1 disabled:opacity-50 ${FOCUS_RING}`}
                        >
                          <BrandCheckIcon size={15} aria-hidden="true" />
                          <span>{t("accept")}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing === res.id}
                          onClick={() => setDecliningId(res.id)}
                          aria-label={t("declineAria", { id: res.id })}
                          className={`px-3.5 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-50 transition flex items-center gap-1 disabled:opacity-50 ${FOCUS_RING}`}
                        >
                          <BrandCloseIcon size={15} aria-hidden="true" />
                          <span>{t("decline")}</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/messages"
                        className={`px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${FOCUS_RING}`}
                      >
                        <BrandMessageIcon size={15} aria-hidden="true" />
                        <span>{t("message")}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Decline Booking Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!decliningId}
        variant="destructive"
        title={t("declineDialogTitle")}
        message={t("declineDialogMessage")}
        confirmLabel={t("declineConfirm")}
        cancelLabel={t("declineKeep")}
        isLoading={isProcessing === decliningId}
        onConfirm={async () => {
          if (decliningId) {
            await handleStatusChange(decliningId, "cancelled");
            setDecliningId(null);
          }
        }}
        onCancel={() => setDecliningId(null)}
      />
    </div>
  );
}
