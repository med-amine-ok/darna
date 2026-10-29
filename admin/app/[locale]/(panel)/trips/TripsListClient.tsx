"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Plane,
  CheckCircle,
  Clock,
  XCircle,
  PauseCircle,
  FileEdit,
  Download,
  Plus,
  Eye,
  ExternalLink,
  MapPin,
  Calendar,
  Star,
  Tag,
  Check,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip, KpiCardItem } from "@/components/ui/KpiStrip";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { StatusPill } from "@/components/ui/StatusPill";
import { InfoTile } from "@/components/ui/InfoTile";
import { Tabs } from "@/components/ui/Tabs";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listListings, approveListing, updateListingStatus } from "@/lib/actions/listings";
import { useListingStatusActions } from "@/components/features/listings/useListingStatusActions";
import { formatDate, formatDzd, intlLocale } from "@/lib/utils/format";
import { applyDiscount, DISCOUNTS } from "@/lib/pricing";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Listing } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

// value = filter value (unchanged), labelKey = translation key under trips.categoryOptions
const TRIP_CATEGORIES = [
  { value: "sahara & sud", labelKey: "sahara" },
  { value: "circuit culturel", labelKey: "cultural" },
  { value: "randonnée & bivouac", labelKey: "trekking" },
  { value: "séjour balnéaire", labelKey: "seaside" },
  { value: "circuit grand sud", labelKey: "deepSouth" },
] as const;

