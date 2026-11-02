"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Calendar,
  Download,
  FileText,
  Eye,
  MapPin,
  Printer,
  Home,
  Compass,
  Plane,
  Car,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { StatusPill } from "@/components/ui/StatusPill";
import { InfoTile } from "@/components/ui/InfoTile";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useTranslations } from "next-intl";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { RefundDialog, DisputeDialog } from "@/components/features/bookings/BookingMoneyDialogs";
import {
  listBookings,
  cancelBooking,
  refundBooking,
  resolveDispute,
  exportBookings,
} from "@/lib/actions/bookings";
import { formatDzd, formatDate, intlLocale } from "@/lib/utils/format";
import { listingImageSrc } from "@/lib/placeholders";
import { downloadCsv } from "@/lib/utils/download";
import { canCancelBooking, canRefundBooking, refundedSoFar } from "@/lib/domain/transitions";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Booking } from "@/lib/types";
import { WILAYAS, getWilayaLabel, getWilayaName } from "@/lib/utils/wilayas";

export interface BookingsClientProps {
  initialStatus?: string;
  initialVertical?: string;
}

export default function BookingsClient({
  initialStatus = "all",
  initialVertical = "all",
}: BookingsClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const can = useCan();
  const tOps = useTranslations("bookingOps");
  const tActions = useTranslations("actions");
  const t = useTranslations("bookings");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");
  const shortDate = (d: string | Date) =>
    new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" }).format(new Date(d));

  const currentVertical = searchParams.get("vertical") || initialVertical || "all";
  const currentStatus = searchParams.get("status") || initialStatus || "all";
  const selectedBookingIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  const [data, setData] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(selectedBookingIdFromUrl);
  const [panelTab, setPanelTab] = useState("details");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    type: "cancel" | "refund" | "dispute";
    booking: Booking;
  } | null>(null);

  const actionError = (err: unknown) =>
    addToast({
      title: tActions("actionFailed"),
      description: err instanceof Error ? err.message : String(err),
      variant: "danger",
    });

  const handleExport = async () => {
    try {
      let vertParam = currentVertical;
      if (vertParam === "stays") vertParam = "home";
      if (vertParam === "experiences") vertParam = "experience";
      if (vertParam === "trips") vertParam = "trip";
      if (vertParam === "cars") vertParam = "vehicle";
      const res = unwrap(
        await exportBookings({
          status: currentStatus,
          vertical: vertParam !== "all" ? vertParam : undefined,
          wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
          search: searchQuery || undefined,
        })
      );
      downloadCsv(res.filename, res.csv);
      addToast({ title: tActions("exportStarted"), description: tActions("exportRows", { count: res.rowCount }), variant: "info" });
    } catch (err) {
      addToast({ title: tActions("exportFailed"), description: err instanceof Error ? err.message : String(err), variant: "danger" });
    }
  };

  const updateUrl = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === "" || v === "all") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Map vertical query to ListingVertical if needed
      let vertParam = currentVertical;
      if (vertParam === "stays") vertParam = "home";
      if (vertParam === "experiences") vertParam = "experience";
      if (vertParam === "trips") vertParam = "trip";
      if (vertParam === "cars") vertParam = "vehicle";

      const res = unwrap(await listBookings({
        status: currentStatus,
        vertical: vertParam !== "all" ? vertParam : undefined,
        wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
        search: searchQuery || undefined,
        page,
        pageSize,
      }));
      setData(res.rows);
      setTotal(res.total);
      setTotalPages(res.totalPages || Math.ceil(res.total / pageSize));
      setFacets(res.facets || {});
    } catch (err) {
      addToast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentVertical, currentStatus, selectedWilaya, page, pageSize, searchQuery, addToast, tCommon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedBooking = data.find((b) => b.id === selectedBookingId) || null;

  const handleSelectBooking = (b: Booking) => {
    setSelectedBookingId(b.id);
    updateUrl({ selected: b.id });
  };

  const handleClosePanel = () => {
    setSelectedBookingId(null);
    updateUrl({ selected: null });
  };

  // Vertical tabs with counts (Mockup 11: Toutes 1,248 · Hébergements 642 · Expériences 238 · Voyages 156 · Voitures 212)
  const verticalTabs: TabItem[] = [
    { id: "all", label: t("verticalTabs.all"), count: 1248 },
    { id: "stays", label: t("verticalTabs.stays"), count: 642, icon: <Home className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: "experiences", label: t("verticalTabs.experiences"), count: 238, icon: <Compass className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: "trips", label: t("verticalTabs.trips"), count: 156, icon: <Plane className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: "cars", label: t("verticalTabs.cars"), count: 212, icon: <Car className="w-3.5 h-3.5" aria-hidden="true" /> },
  ];

  // Table columns (Mockup 11)
  const columns: Column<Booking>[] = [
    {
      key: "booking",
      header: t("cols.booking"),
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-tertiary-100 shrink-0 ring-1 ring-inset ring-primary/[0.06]">
            <Image
              src={listingImageSrc(row.listingImage, "booking", row.listingId ?? row.id)}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              className="font-semibold text-primary-900 text-xs whitespace-nowrap tabular-nums link-underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectBooking(row);
              }}
            >
              {row.reference || `#R${row.id.replace("bkg_", "").padStart(4, "0")}`}
            </button>
            <div className="text-[11px] text-primary-600 mt-0.5 whitespace-nowrap tabular-nums">
              {formatDate(row.checkInDate, locale)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "guest",
      header: t("guest"),
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-darnaBg-300 flex items-center justify-center font-semibold text-xs text-primary-800 shrink-0">
            {row.guestName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-primary-900 truncate max-w-[132px]">{row.guestName}</div>
            <div dir="ltr" className="text-[11px] text-primary-600 truncate max-w-[132px] rtl:text-end">{row.guestEmail}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: t("cols.type"),
      render: (row) => {
        let label = t("types.home");
        let icon = <Home className="w-3 h-3 text-secondary" aria-hidden="true" />;
        if (row.vertical === "experience") {
          label = t("types.experience");
          icon = <Compass className="w-3 h-3 text-secondary" aria-hidden="true" />;
        } else if (row.vertical === "trip") {
          label = t("types.trip");
          icon = <Plane className="w-3 h-3 text-secondary" aria-hidden="true" />;
        } else if (row.vertical === "vehicle") {
          label = t("types.vehicle");
          icon = <Car className="w-3 h-3 text-secondary" aria-hidden="true" />;
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-primary-800 font-medium whitespace-nowrap">
            {icon}
            <span>{label}</span>
          </span>
        );
      },
    },
    {
      key: "details",
      header: t("cols.details"),
      render: (row) => (
        <div className="min-w-0">
          <div className="text-xs font-medium text-primary-900 truncate max-w-[132px]">
            {row.listingTitle}
          </div>
          <div className="text-[11px] text-primary-600 flex items-center gap-1 whitespace-nowrap">
            <MapPin className="w-3 h-3 text-secondary" aria-hidden="true" />
            <span>{getWilayaName(row.wilayaCode, locale)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "dates",
      header: t("cols.dates"),
      render: (row) => (
        <div className="text-xs text-primary-800 whitespace-nowrap tabular-nums">
          <div>{t("dateRange", { from: shortDate(row.checkInDate), to: shortDate(row.checkOutDate) })}</div>
          <div className="text-[11px] text-primary-600">{t("nights", { count: row.nightsCount })}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: t("cols.amount"),
      align: "right",
      render: (row) => (
        <div className="text-xs font-semibold text-primary-900 whitespace-nowrap tabular-nums text-end">
          {formatDzd(row.totalAmountDzd, locale)}
        </div>
      ),
    },
    {
      key: "status",
      header: tCommon("status"),
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "actions",
      header: t("actions"),
      className: "text-end",
      render: (row) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleSelectBooking(row)}
            className="p-1.5 rounded-lg text-primary-600 hover:bg-darnaBg-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            title={t("quickView")}
            aria-label={t("quickViewOf", { reference: row.reference || row.id })}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="p-1.5 rounded-lg text-primary/30 cursor-not-allowed"
            title={tActions("unavailableHint")}
            aria-label={t("invoiceUnavailable")}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Mockup 11: Exporter, Rapport, + Nouvelle réservation) */}
      <PageHeader
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        actions={[
          ...(can("reports.export")
            ? [
                {
                  label: tOps("export"),
                  icon: <Download className="w-4 h-4" aria-hidden="true" />,
                  onClick: handleExport,
                  variant: "outline" as const,
                },
              ]
            : []),
          {
            label: t("report"),
            icon: <FileText className="w-4 h-4" aria-hidden="true" />,
            onClick: () => router.push("/stats"),
            variant: "outline",
          },
        ]}
      />

      {/* 2. Vertical Tabs (Mockup 11) */}
      <div className="flex items-end justify-between gap-4">
        <Tabs
          items={verticalTabs}
          activeId={currentVertical}
          onChange={(tabId) => {
            updateUrl({ vertical: tabId === "all" ? null : tabId, page: "1" });
          }}
          variant="line"
        />

        <div className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl bg-white shadow-e1 text-xs text-primary-700 tabular-nums whitespace-nowrap mb-2">
          <Calendar className="w-4 h-4 text-secondary" aria-hidden="true" />
          <span>{t("dateRange", { from: formatDate("2024-03-01", locale), to: formatDate("2024-03-31", locale) })}</span>
        </div>
      </div>

      {/* 3. Filter Bar (Mockup 11) */}
      <FilterBar
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "status",
            label: tCommon("status"),
            value: currentStatus,
            options: [
              { value: "all", label: t("allStatuses") },
              ...(["confirmed", "pending", "completed", "cancelled", "disputed", "refunded"] as const).map((s) => ({
                value: s,
                label: tStatus(s),
              })),
            ],
            onChange: (val) => {
              updateUrl({ status: val === "all" ? null : val, page: "1" });
            },
          },
          {
            id: "wilaya",
            label: t("wilayaFilter"),
            value: selectedWilaya,
            options: [
              { value: "all", label: t("allWilayas") },
              ...WILAYAS.map((w) => ({ value: w.code, label: getWilayaLabel(w, locale) })),
            ],
            onChange: (val) => {
              setSelectedWilaya(val);
              setPage(1);
            },
          },
        ]}
        onOpenAdvanced={() => setIsFilterDrawerOpen(true)}
        hasActiveFilters={currentStatus !== "all" || selectedWilaya !== "all" || !!searchQuery}
        onReset={() => {
          setSearchQuery("");
          setSelectedWilaya("all");
          updateUrl({ status: null, vertical: null, page: "1" });
        }}
      />

      {/* 4. Split View: Table + Detail Panel (Mockup 11) */}
      <SplitView
        isPanelOpen={!!selectedBooking}
        mainContent={
          <div className="flex flex-col gap-1">
            <DataTable
              columns={
                selectedBooking
                  ? columns.filter((c) => !["type", "details", "dates", "actions"].includes(c.key))
                  : columns
              }
              data={data}
              keyExtractor={(b) => b.id}
              selectedRowId={selectedBookingId || undefined}
              onRowClick={handleSelectBooking}
              isLoading={isLoading}
              emptyMessage={t("empty")}
              selection={{
                selectedIds: selectedRowIds,
                onSelectionChange: setSelectedRowIds,
              }}
            />
            <div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  updateUrl({ page: String(p) });
                }}
                pageSize={pageSize}
                totalItems={total}
                itemLabel={t("itemLabel")}
              />
            </div>
          </div>
        }
        detailPanel={
          selectedBooking ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedBooking.reference || `#R${selectedBooking.id}`}
              subtitle={t("bookedOn", { date: formatDate(selectedBooking.checkInDate, locale) })}
              statusBadge={<StatusPill status={selectedBooking.status} />}
              actions={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-primary-500 hover:text-primary-900 hover:bg-primary/[0.06] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                    title={t("print")}
                    aria-label={t("print")}
                  >
                    <Printer className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    {canCancelBooking(selectedBooking) && can("bookings.cancel") && (
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ type: "cancel", booking: selectedBooking })}
                        className="px-3 min-h-[36px] text-xs font-semibold text-accent-700 bg-white ring-1 ring-inset ring-accent/40 rounded-xl hover:bg-accent-50 transition-colors duration-fast"
                      >
                        {tOps("cancel")}
                      </button>
                    )}
                    {selectedBooking.status !== "disputed" && canRefundBooking(selectedBooking) && can("bookings.refund") && (
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ type: "refund", booking: selectedBooking })}
                        className="px-3 min-h-[36px] text-xs font-semibold text-amber-800 bg-white ring-1 ring-inset ring-amber-300 rounded-xl hover:bg-amber-50 transition-colors duration-fast"
                      >
                        {tOps("refund")}
                      </button>
                    )}
                    {selectedBooking.status === "disputed" && can("bookings.dispute") && (
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ type: "dispute", booking: selectedBooking })}
                        className="px-3 min-h-[36px] text-xs font-semibold text-amber-800 bg-white ring-1 ring-inset ring-amber-300 rounded-xl hover:bg-amber-50 transition-colors duration-fast"
                      >
                        {tOps("resolveDispute")}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title={tActions("unavailableHint")}
                    className="px-3.5 min-h-[36px] text-xs font-semibold text-white bg-primary-800/40 rounded-xl cursor-not-allowed"
                  >
                    {t("editBooking")}
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-tertiary-100">
                  <Image
                    src={listingImageSrc(selectedBooking.listingImage, "booking", selectedBooking.listingId ?? selectedBooking.id)}
                    alt={selectedBooking.listingTitle}
                    fill
                    sizes="(min-width: 1024px) 420px, 100vw"
                    className="object-cover"
                  />
                </div>

                <div className="border-b border-primary/[0.06] pb-3">
                  <h4 className="font-semibold text-sm text-primary-900">{selectedBooking.listingTitle}</h4>
                  <div className="flex items-center gap-1 text-xs text-secondary-700 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{getWilayaName(selectedBooking.wilayaCode, locale)}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "details", label: t("panelTabs.details") },
                    { id: "guest", label: t("panelTabs.guest") },
                    { id: "payment", label: t("panelTabs.payment") },
                    { id: "messages", label: t("panelTabs.messages") },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                  variant="line"
                />

                {panelTab === "details" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <InfoTile label={t("checkIn")} value={formatDate(selectedBooking.checkInDate, locale)} />
                      <InfoTile label={t("checkOut")} value={formatDate(selectedBooking.checkOutDate, locale)} />
                      <InfoTile label={t("duration")} value={t("nights", { count: selectedBooking.nightsCount })} />
                      <InfoTile label={t("travelers")} value={t("guestsCount", { count: selectedBooking.guestsCount })} />
                    </div>

                    {/* Breakdown */}
                    <div className="p-3.5 bg-darnaBg-100 rounded-xl text-xs space-y-2 tabular-nums">
                      <div className="font-semibold text-primary-900 pb-1.5 border-b border-primary/[0.06]">
                        {t("priceBreakdown")}
                      </div>
                      <div className="flex justify-between text-primary-600">
                        <span>{t("basePrice", { count: selectedBooking.nightsCount })}</span>
                        <span>{formatDzd(selectedBooking.basePriceDzd, locale)}</span>
                      </div>
                      {selectedBooking.serviceFeeDzd > 0 && (
                        <div className="flex justify-between text-primary-600">
                          <span>{t("serviceFee")}</span>
                          <span>{formatDzd(selectedBooking.serviceFeeDzd, locale)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-sm text-primary-900 pt-1.5 border-t border-primary/[0.06]">
                        <span>{t("totalPaid")}</span>
                        <span className="text-secondary-700">{formatDzd(selectedBooking.totalAmountDzd, locale)}</span>
                      </div>
                      {refundedSoFar(selectedBooking) > 0 && (
                        <div className="flex justify-between text-accent-700">
                          <span>{tOps("refundedSoFar")}</span>
                          <span>-{formatDzd(refundedSoFar(selectedBooking), locale)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {panelTab === "guest" && (
                  <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-darnaBg-400 flex items-center justify-center font-semibold text-sm text-primary-800">
                        {selectedBooking.guestName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-primary">{selectedBooking.guestName}</div>
                        <div dir="ltr" className="text-xs text-primary-600 rtl:text-end">{selectedBooking.guestEmail}</div>
                      </div>
                    </div>
                    <div className="text-xs text-primary-800 pt-2 border-t border-primary/[0.06] space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                        <span dir="ltr">{selectedBooking.guestPhone || "+213 555 12 34 56"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                        <span>{t("verifiedAccount")}</span>
                      </div>
                    </div>
                  </div>
                )}

                {panelTab === "payment" && (
                  <div className="p-3.5 bg-darnaBg-100 rounded-xl text-xs space-y-3 tabular-nums">
                    <div className="flex items-center justify-between pb-2 border-b border-primary/[0.06]">
                      <span className="font-semibold text-primary">{t("paymentReceived")}</span>
                      <span className="font-semibold text-primary">{formatDzd(selectedBooking.totalAmountDzd, locale)}</span>
                    </div>
                    <div className="space-y-1 text-primary-600">
                      <p>{t("paymentMethodLine", { method: t(`paymentMethods.${selectedBooking.paymentMethod}`) })}</p>
                      <p className="flex items-center gap-2">
                        {t("labelValue", { label: tOps("paymentStatus"), value: "" })}
                        <StatusPill status={selectedBooking.paymentStatus} size="sm" />
                      </p>
                      {refundedSoFar(selectedBooking) > 0 && (
                        <p>
                          {t("labelValue", {
                            label: tOps("refundedSoFar"),
                            value: formatDzd(refundedSoFar(selectedBooking), locale),
                          })}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={tActions("unavailableHint")}
                      className="w-full mt-2 min-h-[40px] bg-white shadow-e1 rounded-xl font-medium text-xs text-primary/40 cursor-not-allowed"
                    >
                      {t("downloadInvoice")}
                    </button>
                  </div>
                )}
              </div>
            </DetailPanel>
          ) : null
        }
      />

      <ReasonDialog
        isOpen={confirmModal?.type === "cancel"}
        title={tOps("cancelTitle", { reference: confirmModal?.booking.reference ?? "" })}
        description={tOps("cancelDescription")}
        confirmLabel={tOps("cancel")}
        onCancel={() => setConfirmModal(null)}
        onConfirm={async (reason) => {
          if (!confirmModal) return;
          try {
            unwrap(await cancelBooking(confirmModal.booking.id, reason));
            addToast({ title: tOps("cancelDone"), variant: "warning" });
            setConfirmModal(null);
            fetchData();
          } catch (err) {
            actionError(err);
          }
        }}
      />

      <RefundDialog
        booking={confirmModal?.type === "refund" ? confirmModal.booking : null}
        onCancel={() => setConfirmModal(null)}
        onConfirm={async (amount, reason) => {
          if (!confirmModal) return;
          try {
            unwrap(await refundBooking(confirmModal.booking.id, amount, reason));
            addToast({ title: tOps("refundDone"), description: formatDzd(amount, locale), variant: "info" });
            setConfirmModal(null);
            fetchData();
          } catch (err) {
            actionError(err);
          }
        }}
      />

      <DisputeDialog
        booking={confirmModal?.type === "dispute" ? confirmModal.booking : null}
        canRefund={can("bookings.refund")}
        onCancel={() => setConfirmModal(null)}
        onConfirm={async (outcome, note, amount) => {
          if (!confirmModal) return;
          try {
            unwrap(await resolveDispute(confirmModal.booking.id, outcome, note, amount));
            addToast({ title: tOps("disputeResolved"), variant: "info" });
            setConfirmModal(null);
            fetchData();
          } catch (err) {
            actionError(err);
          }
        }}
      />
    </div>
  );
}
