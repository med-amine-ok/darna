"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Image from "next/image";
import { listingImageSrc, listingImages } from "@/lib/placeholders";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Home,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Download,
  Plus,
  Eye,
  MapPin,
  Calendar,
  Maximize2,
  ShieldCheck,
  Star,
  ExternalLink,
  Trash2,
  PauseCircle,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip, KpiCardItem } from "@/components/ui/KpiStrip";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { InfoTile } from "@/components/ui/InfoTile";
import { useLocale, useTranslations } from "next-intl";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listListings, approveListing, updateListingStatus } from "@/lib/actions/listings";
import { useListingStatusActions } from "@/components/features/listings/useListingStatusActions";
import { formatDate, formatDzd } from "@/lib/utils/format";
import { applyDiscount, DISCOUNTS } from "@/lib/pricing";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Listing } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

/** Low-priority columns hidden while the split detail panel is open (ANALYSIS.md §4). */
const SPLIT_HIDDEN_COLUMNS = ["host", "location", "type", "rating", "bookings"];

/** Filter values (kept as before) → translation key under `stays.propertyTypes`. */
const PROPERTY_TYPES: { value: string; key: string }[] = [
  { value: "villa", key: "villa" },
  { value: "appartement", key: "apartment" },
  { value: "maison traditionnelle", key: "traditionalHouse" },
  { value: "bungalow", key: "bungalow" },
  { value: "chalet", key: "chalet" },
  { value: "studio", key: "studio" },
  { value: "hôtel", key: "hotel" },
  { value: "hostel", key: "hostel" },
];

const HOST_TYPE_KEYS = ["individual", "agency", "hotel", "hostel"];

function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