// Mock schedule shown until trips carry real departure data.
const MOCK_DEPARTURE = "2024-11-15";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function TripsListClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("trips");
  const tCommon = useTranslations("common");
  const tActions = useTranslations("actions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const can = useCan();

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
  const selectedTripIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  const [data, setData] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(10);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(selectedTripIdFromUrl);
  const [, setIsFilterDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("details");

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "suspend";
    trip: Listing;
  } | null>(null);

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
      const res = unwrap(await listListings({
        status: currentStatus,
        vertical: "trip",
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

  // selectedCategory is not sent to the server yet; changing it still refreshes the list.
  useEffect(() => {
    fetchData();
  }, [fetchData, selectedCategory]);

  const statusActions = useListingStatusActions(() => fetchData());

  const selectedTrip = data.find((trip) => trip.id === selectedTripId) || null;

  const handleSelectTrip = (trip: Listing) => {
    setSelectedTripId(trip.id);
    updateUrl({ selected: trip.id });
  };

  const handleClosePanel = () => {
    setSelectedTripId(null);
    updateUrl({ selected: null });
  };

  const formatRating = (rating: number) =>
    new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);

  const formatTime = (hour: number, minute: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(
      new Date(2000, 0, 1, hour, minute)
    );

  const departureLabel = formatDate(MOCK_DEPARTURE, locale);
  const durationLabel = t("duration", { days: 5, nights: 4 });

  // KPI Strip (Mockup 02: 156 Tous · 98 Publiés · 24 En attente · 12 Suspendus · 8 Refusés · 14 Brouillons)
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: t("kpi.total"),
      value: totalCount || 156,
      icon: <Plane className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "published",
      label: t("kpi.published"),
      value: statusFacets["published"] ?? statusFacets["approved"] ?? 98,
      icon: <CheckCircle className="w-5 h-5" />,
      colorVariant: "success",
    },
    {
      id: "pending",
      label: t("kpi.pending"),
      value: statusFacets["pending"] ?? statusFacets["pending_review"] ?? 24,
      icon: <Clock className="w-5 h-5" />,
      colorVariant: "warning",
    },
    {
      id: "suspended",
      label: t("kpi.suspended"),
      value: statusFacets["suspended"] ?? 12,
      icon: <PauseCircle className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "refused",
      label: t("kpi.refused"),
      value: statusFacets["refused"] ?? statusFacets["rejected"] ?? 8,
      icon: <XCircle className="w-5 h-5" />,
      colorVariant: "danger",
    },
    {
      id: "draft",
      label: t("kpi.drafts"),
      value: statusFacets["draft"] ?? 14,
      icon: <FileEdit className="w-5 h-5" />,
      colorVariant: "neutral",
    },
  ];

  // Table columns (Mockup 02: #, Voyage, Destination, Date de départ, Durée, Prix, Statut, Actions)
  const columns: Column<Listing>[] = [
    {
      key: "id",
      header: "#",
      className: "w-20",
      render: (row) => (
        <span className="font-mono text-xs text-[#2E3A2F]/70 font-semibold">
          {row.formattedId || `#T${row.id.replace("lst_", "").padStart(4, "0")}`}
        </span>
      ),
    },
    {
      key: "trip",
      header: t("columns.trip"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#E5DFD3] shrink-0 border border-[#D9C9B2]/40">
            <Image
              src={row.imageSrc?.[0] || "/placeholder-trip.jpg"}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              className={`block max-w-full font-medium text-[#2E3A2F] truncate text-sm text-start hover:underline rounded ${FOCUS_RING}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTrip(row);
              }}
            >
              {row.title}
            </button>
            <div className="text-xs text-[#2E3A2F]/70 capitalize mt-0.5">
              {row.propertyType || t("categoryFallback")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "destination",
      header: t("columns.destination"),
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-[#2E3A2F]">
          <MapPin className="w-3.5 h-3.5 text-[#6B7F5B] shrink-0" aria-hidden="true" />
          <span className="truncate">{t("locationValue", { city: row.city, code: row.wilayaCode })}</span>
        </div>
      ),
    },
    {
      key: "departure",
      header: t("columns.departure"),
      render: () => (
        <div className="text-xs text-[#2E3A2F] flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-[#2E3A2F]/50" aria-hidden="true" />
          <span>{departureLabel}</span>
        </div>
      ),
    },
    {
      key: "duration",
      header: t("columns.duration"),
      render: () => <span className="text-xs text-[#2E3A2F]">{durationLabel}</span>,
    },
    {
      key: "price",
      header: t("columns.price"),
      render: (row) => (
        <div className="text-xs font-semibold text-[#2E3A2F]">
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
      key: "actions",
      header: tCommon("actions"),
      className: "text-end",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleSelectTrip(row)}
            className={`p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors ${FOCUS_RING}`}
            title={t("quickPreview")}
            aria-label={t("quickPreviewOf", { title: row.title })}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/trips/${row.id}`)}
            className={`p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors ${FOCUS_RING}`}
            title={t("openFullPage")}
            aria-label={t("openFullPageOf", { title: row.title })}
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
          <DropdownMenu
            items={[
              {
                label: t("quickPreview"),
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => handleSelectTrip(row),
              },
              {
                label: t("menu.approve"),
                icon: <CheckCircle className="w-3.5 h-3.5 text-secondary" />,
                disabled: !statusActions.allowed(row, "approved"),
                onClick: () => statusActions.changeStatus(row, "approved"),
              },
              {
                label: t("menu.markPending"),
                icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
                disabled: !statusActions.allowed(row, "pending_review"),
                onClick: () => statusActions.changeStatus(row, "pending_review"),
              },
              {
                label: t("menu.suspend"),
                icon: <PauseCircle className="w-3.5 h-3.5 text-amber-700" />,
                disabled: !statusActions.allowed(row, "suspended"),
                variant: "danger",
                onClick: () => statusActions.changeStatus(row, "suspended"),
              },
              {
                label: t("menu.reject"),
                icon: <XCircle className="w-3.5 h-3.5 text-accent-700" />,
                disabled: !statusActions.allowed(row, "rejected"),
                variant: "danger",
                onClick: () => statusActions.changeStatus(row, "rejected"),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Mockup 02: Exporter, Catégories, + Ajouter un voyage) */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!statusActions.canExport}
              title={statusActions.canExport ? undefined : tActions("notAllowed")}
              onClick={() =>
                statusActions.exportCsv({
                  status: currentStatus,
                  vertical: "trip",
                  wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
                  search: searchQuery || undefined,
                })
              }
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{t("export")}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/trips/categories")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE] transition-colors shadow-sm ${FOCUS_RING}`}
            >
              <Tag className="w-4 h-4" aria-hidden="true" />
              <span>{t("categories")}</span>
            </button>
            {can("listings.approve") && (
            <button
              type="button"
              onClick={() => router.push("/trips/new")}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25] transition-colors shadow-sm ${FOCUS_RING}`}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t("add")}</span>
            </button>
            )}
          </div>
        }
      />

      {/* 2. KPI Strip (Mockup 02: 6 cards) */}
      <KpiStrip
        cards={kpis}
        activeCardId={normalizedStatus}
        onCardClick={(id) => {
          updateUrl({ status: id === "all" ? null : id, page: "1" });
        }}
      />

      {/* 3. Filter Bar (Mockup 02) */}
      <FilterBar
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "wilaya",
            label: t("filters.destination"),
            value: selectedWilaya,
            options: [
              { value: "all", label: t("filters.allDestinations") },
              ...WILAYAS.map((w) => ({ value: w.code, label: getWilayaLabel(w, locale) })),
            ],
            onChange: (val) => {
              setSelectedWilaya(val);
              setPage(1);
            },
          },
          {
            id: "category",
            label: t("filters.category"),
            value: selectedCategory,
            options: [
              { value: "all", label: t("filters.allCategories") },
              ...TRIP_CATEGORIES.map((c) => ({ value: c.value, label: t(`categoryOptions.${c.labelKey}`) })),
            ],
            onChange: (val) => {
              setSelectedCategory(val);
              setPage(1);
            },
          },
          {
            id: "status",
            label: tCommon("status"),
            value: normalizedStatus,
            options: [
              { value: "all", label: t("filters.allStatuses") },
              { value: "published", label: t("statusOptions.published") },
              { value: "pending", label: t("statusOptions.pending") },
              { value: "suspended", label: t("statusOptions.suspended") },
              { value: "refused", label: t("statusOptions.refused") },
              { value: "draft", label: t("statusOptions.draft") },
            ],
            onChange: (val) => {
              updateUrl({ status: val === "all" ? null : val, page: "1" });
            },
          },
        ]}
        onOpenAdvanced={() => setIsFilterDrawerOpen(true)}
        hasActiveFilters={selectedWilaya !== "all" || selectedCategory !== "all" || normalizedStatus !== "all" || !!searchQuery}
        onReset={() => {
          setSearchQuery("");
          setSelectedWilaya("all");
          setSelectedCategory("all");
          updateUrl({ status: null, page: "1" });
        }}
      />

      {/* 4. Split View: Table + Detail Panel (Mockup 02) */}
      <SplitView
        isPanelOpen={!!selectedTrip}
        mainContent={
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(trip) => trip.id}
              selectedRowId={selectedTripId || undefined}
              onRowClick={handleSelectTrip}
              isLoading={isLoading}
              emptyMessage={t("empty")}
              selection={{
                selectedIds: selectedRowIds,
                onSelectionChange: setSelectedRowIds,
              }}
            />
            <div className="p-4 border-t border-[#D9C9B2]/40 bg-[#FAF9F5]">
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
          selectedTrip ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedTrip.title}
              subtitle={`${selectedTrip.formattedId || `#T${selectedTrip.id}`} • ${selectedTrip.city}`}
              statusBadge={<StatusPill status={selectedTrip.status} />}
              actions={
                <button
                  type="button"
                  onClick={() => router.push(`/trips/${selectedTrip.id}`)}
                  className={`p-1 text-[#2E3A2F]/70 hover:text-[#2E3A2F] rounded ${FOCUS_RING}`}
                  title={t("fullScreen")}
                  aria-label={t("fullScreen")}
                >
                  <Maximize2 className="w-4 h-4" aria-hidden="true" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedTrip.status === "approved" || selectedTrip.status === "published") ? (statusActions.allowed(selectedTrip, "suspended") &&
                      <button
                        type="button"
                        onClick={() => statusActions.changeStatus(selectedTrip, "suspended")}
                        className="px-3 py-1.5 text-xs font-medium text-[#7A5A26] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                      >
                        {t("panel.suspend")}
                      </button>
                    ) : (selectedTrip.status === "pending_review" || selectedTrip.status === "pending") ? (
                      can("listings.approve") && <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              unwrap(await approveListing(selectedTrip.id));
                              addToast({
                                title: t("toast.approvedTitle"),
                                description: t("toast.approvedDescription"),
                                variant: "success",
                              });
                              fetchData();
                            } catch (err: unknown) {
                              addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#5a6b4c] hover:bg-[#4a5a3e] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t("panel.approveDirectly")}</span>
                        </button>
                      </>
                    ) : (selectedTrip.status === "suspended" || selectedTrip.status === "rejected" || selectedTrip.status === "refused") ? (statusActions.allowed(selectedTrip, selectedTrip.status === "suspended" ? "approved" : "pending_review") &&
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            unwrap(await updateListingStatus(selectedTrip.id, selectedTrip.status === "suspended" ? "approved" : "pending_review"));
                            addToast({
                              title: t("toast.reactivatedTitle"),
                              description: t("toast.reactivatedDescription"),
                              variant: "success",
                            });
                            fetchData();
                          } catch (err: unknown) {
                            addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-[#2E3A2F] bg-[#D9C9B2]/40 hover:bg-[#D9C9B2]/70 border border-[#D9C9B2] rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#6B7F5B]" aria-hidden="true" />
                        <span>{t("panel.cancelSuspension")}</span>
                      </button>
                    ) : null}
                    {statusActions.canRestore(selectedTrip) && (
                      <button
                        type="button"
                        onClick={() => statusActions.restore(selectedTrip)}
                        className="px-3 py-1.5 text-xs font-medium text-[#2E3A2F] bg-[#D9C9B2]/40 hover:bg-[#D9C9B2]/70 border border-[#D9C9B2] rounded-lg transition-colors"
                      >
                        {tActions("restore")}
                      </button>
                    )}
                    {statusActions.canDelete(selectedTrip) && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "delete", trip: selectedTrip })}
                      className="px-3 py-1.5 text-xs font-medium text-[#A4532F] border border-[#C96F4F]/40 rounded-lg hover:bg-[#C96F4F]/10"
                    >
                      {tCommon("delete")}
                    </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/trips/${selectedTrip.id}`)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
                  >
                    {t("panel.edit")}
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <ImageCarousel
                  images={selectedTrip.imageSrc?.length ? selectedTrip.imageSrc : ["/placeholder-trip.jpg"]}
                  alt={selectedTrip.title}
                />

                <div className="flex items-center justify-between text-xs text-[#2E3A2F] border-b border-[#D9C9B2]/40 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" />
                    <span className="font-semibold">{formatRating(selectedTrip.rating)}</span>
                    <span className="text-[#2E3A2F]/70">{t("reviewsCount", { count: selectedTrip.reviewsCount })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#4F5F43] font-medium">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("locationValue", { city: selectedTrip.city, code: selectedTrip.wilayaCode })}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "details", label: t("tabs.details") },
                    { id: "programme", label: t("tabs.programme") },
                    { id: "photos", label: t("tabs.photos") },
                    { id: "bookings", label: t("tabs.bookings") },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "details" && (
                  <div className="space-y-4">
                    {/* About This Trip */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-2">
                        {t("about.title")}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={t("about.departureDate")} value={departureLabel} />
                        <InfoTile label={t("about.duration")} value={durationLabel} />
                        <InfoTile label={t("about.maxGroup")} value={t("about.maxPeople", { count: 12 })} />
                        <InfoTile label={t("about.difficulty")} value={t("about.difficultyModerate")} />
                      </div>
                    </div>

                    {/* Price & Discounts Section */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2.5">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center justify-between">
                        <span>{t("pricing.title")}</span>
                        <span className="font-bold text-[#2E3A2F] text-sm font-mono">
                          {formatDzd(selectedTrip.price, locale)}{" "}
                          <span className="text-[10px] text-[#2E3A2F]/70">{t("pricing.perPerson")}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#D9C9B2]/40">
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("pricing.earlyBird")}</span>
                          <span className="font-medium text-[#4F5F43]">
                            {t("pricing.discountValue", { percent: DISCOUNTS.group, price: formatDzd(applyDiscount(selectedTrip.price, DISCOUNTS.group), locale) })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("pricing.commission")}</span>
                          <span className="font-medium text-[#4F5F43]">{t("pricing.commissionIncluded", { rate: 12 })}</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("pricing.deposit")}</span>
                          <span className="font-medium text-[#2E3A2F]">{t("pricing.depositValue", { percent: 30 })}</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("pricing.cancellation")}</span>
                          <span className="font-medium text-[#2E3A2F]">{t("pricing.cancellationValue", { days: 7 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Schedule Section */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#6B7F5B]" aria-hidden="true" />
                        <span>{t("schedule.title")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("schedule.gathering")}</span>
                          <span className="font-medium text-[#2E3A2F]">{t("schedule.gatheringValue", { time: formatTime(7, 30) })}</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("schedule.return")}</span>
                          <span className="font-medium text-[#2E3A2F]">{t("schedule.returnValue", { time: formatTime(18, 0) })}</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("schedule.dailyWalk")}</span>
                          <span className="font-medium text-[#2E3A2F]">{t("schedule.dailyWalkValue", { min: 3, max: 4 })}</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/70 block">{t("schedule.meetingPoint")}</span>
                          <span className="font-medium text-[#4F5F43]">{t("schedule.meetingPointValue", { city: selectedTrip.city })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50">
                      <div className="text-xs font-semibold text-[#2E3A2F] mb-1">
                        {t("agency.title")}
                      </div>
                      <div className="text-sm font-medium text-[#2E3A2F]">{selectedTrip.hostName}</div>
                      <div className="text-xs text-[#4F5F43] flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> {t("agency.licensed")}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">
                        {t("highlights.title")}
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[#2E3A2F]">
                        {(["bivouac", "fullBoard", "transport"] as const).map((key) => (
                          <li key={key} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-[#6B7F5B]" aria-hidden="true" />
                            <span>{t(`highlights.${key}`)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Description Section */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">
                        {t("description.title")}
                      </h4>
                      <p className="text-xs text-[#2E3A2F]/80 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                        {selectedTrip.description || t("description.empty")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </DetailPanel>
          ) : null
        }
      />

      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          title={confirmAction.type === "delete" ? t("confirm.deleteTitle") : t("confirm.suspendTitle")}
          description={t("confirm.description", { title: confirmAction.trip.title })}
          variant={confirmAction.type === "delete" ? "danger" : "primary"}
          onConfirm={async () => {
            const ok = await statusActions.remove(confirmAction.trip, t("confirm.deleted"));
            if (ok) setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {statusActions.dialog}
    </div>
  );
}
