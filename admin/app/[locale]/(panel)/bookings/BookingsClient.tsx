"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  DollarSign,
  AlertOctagon,
  RotateCcw,
  Eye,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/data-table/FilterBar";
import { FilterDrawer } from "@/components/data-table/FilterDrawer";
import { ActiveFilterChips, ActiveFilterItem } from "@/components/data-table/ActiveFilterChips";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Booking, BookingStatus, PaginatedResult } from "@/lib/types";
import { getWilayaName } from "@/lib/utils/wilayas";
import { formatDzd, formatDate } from "@/lib/utils/format";
import { listBookings, cancelBooking, refundBooking, resolveDispute } from "@/lib/data/bookings";

export interface BookingsClientProps {
  initialData: PaginatedResult<Booking>;
  initialStatus: string;
  initialVertical: string;
}

export default function BookingsClient({
  initialData,
  initialStatus,
  initialVertical,
}: BookingsClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("bookings");
  const tCommon = useTranslations("common");
  const { success, error, info } = useToast();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<PaginatedResult<Booking>>(initialData);
  const [status, setStatus] = useState<string>(initialStatus);
  const [vertical, setVertical] = useState<string>(initialVertical);
  const [search, setSearch] = useState("");
  const [isPendingOver24h, setIsPendingOver24h] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: "danger" | "warning" | "primary";
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const fetchData = async (overrideParams: Record<string, any> = {}) => {
    startTransition(async () => {
      const res = await listBookings({
        status: overrideParams.status ?? status,
        vertical: overrideParams.vertical ?? vertical,
        search: overrideParams.search ?? search,
        pendingOver24h: overrideParams.isPendingOver24h ?? (isPendingOver24h ? true : undefined),
        page: overrideParams.page ?? currentPage,
        pageSize: overrideParams.pageSize ?? pageSize,
      });
      setData(res);
    });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setCurrentPage(1);
    fetchData({ status: newStatus, page: 1 });
  };

  const handleSearchChange = (q: string) => {
    setSearch(q);
    fetchData({ search: q, page: 1 });
  };

  const activeChips: ActiveFilterItem[] = [];
  if (status !== "all") activeChips.push({ key: "status", label: "Status", valueDisplay: status });
  if (vertical !== "all") activeChips.push({ key: "vertical", label: "Vertical", valueDisplay: vertical });
  if (isPendingOver24h) activeChips.push({ key: "p24", label: "Urgent", valueDisplay: "Pending > 24h" });

  const handleRemoveChip = (key: string) => {
    if (key === "status") { setStatus("all"); fetchData({ status: "all" }); }
    if (key === "vertical") { setVertical("all"); fetchData({ vertical: "all" }); }
    if (key === "p24") { setIsPendingOver24h(false); fetchData({ isPendingOver24h: false }); }
  };

  const handleClearAll = () => {
    setStatus("all");
    setVertical("all");
    setIsPendingOver24h(false);
    setSearch("");
    fetchData({ status: "all", vertical: "all", isPendingOver24h: false, search: "", page: 1 });
  };

  const handleCancel = (booking: Booking) => {
    setConfirmState({
      isOpen: true,
      title: "Cancel Booking",
      description: `Cancel reservation ${booking.reference}. Guest will receive a cancellation notice.`,
      variant: "danger",
      confirmLabel: "Cancel Booking",
      action: async () => {
        try {
          const updated = await cancelBooking(booking.id, "Admin manual intervention", { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Cancelled booking ${booking.reference}`);
          setDetailBooking(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to cancel booking");
        }
      },
    });
  };

  const handleRefund = (booking: Booking) => {
    setConfirmState({
      isOpen: true,
      title: "Emit Electronic Refund",
      description: `Authorize electronic SATIM Edahabia refund of ${formatDzd(booking.totalAmountDzd, locale)} to ${booking.guestName}.`,
      variant: "warning",
      confirmLabel: "Issue Refund",
      action: async () => {
        try {
          const updated = await refundBooking(booking.id, booking.totalAmountDzd, "SATIM Edahabia refund approved", { id: "adm_01", name: "Admin", role: "super_admin" });
          success(`Refund of ${formatDzd(booking.totalAmountDzd, locale)} emitted`);
          setDetailBooking(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to refund booking");
        }
      },
    });
  };

  const handleResolveDispute = (booking: Booking) => {
    setConfirmState({
      isOpen: true,
      title: "Resolve Dispute",
      description: `Mark dispute for ${booking.reference} resolved following arbitration.`,
      variant: "primary",
      confirmLabel: "Resolve Dispute",
      action: async () => {
        try {
          const updated = await resolveDispute(booking.id, "Amicable settlement reached", { id: "adm_01", name: "Admin", role: "super_admin" });
          success(`Dispute resolved for ${booking.reference}`);
          setDetailBooking(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to resolve dispute");
        }
      },
    });
  };

  const columns: Column<Booking>[] = [
    {
      key: "reference",
      header: t("refCode"),
      sortable: true,
      render: (b) => (
        <div>
          <span className="font-mono font-bold text-primary block leading-tight">{b.reference}</span>
          <span className="text-[11px] text-neutral-400">{formatDate(b.createdAt, locale)}</span>
        </div>
      ),
    },
    {
      key: "listingTitle",
      header: t("property"),
      render: (b) => (
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-9 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
            <Image src={b.listingImage || "/assets/house.png"} alt={b.listingTitle} fill className="object-cover" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-primary truncate block leading-tight">{b.listingTitle}</span>
            <span className="text-[10px] capitalize font-medium text-secondary">{b.vertical}</span>
          </div>
        </div>
      ),
    },
    {
      key: "guestName",
      header: t("guest"),
      render: (b) => (
        <div>
          <span className="font-bold text-primary block leading-tight">{b.guestName}</span>
          <span className="text-[11px] text-neutral-400">{b.guestEmail}</span>
        </div>
      ),
    },
    {
      key: "hostName",
      header: t("host"),
      render: (b) => (
        <div>
          <span className="font-bold text-primary block leading-tight">{b.hostName}</span>
          <span className="text-[10px] text-neutral-500 capitalize font-medium">{b.hostType}</span>
        </div>
      ),
    },
    {
      key: "checkInDate",
      header: t("dates"),
      render: (b) => (
        <div className="text-xs tabular-nums">
          <span className="font-semibold text-primary block">{b.checkInDate}</span>
          <span className="text-[11px] text-neutral-400">{b.nightsCount} nights · {b.guestsCount} guests</span>
        </div>
      ),
    },
    {
      key: "totalAmountDzd",
      header: t("amount"),
      align: "right",
      sortable: true,
      render: (b) => (
        <span className="font-mono font-bold text-primary tabular-nums">
          {formatDzd(b.totalAmountDzd, locale)}
        </span>
      ),
    },
    {
      key: "status",
      header: tCommon("status"),
      render: (b) => (
        <StatusPill
          status={b.status}
          size="sm"
        />
      ),
    },
    {
      key: "actions",
      header: tCommon("actions"),
      align: "right",
      render: (b) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDetailBooking(b)}
          className="text-[11px] py-1 px-2 text-neutral-600"
        >
          <Eye className="w-3.5 h-3.5 me-1" /> {t("viewDetails")}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-start">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
          {t("title")}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <Tabs
        tabs={[
          { id: "all", label: t("allTab"), count: data.facets?.status?.all },
          { id: "confirmed", label: t("confirmedTab"), count: data.facets?.status?.confirmed },
          { id: "pending", label: t("pendingTab"), count: data.facets?.status?.pending },
          { id: "completed", label: t("completedTab"), count: data.facets?.status?.completed },
          { id: "disputed", label: t("disputedTab"), count: data.facets?.status?.disputed },
          { id: "cancelled", label: t("cancelledTab"), count: data.facets?.status?.cancelled },
        ]}
        activeTab={status}
        onChange={handleStatusChange}
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("searchPlaceholder")}
        activeFilterCount={activeChips.length}
        totalResults={data.total}
        resultsLabel={t("allTab")}
        rightActions={
          <button
            type="button"
            onClick={() => {
              setIsPendingOver24h(!isPendingOver24h);
              fetchData({ isPendingOver24h: !isPendingOver24h, page: 1 });
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              isPendingOver24h
                ? "bg-accent text-white border-accent shadow-xs"
                : "bg-white border-tertiary/70 text-neutral-600 hover:border-secondary"
            }`}
          >
            Pending &gt; 24h
          </button>
        }
      />

      <ActiveFilterChips
        filters={activeChips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAll}
      />

      <DataTable
        columns={columns}
        data={data.rows}
        keyExtractor={(b) => b.id}
        isLoading={isPending}
        onRowClick={(b) => setDetailBooking(b)}
      />

      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        totalItems={data.total}
        pageSize={pageSize}
        onPageChange={(page) => {
          setCurrentPage(page);
          fetchData({ page });
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
          fetchData({ pageSize: size, page: 1 });
        }}
      />

      {/* Booking Detail Drawer with Financial Breakdown */}
      {detailBooking && (
        <Drawer
          isOpen={!!detailBooking}
          onClose={() => setDetailBooking(null)}
          size="md"
          title={`Booking ${detailBooking.reference}`}
          subtitle={`${detailBooking.listingTitle} · ${detailBooking.nightsCount} nights`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailBooking(null)}>
                {tCommon("close")}
              </Button>
              {detailBooking.status === "disputed" && (
                <Button variant="primary" size="sm" onClick={() => handleResolveDispute(detailBooking)}>
                  {t("resolveDispute")}
                </Button>
              )}
              {detailBooking.status !== "refunded" && detailBooking.status !== "cancelled" && (
                <Button variant="outline" size="sm" onClick={() => handleRefund(detailBooking)} className="text-secondary">
                  {t("refundBooking")}
                </Button>
              )}
              {detailBooking.status !== "cancelled" && (
                <Button variant="danger" size="sm" onClick={() => handleCancel(detailBooking)}>
                  {t("cancelBooking")}
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs text-start">
            {/* Status & Method */}
            <div className="p-4 rounded-2xl bg-darnaBg/50 border border-tertiary/60 flex items-center justify-between">
              <div>
                <span className="text-neutral-400 block text-[11px]">Payment Gateway</span>
                <span className="font-bold text-primary capitalize">{detailBooking.paymentMethod.replace("_", " ")}</span>
              </div>
              <StatusPill
                label={detailBooking.status}
                variant={detailBooking.status === "confirmed" ? "success" : "warning"}
              />
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="p-4 rounded-2xl bg-white border border-tertiary/70 space-y-2">
              <h4 className="font-bold text-primary text-sm">Fiscal Breakdown</h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Base Stay Subtotal:</span>
                  <span className="font-mono font-semibold">{formatDzd(detailBooking.basePriceDzd, locale)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Guest Service Fee (7%):</span>
                  <span className="font-mono font-semibold">{formatDzd(detailBooking.serviceFeeDzd, locale)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100 font-bold text-primary">
                  <span>Total Traveler Charged:</span>
                  <span className="font-mono">{formatDzd(detailBooking.totalAmountDzd, locale)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100 text-secondary">
                  <span>Platform Commission ({detailBooking.commissionRate}%):</span>
                  <span className="font-mono font-semibold">+{formatDzd(detailBooking.commissionAmountDzd, locale)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-primary">
                  <span>Host Net Payout:</span>
                  <span className="font-mono text-secondary">{formatDzd(detailBooking.hostPayoutDzd, locale)}</span>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-tertiary/60">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Traveler</span>
                <p className="font-bold text-primary">{detailBooking.guestName}</p>
                <p className="text-[11px] text-neutral-500">{detailBooking.guestEmail}</p>
                <p className="text-[11px] text-neutral-500">{detailBooking.guestPhone}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-tertiary/60">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Host entity</span>
                <p className="font-bold text-primary">{detailBooking.hostName}</p>
                <p className="text-[11px] text-secondary font-semibold capitalize">{detailBooking.hostType}</p>
                <p className="text-[11px] text-neutral-500">{getWilayaName(detailBooking.wilayaCode, locale)}</p>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmState.action();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
      />
    </div>
  );
}