const iconBtn =
  "p-1.5 rounded-lg text-primary-600 hover:bg-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function StaysListClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("stays");
  const tCommon = useTranslations("common");
  const tHostTypes = useTranslations("hostTypes");
  const tActions = useTranslations("actions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const can = useCan();
  const [, startTransition] = useTransition();

  // URL state
  const currentStatus = searchParams.get("status") || "all";
  const normalizeStatusKey = (s?: string | null) => {
    if (!s || s === "all") return "all";
    const lower = s.toLowerCase();
    if (lower === "pending" || lower === "pending_review") return "pending";
    if (lower === "published" || lower === "approved") return "published";
    if (lower === "refused" || lower === "rejected") return "refused";
    return lower;
  };
  const normalizedStatus = normalizeStatusKey(currentStatus);
  const selectedStayIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  // Local data state
  const [data, setData] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedPropType, setSelectedPropType] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(10);
  const [selectedStayId, setSelectedStayId] = useState<string | null>(selectedStayIdFromUrl);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("info");

  // Selection & Bulk
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "suspend" | "approve" | "reject";
    stay: Listing;
  } | null>(null);

  const hostTypeLabel = (type: string) => (HOST_TYPE_KEYS.includes(type) ? tHostTypes(type) : type);

  // Sync selected stay with URL
  const updateUrl = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === "" || v === "all") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = unwrap(await listListings({
        status: currentStatus,
        vertical: "home", // stays includes homes, apartments, villas, etc.
        wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
        search: searchQuery || undefined,
        page,
        pageSize,
      }));
      setData(res.rows);
      setTotal(res.total);
      setTotalPages(res.totalPages || Math.ceil(res.total / pageSize));
      setFacets(res.facets || {});
    } catch (err: unknown) {
      addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, [currentStatus, selectedWilaya, searchQuery, page, pageSize, addToast, tCommon]);

  useEffect(() => {
    fetchData();
    // selectedPropType is not sent to the API yet but still triggers a refresh (previous behaviour).
  }, [fetchData, selectedPropType]);

  const statusActions = useListingStatusActions(fetchData);

  const selectedStay = data.find((s) => s.id === selectedStayId) || null;

  const handleSelectStay = (stay: Listing) => {
    setSelectedStayId(stay.id);
    updateUrl({ selected: stay.id });
  };

  const handleClosePanel = () => {
    setSelectedStayId(null);
    updateUrl({ selected: null });
  };

  // KPI Strip definitions from Mockup 05
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: t("list.kpis.total"),
      value: totalCount || 1248,
      icon: <Home className="w-5 h-5" aria-hidden="true" />,
      colorVariant: "neutral",
    },
    {
      id: "pending",
      label: t("list.kpis.pending"),
      value: statusFacets["pending"] ?? statusFacets["pending_review"] ?? 186,
      icon: <Clock className="w-5 h-5" aria-hidden="true" />,
      colorVariant: "warning",
    },
    {
      id: "published",
      label: t("list.kpis.published"),
      value: statusFacets["published"] ?? statusFacets["approved"] ?? 892,
      icon: <CheckCircle className="w-5 h-5" aria-hidden="true" />,
      colorVariant: "success",
    },
    {
      id: "suspended",
      label: t("list.kpis.suspended"),
      value: statusFacets["suspended"] ?? 78,
      icon: <PauseCircle className="w-5 h-5" aria-hidden="true" />,
      colorVariant: "neutral",
    },
    {
      id: "refused",
      label: t("list.kpis.refused"),
      value: statusFacets["refused"] ?? statusFacets["rejected"] ?? 54,
      icon: <XCircle className="w-5 h-5" aria-hidden="true" />,
      colorVariant: "danger",
    },
  ];

  // Table columns (Mockup 05)
  const columns: Column<Listing>[] = [
    {
      key: "listing",
      header: t("list.columns.stay"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-tertiary-100 shrink-0">
            <Image
              src={listingImageSrc(row.imageSrc?.[0] || row.images?.[0], "stay")}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 max-w-[220px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectStay(row);
              }}
              className="block max-w-full font-semibold text-primary-900 truncate text-sm text-start hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              {row.title}
            </button>
            <div className="text-xs text-primary-600 flex items-center gap-1.5 mt-0.5 min-w-0 whitespace-nowrap">
              <span dir="ltr">{row.formattedId || `#H${row.id.replace("lst_", "").padStart(5, "0")}`}</span>
              <span aria-hidden="true">•</span>
              <span className="capitalize truncate">{row.propertyType}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "host",
      header: t("list.columns.host"),
      render: (row) => (
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="w-7 h-7 shrink-0 rounded-full bg-darnaBg-300 flex items-center justify-center font-semibold text-xs text-primary-800">
            {row.hostName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-primary truncate">{row.hostName}</div>
            <div className="text-[11px] text-primary-600">{hostTypeLabel(row.hostType)}</div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: t("list.columns.location"),
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-primary-800 whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-secondary-700 shrink-0" aria-hidden="true" />
          <span className="truncate">{row.city}, {row.wilayaCode}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: t("list.columns.type"),
      render: (row) => <TypePill type={row.hostType} />,
    },
    {
      key: "price",
      header: t("list.columns.price"),
      render: (row) => (
        <div className="text-xs font-medium text-primary tabular-nums whitespace-nowrap">
          {formatDzd(row.price, locale)}
        </div>
      ),
    },
    {
      key: "status",
      header: tCommon("status"),
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "rating",
      header: t("list.columns.rating"),
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-primary-800 whitespace-nowrap">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
          <span className="font-medium">{row.rating.toFixed(1)}</span>
          <span className="text-primary-600">{t("values.reviewsShort", { count: row.reviewsCount })}</span>
        </div>
      ),
    },
    {
      key: "bookings",
      header: t("list.columns.bookings"),
      render: (row) => (
        <span className="text-xs font-medium text-primary">{row.bookingsCount}</span>
      ),
    },
    {
      key: "actions",
      header: tCommon("actions"),
      className: "text-end",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleSelectStay(row)}
            className={iconBtn}
            title={t("list.actions.quickPreview")}
            aria-label={t("list.actions.quickPreviewOf", { title: row.title })}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/stays/${row.id}`)}
            className={iconBtn}
            title={t("list.actions.openFull")}
            aria-label={t("list.actions.openFullOf", { title: row.title })}
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
          <DropdownMenu
            items={[
              {
                label: t("list.actions.quickPreview"),
                icon: <Eye className="w-3.5 h-3.5" aria-hidden="true" />,
                onClick: () => handleSelectStay(row),
              },
              {
                label: t("list.actions.approvePublish"),
                icon: <CheckCircle className="w-3.5 h-3.5 text-secondary-700" aria-hidden="true" />,
                disabled: !statusActions.allowed(row, "approved"),
                onClick: () => statusActions.changeStatus(row, "approved"),
              },
              {
                label: t("list.actions.markPending"),
                icon: <Clock className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />,
                disabled: !statusActions.allowed(row, "pending_review"),
                onClick: () => statusActions.changeStatus(row, "pending_review"),
              },
              {
                label: t("list.actions.suspend"),
                icon: <PauseCircle className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />,
                disabled: !statusActions.allowed(row, "suspended"),
                variant: "danger",
                onClick: () => statusActions.changeStatus(row, "suspended"),
              },
              {
                label: t("list.actions.reject"),
                icon: <XCircle className="w-3.5 h-3.5 text-accent-700" aria-hidden="true" />,
                disabled: !statusActions.allowed(row, "rejected"),
                variant: "danger",
                onClick: () => statusActions.changeStatus(row, "rejected"),
              },
              {
                label: t("list.actions.delete"),
                icon: <Trash2 className="w-3.5 h-3.5 text-accent-700" aria-hidden="true" />,
                variant: "danger",
                disabled: !can("listings.delete"),
                onClick: () => setConfirmAction({ type: "delete", stay: row }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Mockup 05) */}
      <PageHeader
        title={t("list.title")}
        subtitle={t("list.subtitle")}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!statusActions.canExport}
              title={statusActions.canExport ? undefined : tActions("notAllowed")}
              onClick={() =>
                statusActions.exportCsv({
                  status: currentStatus,
                  vertical: "home",
                  wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
                  search: searchQuery || undefined,
                })
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] text-meta font-semibold text-primary-800 bg-white rounded-xl transition-colors shadow-e1 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-e2 duration-fast"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{t("list.export")}</span>
            </button>
            {can("listings.approve") && (
            <button
              type="button"
              onClick={() => router.push("/stays/new")}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-meta font-semibold text-white bg-primary-800 rounded-xl hover:bg-primary-900 transition-colors shadow-e1 shadow-highlight duration-fast"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t("list.add")}</span>
            </button>
            )}
          </div>
        }
      />

      {/* 2. KPI Strip (Mockup 05) */}
      <KpiStrip
        cards={kpis}
        activeCardId={normalizedStatus}
        onCardClick={(id) => {
          updateUrl({ status: id === "all" ? null : id, page: "1" });
        }}
      />

      {/* 3. Filter Bar (Mockup 05) */}
      <FilterBar
        searchPlaceholder={t("list.searchPlaceholder")}
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "wilaya",
            label: t("list.filters.wilaya"),
            value: selectedWilaya,
            options: [
              { value: "all", label: t("list.filters.allWilayas") },
              ...WILAYAS.map((w) => ({ value: w.code, label: getWilayaLabel(w, locale) })),
            ],
            onChange: (val) => {
              setSelectedWilaya(val);
              setPage(1);
            },
          },
          {
            id: "propType",
            label: t("fields.propertyType"),
            value: selectedPropType,
            options: [
              { value: "all", label: t("list.filters.allTypes") },
              ...PROPERTY_TYPES.map((p) => ({ value: p.value, label: t(`propertyTypes.${p.key}`) })),
            ],
            onChange: (val) => {
              setSelectedPropType(val);
              setPage(1);
            },
          },
          {
            id: "status",
            label: tCommon("status"),
            value: normalizedStatus,
            options: [
              { value: "all", label: t("list.filters.allStatuses") },
              { value: "pending", label: t("list.kpis.pending") },
              { value: "published", label: t("list.filters.published") },
              { value: "suspended", label: t("list.filters.suspended") },
              { value: "refused", label: t("list.filters.refused") },
            ],
            onChange: (val) => {
              updateUrl({ status: val === "all" ? null : val, page: "1" });
            },
          },
        ]}
        onOpenAdvanced={() => setIsFilterDrawerOpen(true)}
        hasActiveFilters={selectedWilaya !== "all" || selectedPropType !== "all" || normalizedStatus !== "all" || !!searchQuery}
        onReset={() => {
          setSearchQuery("");
          setSelectedWilaya("all");
          setSelectedPropType("all");
          updateUrl({ status: null, page: "1" });
        }}
      />

      {/* 4. Split View: Table + Detail Panel (Pattern A - Mockup 05) */}
      <SplitView
        isPanelOpen={!!selectedStay}
        mainContent={
          <div className="flex flex-col gap-1">
            <DataTable
              columns={selectedStay ? columns.filter((c) => !SPLIT_HIDDEN_COLUMNS.includes(c.key)) : columns}
              data={data}
              keyExtractor={(s) => s.id}
              selectedRowId={selectedStayId || undefined}
              onRowClick={handleSelectStay}
              isLoading={isLoading}
              emptyMessage={t("list.empty")}
              selection={{
                selectedIds: selectedRowIds,
                onSelectionChange: setSelectedRowIds,
              }}
            />
            <div className="px-1">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  updateUrl({ page: String(p) });
                }}
                pageSize={pageSize}
                totalItems={total}
                itemLabel={t("list.itemLabel")}
              />
            </div>
          </div>
        }
        detailPanel={
          selectedStay ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedStay.title}
              subtitle={`${selectedStay.formattedId || `#H${selectedStay.id}`} • ${selectedStay.city}`}
              statusBadge={<StatusPill status={selectedStay.status} />}
              actions={
                <button
                  type="button"
                  onClick={() => router.push(`/stays/${selectedStay.id}`)}
                  className="p-1 text-primary-600 hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  title={t("list.actions.fullscreen")}
                  aria-label={t("list.actions.fullscreen")}
                >
                  <Maximize2 className="w-4 h-4" aria-hidden="true" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedStay.status === "approved" || selectedStay.status === "published") ? (statusActions.allowed(selectedStay, "suspended") &&
                      <button
                        type="button"
                        onClick={() => statusActions.changeStatus(selectedStay, "suspended")}
                        className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-amber-800 bg-white shadow-e1 rounded-xl hover:bg-amber-50 transition-colors duration-fast"
                      >
                        {tActions("suspend")}
                      </button>
                    ) : (selectedStay.status === "pending_review" || selectedStay.status === "pending") ? (
                      <>
                        {can("listings.approve") && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              unwrap(await approveListing(selectedStay.id));
                              addToast({
                                title: t("list.toasts.approvedTitle"),
                                description: t("list.toasts.approvedDescription"),
                                variant: "success",
                              });
                              fetchData();
                            } catch (err: unknown) {
                              addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-secondary-700 hover:bg-secondary-800 rounded-xl shadow-e1 flex items-center gap-1.5 transition-colors duration-fast"
                        >
                          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t("list.actions.approveDirect")}</span>
                        </button>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/stays/${selectedStay.id}/review`)}
                          className="px-3 py-1.5 text-xs font-semibold text-primary rounded-xl bg-white shadow-e1 hover:shadow-e2 transition duration-fast"
                        >
                          {t("list.actions.reviewFile")}
                        </button>
                      </>
                    ) : (selectedStay.status === "suspended" || selectedStay.status === "rejected" || selectedStay.status === "refused") ? (statusActions.allowed(selectedStay, selectedStay.status === "suspended" ? "approved" : "pending_review") &&
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            unwrap(await updateListingStatus(selectedStay.id, selectedStay.status === "suspended" ? "approved" : "pending_review"));
                            addToast({
                              title: t("list.toasts.reactivatedTitle"),
                              description: t("list.toasts.reactivatedDescription"),
                              variant: "success",
                            });
                            fetchData();
                          } catch (err: unknown) {
                            addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-primary rounded-xl flex items-center gap-1.5 transition-colors bg-white shadow-e1 hover:shadow-e2 duration-fast"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-secondary-700" aria-hidden="true" />
                        <span>{t("list.actions.cancelSuspension")}</span>
                      </button>
                    ) : null}
                    {statusActions.canRestore(selectedStay) && (
                      <button
                        type="button"
                        onClick={() => statusActions.restore(selectedStay)}
                        className="px-3 py-1.5 text-xs font-semibold text-primary rounded-xl transition-colors bg-white shadow-e1 hover:shadow-e2 duration-fast"
                      >
                        {tActions("restore")}
                      </button>
                    )}
                    {statusActions.canDelete(selectedStay) && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "delete", stay: selectedStay })}
                      className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-accent-700 bg-white ring-1 ring-inset ring-accent/40 rounded-xl hover:bg-accent-50 transition-colors duration-fast"
                    >
                      {tCommon("delete")}
                    </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/stays/${selectedStay.id}`)}
                    className="px-3.5 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-primary-800 rounded-xl hover:bg-primary-900 shadow-e1 transition-colors duration-fast"
                  >
                    {tCommon("edit")}
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                {/* Carousel */}
                <ImageCarousel
                  images={listingImages(selectedStay.imageSrc, "stay")}
                  alt={selectedStay.title}
                />

                {/* Rating & Location */}
                <div className="flex items-center justify-between text-xs text-primary border-b border-primary/[0.08] pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" />
                    <span className="font-semibold">{selectedStay.rating.toFixed(1)}</span>
                    <span className="text-primary-600">{t("values.reviews", { count: selectedStay.reviewsCount })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-secondary-700 font-medium">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{selectedStay.city}, {selectedStay.wilayaCode}</span>
                  </div>
                </div>

                {/* Panel Tabs */}
                <Tabs
                  items={[
                    { id: "info", label: t("tabs.info") },
                    { id: "photos", label: t("tabs.photos") },
                    { id: "amenities", label: t("tabs.amenities") },
                    { id: "calendar", label: t("tabs.calendar") },
                    { id: "bookings", label: t("tabs.bookings") },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "info" && (
                  <div className="space-y-4">
                    {/* About / General specs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500">
                          {t("list.panel.about")}
                        </h4>
                        <button
                          type="button"
                          onClick={() => router.push(`/stays/${selectedStay.id}`)}
                          className="text-xs text-secondary-700 hover:underline"
                        >
                          {tCommon("edit")}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={t("fields.propertyType")} value={selectedStay.propertyType} />
                        <InfoTile label={t("fields.capacity")} value={t("values.guests", { count: selectedStay.guestCapacity })} />
                        <InfoTile label={t("fields.bedrooms")} value={`${selectedStay.bedroomCount || 1}`} />
                        <InfoTile label={t("fields.bathrooms")} value={`${selectedStay.bathroomCount || 1}`} />
                        <InfoTile label={t("fields.surface")} value={t("values.surface", { value: selectedStay.surfaceM2 || 120 })} />
                        <InfoTile label={t("fields.wilaya")} value={`${selectedStay.wilayaCode} - ${selectedStay.city}`} />
                      </div>
                    </div>

                    {/* Price & Discount Section */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2.5">
                      <div className="text-xs font-semibold text-primary flex items-center justify-between">
                        <span>{t("pricing.title")}</span>
                        <span className="font-semibold text-primary-900 text-sm tabular-nums whitespace-nowrap">
                          {t.rich("values.pricePerNight", {
                            price: formatDzd(selectedStay.price, locale),
                            unit: (chunks) => <span className="text-[11px] text-primary-600">{chunks}</span>,
                          })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-primary/[0.08]">
                        <div>
                          <span className="text-primary-600 block">{t("pricing.cleaningFee")}</span>
                          <span className="font-medium text-primary">{formatDzd(3500, locale)}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.commission")}</span>
                          <span className="font-medium text-secondary-700">{t("pricing.commissionValue", { rate: 12 })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.weeklyDiscount", { rate: DISCOUNTS.weekly })}</span>
                          <span className="font-medium text-secondary-700">
                            {t("pricing.weeklyPrice", { amount: formatDzd(applyDiscount(selectedStay.price, DISCOUNTS.weekly, 7), locale) })}
                          </span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.deposit")}</span>
                          <span className="font-medium text-primary">{formatDzd(20000, locale)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Schedule Section */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-secondary-700" aria-hidden="true" />
                        <span>{t("times.title")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-primary-600 block">{t("times.checkIn")}</span>
                          <span className="font-medium text-primary">{t("times.checkInValue", { time: "15:00" })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("times.checkOut")}</span>
                          <span className="font-medium text-primary">{t("times.checkOutValue", { time: "11:00" })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("times.minStay")}</span>
                          <span className="font-medium text-primary">{t("times.minStayValue", { count: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("times.cancellation")}</span>
                          <span className="font-medium text-secondary-700">{t("times.cancellationValue", { hours: 48 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Host Mini Card */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl">
                      <div className="text-xs font-semibold text-primary mb-2 flex items-center justify-between">
                        <span>{t("host.title")}</span>
                        <button
                          type="button"
                          onClick={() => router.push(`/hosts/${selectedStay.hostId}`)}
                          className="text-[11px] text-secondary-700 hover:underline"
                        >
                          {t("host.viewProfile")}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div aria-hidden="true" className="w-10 h-10 rounded-full bg-darnaBg-400 flex items-center justify-center font-semibold text-sm text-primary">
                          {selectedStay.hostName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-primary">{selectedStay.hostName}</div>
                          <div className="text-xs text-primary-600 flex items-center gap-1.5">
                            <span>{hostTypeLabel(selectedStay.hostType)}</span>
                            <span aria-hidden="true">•</span>
                            <span className="text-secondary-700 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" aria-hidden="true" /> {t("host.verified")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description snippet */}
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500 mb-1.5">
                        {t("fields.description")}
                      </h4>
                      <p className="text-xs text-primary-700 leading-relaxed bg-darnaBg-100 p-3 rounded-xl">
                        {selectedStay.description || t("list.panel.noDescription")}
                      </p>
                    </div>
                  </div>
                )}

                {panelTab === "photos" && (
                  <ul className="grid grid-cols-2 gap-2">
                    {listingImages(selectedStay.imageSrc, "stay").map((img, i) => (
                      <li key={i} className="relative aspect-video rounded-lg overflow-hidden border border-primary/[0.08]">
                        <Image
                          src={img}
                          alt={t("photoAlt", { title: selectedStay.title, index: i + 1 })}
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {panelTab === "amenities" && (
                  <ul className="flex flex-wrap gap-1.5">
                    {selectedStay.amenities.map((am, i) => (
                      <li key={i} className="px-2.5 py-1 text-xs bg-darnaBg-100 text-primary rounded-md">
                        {am}
                      </li>
                    ))}
                  </ul>
                )}

                {panelTab === "calendar" && (
                  <div className="bg-darnaBg-100 p-3.5 rounded-xl text-center">
                    <Calendar className="w-8 h-8 text-secondary-700 mx-auto mb-2 opacity-70" aria-hidden="true" />
                    <p className="text-xs text-primary-600">
                      {t("list.panel.calendarText")}
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push(`/stays/${selectedStay.id}?tab=calendar`)}
                      className="mt-2 text-xs font-medium text-secondary-700 hover:underline inline-flex items-center gap-1"
                    >
                      {t("list.panel.calendarLink")}
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {panelTab === "bookings" && (
                  <ul className="space-y-2 text-xs">
                    {[
                      { ref: "#R1248", guest: "Karim L.", start: "2024-03-12", end: "2024-03-15", status: "confirmed" },
                      { ref: "#R1190", guest: "Sarah B.", start: "2024-02-02", end: "2024-02-06", status: "completed" },
                    ].map((b) => (
                      <li key={b.ref} className="p-3 bg-darnaBg-100 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="font-medium text-primary">
                            <span dir="ltr">{b.ref}</span> • {b.guest}
                          </div>
                          <div className="text-[11px] text-primary-600">
                            {t("values.dateRange", { start: formatDate(b.start, locale), end: formatDate(b.end, locale) })}
                          </div>
                        </div>
                        <StatusPill status={b.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DetailPanel>
          ) : null
        }
      />

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title={t("list.advanced.title")}
        onApply={() => {
          setIsFilterDrawerOpen(false);
          fetchData();
        }}
        onReset={() => {
          setSelectedWilaya("all");
          setSelectedPropType("all");
          setIsFilterDrawerOpen(false);
        }}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label htmlFor="stays-adv-capacity" className="font-semibold text-primary block mb-1.5">{t("list.advanced.minCapacity")}</label>
            <input
              id="stays-adv-capacity"
              type="number"
              min="1"
              max="30"
              defaultValue="1"
              className="w-full px-3 py-2 bg-white border border-primary/[0.12] rounded-lg text-primary"
            />
          </div>
          <fieldset>
            <legend className="font-semibold text-primary block mb-1.5">{t("list.advanced.priceRange")}</legend>
            <div className="flex items-center gap-2">
              <input
                type="number"
                aria-label={t("list.advanced.min")}
                placeholder={t("list.advanced.min")}
                className="w-1/2 px-3 py-2 bg-white border border-primary/[0.12] rounded-lg text-primary"
              />
              <input
                type="number"
                aria-label={t("list.advanced.max")}
                placeholder={t("list.advanced.max")}
                className="w-1/2 px-3 py-2 bg-white border border-primary/[0.12] rounded-lg text-primary"
              />
            </div>
          </fieldset>
          <div>
            <label htmlFor="stays-adv-approval" className="font-semibold text-primary block mb-1.5">{t("fields.approvalMode")}</label>
            <select id="stays-adv-approval" className="w-full px-3 py-2 bg-white border border-primary/[0.12] rounded-lg text-primary">
              <option value="all">{t("list.advanced.allModes")}</option>
              <option value="instant">{t("values.instantBooking")}</option>
              <option value="request">{t("values.onRequest")}</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          title={
            confirmAction.type === "delete"
              ? t("list.confirm.deleteTitle")
              : confirmAction.type === "suspend"
              ? t("list.confirm.suspendTitle")
              : t("list.confirm.approveTitle")
          }
          description={t("list.confirm.description", { title: confirmAction.stay.title })}
          confirmLabel={confirmAction.type === "delete" ? t("list.confirm.deleteConfirm") : tCommon("confirm")}
          variant={confirmAction.type === "delete" ? "danger" : "primary"}
          onConfirm={async () => {
            const ok = await statusActions.remove(confirmAction.stay, t("list.toasts.deleted"));
            if (ok) setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {statusActions.dialog}
    </div>
  );
}
