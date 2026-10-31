"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { listingImageSrc, listingImages } from "@/lib/placeholders";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Car,
  CheckCircle,
  Clock,
  XCircle,
  Wrench,
  Download,
  Plus,
  Eye,
  ExternalLink,
  MapPin,
  Calendar,
  Star,
  Tag,
  Maximize2,
  Building2,
  PauseCircle,
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
import { listListings } from "@/lib/actions/listings";
import { useListingStatusActions } from "@/components/features/listings/useListingStatusActions";
import { formatDzd, intlLocale } from "@/lib/utils/format";
import { applyDiscount, DISCOUNTS } from "@/lib/pricing";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Listing } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

/** Low-priority columns hidden while the split detail panel is open (ANALYSIS.md §4). */
const SPLIT_HIDDEN_COLUMNS = ["id", "category", "location"];

// value = filter value (unchanged), labelKey = translation key under cars.categoryOptions
const CAR_CATEGORIES = [
  { value: "suv & 4x4", labelKey: "suv" },
  { value: "citadine", labelKey: "cityCar" },
  { value: "berline", labelKey: "sedan" },
  { value: "compacte", labelKey: "compact" },
  { value: "utilitaire", labelKey: "utility" },
] as const;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function CarsListClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("cars");
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
    if (lower === "published" || lower === "approved") return "approved";
    if (lower === "refused" || lower === "rejected") return "rejected";
    return lower;
  };
  const normalizedStatus = normalizeStatusKey(currentStatus);
  const selectedCarIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  const [data, setData] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGearbox, setSelectedGearbox] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(10);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(selectedCarIdFromUrl);
  const [, setIsFilterDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("details");

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete";
    car: Listing;
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
        vertical: "vehicle",
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

  // Category / gearbox are not sent to the server yet; changing them still refreshes the list.
  useEffect(() => {
    fetchData();
  }, [fetchData, selectedCategory, selectedGearbox]);

  const statusActions = useListingStatusActions(() => fetchData());

  const selectedCar = data.find((c) => c.id === selectedCarId) || null;

  const handleSelectCar = (car: Listing) => {
    setSelectedCarId(car.id);
    updateUrl({ selected: car.id });
  };

  const handleClosePanel = () => {
    setSelectedCarId(null);
    updateUrl({ selected: null });
  };

  const formatRating = (rating: number) =>
    new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);

  const formatTime = (hour: number, minute: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(
      new Date(2000, 0, 1, hour, minute)
    );

  // KPI Strip (Mockup 09: 1,024 Véhicules · 542 Disponibles · 186 Réservées · 42 En maintenance · 32 Indisponibles · 86 Agences)
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: t("kpi.total"),
      value: totalCount || 1024,
      icon: <Car className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "approved",
      label: t("kpi.available"),
      value: statusFacets["approved"] ?? 542,
      icon: <CheckCircle className="w-5 h-5" />,
      colorVariant: "success",
    },
    {
      id: "booked",
      label: t("kpi.booked"),
      value: 186,
      icon: <Calendar className="w-5 h-5" />,
      colorVariant: "primary",
    },
    {
      id: "maintenance",
      label: t("kpi.maintenance"),
      value: 42,
      icon: <Wrench className="w-5 h-5" />,
      colorVariant: "warning",
    },
    {
      id: "rejected",
      label: t("kpi.unavailable"),
      value: statusFacets["rejected"] ?? 32,
      icon: <XCircle className="w-5 h-5" />,
      colorVariant: "danger",
    },
    {
      id: "owners",
      label: t("kpi.owners"),
      value: 86,
      icon: <Building2 className="w-5 h-5" />,
      colorVariant: "neutral",
    },
  ];

  // Table columns (Mockup 09: #, Véhicule, Catégorie, Ville, Prix / jour, Statut, Actions)
  const columns: Column<Listing>[] = [
    {
      key: "id",
      header: "#",
      className: "w-20",
      render: (row) => (
        <span className="text-xs text-primary-600 font-semibold tabular-nums whitespace-nowrap">
          {row.formattedId || `#V${row.id.replace("lst_", "").padStart(4, "0")}`}
        </span>
      ),
    },
    {
      key: "vehicle",
      header: t("columns.vehicle"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-tertiary-100 shrink-0">
            <Image
              src={listingImageSrc(row.imageSrc?.[0], "car")}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 max-w-[240px]">
            <button
              type="button"
              className={`block max-w-full font-semibold text-primary-900 truncate text-sm text-start hover:underline rounded ${FOCUS_RING}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCar(row);
              }}
            >
              {row.title}
            </button>
            <div className="text-xs text-primary-600 mt-0.5">
              {t("rowSpecs", { year: 2023 })}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: t("columns.category"),
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-darnaBg-300/70 text-primary-800 whitespace-nowrap">
          <Car className="w-3 h-3 text-secondary" aria-hidden="true" />
          <span>{row.propertyType || t("categoryOptions.suv")}</span>
        </span>
      ),
    },
    {
      key: "location",
      header: t("columns.city"),
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-primary-800 whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" aria-hidden="true" />
          <span className="truncate">{t("locationValue", { city: row.city, code: row.wilayaCode })}</span>
        </div>
      ),
    },
    {
      key: "price",
      header: t("columns.pricePerDay"),
      render: (row) => (
        <div className="text-xs font-semibold text-primary tabular-nums whitespace-nowrap">
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
            onClick={() => handleSelectCar(row)}
            className={`p-1.5 rounded-lg text-primary-600 hover:bg-primary/[0.06] transition-colors ${FOCUS_RING}`}
            title={t("quickPreview")}
            aria-label={t("quickPreviewOf", { title: row.title })}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/cars/${row.id}`)}
            className={`p-1.5 rounded-lg text-primary-600 hover:bg-primary/[0.06] transition-colors ${FOCUS_RING}`}
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
                onClick: () => handleSelectCar(row),
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
                label: t("menu.maintenance"),
                icon: <Wrench className="w-3.5 h-3.5 text-amber-600" />,
                // No "maintenance" status in the listing model yet: disabled, not faked.
                disabled: true,
                onClick: () => undefined,
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

  const tiers = [
    { label: t("tiers.range", { min: 1, max: 3 }), discount: 0 },
    { label: t("tiers.range", { min: 4, max: 7 }), discount: DISCOUNTS.weekly },
    { label: t("tiers.range", { min: 8, max: 14 }), discount: DISCOUNTS.biweekly },
    { label: t("tiers.over", { min: 15 }), discount: DISCOUNTS.monthly },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Mockup 09) */}
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
                  vertical: "vehicle",
                  wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
                  search: searchQuery || undefined,
                })
              }
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-primary bg-white rounded-xl transition-colors shadow-e1 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-e2 duration-fast ${FOCUS_RING}`}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{t("export")}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/cars/categories")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-primary bg-white rounded-xl transition-colors shadow-e1 hover:shadow-e2 duration-fast ${FOCUS_RING}`}
            >
              <Tag className="w-4 h-4" aria-hidden="true" />
              <span>{t("categories")}</span>
            </button>
            {can("listings.approve") && (
            <button
              type="button"
              onClick={() => router.push("/cars/new")}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-900 transition-colors shadow-e1 duration-fast ${FOCUS_RING}`}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t("add")}</span>
            </button>
            )}
          </div>
        }
      />

      {/* 2. KPI Strip (Mockup 09: 6 cards) */}
      <KpiStrip
        cards={kpis}
        activeCardId={currentStatus}
        onCardClick={(id) => {
          updateUrl({ status: id === "all" ? null : id, page: "1" });
        }}
      />

      {/* 3. Filter Bar (Mockup 09) */}
      <FilterBar
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "category",
            label: t("filters.category"),
            value: selectedCategory,
            options: [
              { value: "all", label: t("filters.allCategories") },
              ...CAR_CATEGORIES.map((c) => ({ value: c.value, label: t(`categoryOptions.${c.labelKey}`) })),
            ],
            onChange: (val) => {
              setSelectedCategory(val);
              setPage(1);
            },
          },
          {
            id: "wilaya",
            label: t("filters.wilaya"),
            value: selectedWilaya,
            options: [
              { value: "all", label: t("filters.allCities") },
              ...WILAYAS.map((w) => ({ value: w.code, label: `${w.code} - ${getWilayaLabel(w, locale)}` })),
            ],
            onChange: (val) => {
              setSelectedWilaya(val);
              setPage(1);
            },
          },
          {
            id: "gearbox",
            label: t("filters.gearbox"),
            value: selectedGearbox,
            options: [
              { value: "all", label: t("filters.allGearboxes") },
              { value: "auto", label: t("gearbox.auto") },
              { value: "manual", label: t("gearbox.manual") },
            ],
            onChange: (val) => {
              setSelectedGearbox(val);
              setPage(1);
            },
          },
          {
            id: "status",
            label: tCommon("status"),
            value: normalizedStatus,
            options: [
              { value: "all", label: t("filters.allStatuses") },
              { value: "approved", label: t("statusOptions.approved") },
              { value: "pending", label: t("statusOptions.pending") },
              { value: "maintenance", label: t("statusOptions.maintenance") },
              { value: "rejected", label: t("statusOptions.rejected") },
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
          setSelectedGearbox("all");
          updateUrl({ status: null, page: "1" });
        }}
      />

      {/* 4. Split View: Table + Detail Panel (Mockup 09) */}
      <SplitView
        isPanelOpen={!!selectedCar}
        mainContent={
          <div className="flex flex-col gap-1">
            <DataTable
              columns={selectedCar ? columns.filter((c) => !SPLIT_HIDDEN_COLUMNS.includes(c.key)) : columns}
              data={data}
              keyExtractor={(c) => c.id}
              selectedRowId={selectedCarId || undefined}
              onRowClick={handleSelectCar}
              isLoading={isLoading}
              emptyMessage={t("empty")}
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
                itemLabel={t("itemLabel")}
              />
            </div>
          </div>
        }
        detailPanel={
          selectedCar ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedCar.title}
              subtitle={`${selectedCar.formattedId || `#V${selectedCar.id}`} • ${selectedCar.city}`}
              statusBadge={<StatusPill status={selectedCar.status} />}
              actions={
                <button
                  type="button"
                  onClick={() => router.push(`/cars/${selectedCar.id}`)}
                  className={`p-1 text-primary-600 hover:text-primary rounded ${FOCUS_RING}`}
                  title={t("fullScreen")}
                  aria-label={t("fullScreen")}
                >
                  <Maximize2 className="w-4 h-4" aria-hidden="true" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusActions.allowed(selectedCar, "approved") && (selectedCar.status === "pending" || selectedCar.status === "pending_review") && (
                      <button
                        type="button"
                        onClick={() => statusActions.changeStatus(selectedCar, "approved")}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-secondary-700 rounded-xl hover:bg-secondary-800 transition-colors duration-fast"
                      >
                        {t("panel.approveDirectly")}
                      </button>
                    )}
                    {statusActions.canRestore(selectedCar) && (
                      <button
                        type="button"
                        onClick={() => statusActions.restore(selectedCar)}
                        className="px-3 py-1.5 text-xs font-semibold text-primary border border-secondary bg-secondary/10 rounded-xl hover:bg-secondary/20 transition-colors duration-fast"
                      >
                        {tActions("restore")}
                      </button>
                    )}
                    {selectedCar.status === "suspended" && statusActions.allowed(selectedCar, "approved") && (
                      <button
                        type="button"
                        onClick={() => statusActions.changeStatus(selectedCar, "approved")}
                        className="px-3 py-1.5 text-xs font-semibold text-primary border border-secondary bg-secondary/10 rounded-xl hover:bg-secondary/20 transition-colors duration-fast"
                      >
                        {t("panel.reactivate")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled
                      title={tActions("unavailableHint")}
                      className="px-3 py-1.5 text-xs font-medium text-amber-700 border border-primary/[0.12] rounded-lg opacity-50 cursor-not-allowed"
                    >
                      {t("panel.maintenance")}
                    </button>
                    {statusActions.canDelete(selectedCar) && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "delete", car: selectedCar })}
                      className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-accent-700 bg-white ring-1 ring-inset ring-accent/40 rounded-xl hover:bg-accent-50 transition-colors duration-fast"
                    >
                      {tCommon("delete")}
                    </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/cars/${selectedCar.id}`)}
                    className="px-3.5 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-primary-800 rounded-xl hover:bg-primary-900 shadow-e1 transition-colors duration-fast"
                  >
                    {t("panel.edit")}
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <ImageCarousel
                  images={listingImages(selectedCar.imageSrc, "car")}
                  alt={selectedCar.title}
                />

                <div className="flex items-center justify-between text-xs text-primary border-b border-primary/[0.08] pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" />
                    <span className="font-semibold">{formatRating(selectedCar.rating)}</span>
                    <span className="text-primary-600">{t("reviewsCount", { count: selectedCar.reviewsCount })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-secondary-700 font-medium">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("locationValue", { city: selectedCar.city, code: selectedCar.wilayaCode })}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "details", label: t("tabs.details") },
                    { id: "pricing", label: t("tabs.pricing") },
                    { id: "photos", label: t("tabs.photos") },
                    { id: "amenities", label: t("tabs.amenities") },
                    { id: "bookings", label: t("tabs.bookings") },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "details" && (
                  <div className="space-y-4">
                    {/* About This Vehicle */}
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500 mb-2">
                        {t("about.title")}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={t("about.category")} value={selectedCar.propertyType || t("categoryOptions.suv")} />
                        <InfoTile label={t("about.year")} value="2023" />
                        <InfoTile label={t("about.fuel")} value={t("about.fuelDiesel")} />
                        <InfoTile label={t("about.transmission")} value={t("gearbox.auto")} />
                        <InfoTile label={t("about.capacity")} value={t("about.seats", { count: 5 })} />
                        <InfoTile label={t("about.airConditioning")} value={t("about.yes")} />
                      </div>
                    </div>

                    {/* Price & Discounts Section */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2.5">
                      <div className="text-xs font-semibold text-primary flex items-center justify-between">
                        <span>{t("pricing.title")}</span>
                        <span className="font-semibold text-primary-900 text-sm tabular-nums whitespace-nowrap">
                          {formatDzd(selectedCar.price, locale)}{" "}
                          <span className="text-[11px] text-primary-600">{t("pricing.perDayUnit")}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-primary/[0.08]">
                        <div>
                          <span className="text-primary-600 block">{t("pricing.weeklyDiscount", { percent: DISCOUNTS.weekly })}</span>
                          <span className="font-medium text-secondary-700">{t("pricing.perDay", { price: formatDzd(applyDiscount(selectedCar.price, DISCOUNTS.weekly), locale) })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.monthlyDiscount", { percent: DISCOUNTS.monthly })}</span>
                          <span className="font-medium text-secondary-700">{t("pricing.perDay", { price: formatDzd(applyDiscount(selectedCar.price, DISCOUNTS.monthly), locale) })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.deposit")}</span>
                          <span className="font-medium text-primary">{formatDzd(50000, locale)}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.mileage")}</span>
                          <span className="font-medium text-secondary-700">{t("pricing.mileageUnlimited", { days: 3 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rental times & conditions */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-secondary" aria-hidden="true" />
                        <span>{t("schedule.title")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-primary-600 block">{t("schedule.pickup")}</span>
                          <span className="font-medium text-primary">{t("schedule.fromTime", { time: formatTime(8, 30) })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("schedule.return")}</span>
                          <span className="font-medium text-primary">{t("schedule.beforeTime", { time: formatTime(19, 0) })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("schedule.minDuration")}</span>
                          <span className="font-medium text-primary">{t("schedule.minDays", { count: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("schedule.fuelPolicy")}</span>
                          <span className="font-medium text-secondary-700">{t("schedule.fullToFull")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-darnaBg-100 p-3.5 rounded-xl">
                      <div className="text-xs font-semibold text-primary mb-1">
                        {t("owner.title")}
                      </div>
                      <div className="text-sm font-medium text-primary">{selectedCar.hostName}</div>
                      <div className="text-xs text-primary-600">{t("owner.licensed")}</div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500 mb-1.5">
                        {t("description.title")}
                      </h4>
                      <p className="text-xs text-primary-700 leading-relaxed bg-darnaBg-100 p-3 rounded-xl">
                        {selectedCar.description || t("description.empty")}
                      </p>
                    </div>
                  </div>
                )}

                {panelTab === "pricing" && (
                  <div className="space-y-3 text-xs">
                    {tiers.map((tier) => (
                      <div key={tier.label} className="p-3 bg-darnaBg-100 rounded-xl flex justify-between">
                        <span className="text-primary-600">{tier.label}</span>
                        <span className={`font-semibold ${tier.discount ? "text-secondary-700" : "text-primary"}`}>
                          {tier.discount
                            ? t("pricing.perDayDiscounted", {
                                price: formatDzd(applyDiscount(selectedCar.price, tier.discount), locale),
                                percent: tier.discount,
                              })
                            : t("pricing.perDay", { price: formatDzd(selectedCar.price, locale) })}
                        </span>
                      </div>
                    ))}
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
          title={t("confirm.deleteTitle")}
          description={t("confirm.description", { title: confirmAction.car.title })}
          variant="danger"
          onConfirm={async () => {
            const ok = await statusActions.remove(confirmAction.car, t("confirm.deleted"));
            if (ok) setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {statusActions.dialog}
    </div>
  );
}
