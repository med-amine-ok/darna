"use client";

import React, { useState } from "react";
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
  BrandCashIcon,
  BrandCheckCircleIcon,
  BrandClockIcon,
  BrandChartIcon,
} from "@/components/icons";
import { Badge, Button, Card, Input, KitEmptyState, StatCard, Tabs, TabPanel, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { useActionError } from "@/hook/useActionError";

interface ReservationsClientProps {
  initialReservations: Reservation[];
  listings: Listing[];
}

type FilterId = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const FILTER_TABS: { id: FilterId; labelKey: string }[] = [
  { id: "all", labelKey: "tabAll" },
  { id: "pending", labelKey: "tabPending" },
  { id: "confirmed", labelKey: "tabConfirmed" },
  { id: "completed", labelKey: "tabCompleted" },
  { id: "cancelled", labelKey: "tabCancelled" },
];

const STATUS_TONE: Record<Reservation["status"], BadgeTone> = {
  confirmed: "success",
  pending: "warning",
  completed: "neutral",
  cancelled: "danger",
  declined: "danger",
  expired: "sand",
};

function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="112px"
      className={cn(
        "object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
      )}
    />
  );
}

export default function ReservationsClient({ initialReservations, listings }: ReservationsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("reservations");
  const errorText = useActionError();
  const { formatDzd, formatEur, convertToEur } = useCurrency();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [filterStatus, setFilterStatus] = useState<FilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const matchesSearch = (r: Reservation) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const listingTitle = r.listing?.title.toLowerCase() || "";
    return listingTitle.includes(q) || r.id.toLowerCase().includes(q);
  };
  const filtered = reservations.filter(
    (r) => (filterStatus === "all" || r.status === filterStatus) && matchesSearch(r)
  );

  // Host KPIs
  const totalRevenue = reservations
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((acc, curr) => acc + curr.totalPrice, 0);
  const occupancyStats = occupancy(reservations, listings, periodWindows("30days", todayKey()).current);
  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const countFor = (id: FilterId) =>
    id === "all" ? reservations.length : reservations.filter((r) => r.status === id).length;

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
    <div className="space-y-10">
      {/* KPIs */}
      <section aria-label={t("kpiLabel")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("kpiRevenue")}
          value={totalRevenue}
          format={(n) => formatDzd(Math.round(n))}
          hint={formatEur(convertToEur(totalRevenue))}
          icon={<BrandCashIcon size={18} aria-hidden="true" />}
          className="enter-up"
        />
        <StatCard
          label={t("kpiConfirmed")}
          value={confirmedCount}
          format={(n) => formatNumber(Math.round(n), locale)}
          hint={t("kpiConfirmedHint")}
          icon={<BrandCheckCircleIcon size={18} aria-hidden="true" />}
          className="enter-up [animation-delay:50ms]"
        />
        <StatCard
          label={t("kpiPending")}
          value={pendingCount}
          format={(n) => formatNumber(Math.round(n), locale)}
          hint={t("kpiPendingHint")}
          icon={<BrandClockIcon size={18} aria-hidden="true" />}
          className={cn("enter-up [animation-delay:100ms]", pendingCount > 0 && "ring-1 ring-amber-300/60")}
        />
        <StatCard
          label={t("kpiOccupancy")}
          value={occupancyStats ? occupancyStats.rate * 100 : 0}
          format={(n) =>
            occupancyStats ? formatNumber(n / 100, locale, { style: "percent" }) : t("kpiNotAvailable")
          }
          hint={t("kpiOccupancyHint")}
          icon={<BrandChartIcon size={18} aria-hidden="true" />}
          className="enter-up [animation-delay:150ms]"
        />
      </section>

      {/* Filters + search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Tabs
          id="reservations"
          ariaLabel={t("filtersLabel")}
          value={filterStatus}
          onChange={setFilterStatus}
          items={FILTER_TABS.map((tab) => ({ value: tab.id, label: t(tab.labelKey), count: countFor(tab.id) }))}
          className="lg:flex-1"
        />
        <Input
          type="search"
          label={t("searchLabel")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<BrandSearchIcon size={18} aria-hidden="true" />}
          containerClassName="w-full lg:w-80"
        />
      </div>

      <TabPanel tabsId="reservations" value={filterStatus} active={filterStatus}>
        {filtered.length === 0 ? (
          <Card padding="none">
            <KitEmptyState compact variant="calendar" title={t("emptyTitle")} description={t("noMatchDesc")} />
          </Card>
        ) : (
          <ul className="space-y-4">
            {filtered.map((res, i) => {
              const listing = res.listing;
              const coverImage = listing?.imageSrc?.[0] || "/assets/placeholder.jpg";
              const title = listing?.title || t("propertyFallback");
              const busy = isProcessing === res.id;

              return (
                <li
                  key={`${filterStatus}-${res.id}`}
                  className="enter-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <Card
                    as="article"
                    padding="sm"
                    className="group flex flex-col gap-4 sm:p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-tertiary-100 sm:h-24 sm:w-28">
                        <Thumb src={coverImage} alt={t("photoAlt", { title })} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={STATUS_TONE[res.status]} dot>
                            {t(`status.${res.status}`)}
                          </Badge>
                          <span className="font-mono text-meta text-primary-500">
                            {t("reservationId", { id: res.id })}
                          </span>
                        </div>
                        <h2 className="text-title text-primary-900 line-clamp-1">
                          <Link
                            href={`/listings/${res.listingId}`}
                            className="rounded transition-colors duration-fast ease-standard hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                          >
                            {title}
                          </Link>
                        </h2>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-primary-600">
                          <span className="flex items-center gap-1.5">
                            <BrandCalendarIcon size={14} aria-hidden="true" />
                            {formatDateRange(res.startDate, res.endDate, locale)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <BrandUsersIcon size={14} aria-hidden="true" />
                            {t("guestsCount", { count: res.guestsCount })}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-primary/[0.08] pt-4 md:justify-end md:border-t-0 md:pt-0">
                      <div className="text-start md:text-end">
                        <div className="text-meta text-primary-600">{t("payout")}</div>
                        <div className="text-title tabular-nums text-primary-900">{formatDzd(res.totalPrice)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {res.status === "pending" ? (
                          <>
                            <Button
                              variant="tertiary"
                              size="sm"
                              disabled={busy}
                              onClick={() => setDecliningId(res.id)}
                              aria-label={t("declineAria", { id: res.id })}
                              leadingIcon={<BrandCloseIcon size={16} aria-hidden="true" />}
                              className="!text-accent-700"
                            >
                              {t("decline")}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={busy && !decliningId}
                              disabled={busy}
                              onClick={() => handleStatusChange(res.id, "confirmed")}
                              aria-label={t("acceptAria", { id: res.id })}
                              leadingIcon={<BrandCheckIcon size={16} aria-hidden="true" />}
                            >
                              {t("accept")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            href="/messages"
                            variant="tertiary"
                            size="sm"
                            leadingIcon={<BrandMessageIcon size={16} aria-hidden="true" />}
                          >
                            {t("message")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </TabPanel>

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
