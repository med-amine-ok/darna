"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { listingImageSrc, listingImages } from "@/lib/placeholders";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname, Link } from "@/navigation";
import {
  Compass,
  CheckCircle,
  Clock,
  XCircle,
  PauseCircle,
  Download,
  Plus,
  Eye,
  ExternalLink,
  MapPin,
  Star,
  ShieldCheck,
  Tag,
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
import { formatDzd, formatNumber, intlLocale } from "@/lib/utils/format";
import { applyDiscount, DISCOUNTS } from "@/lib/pricing";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Listing } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

/** Low-priority columns hidden while the split detail panel is open (ANALYSIS.md §4). */
const SPLIT_HIDDEN_COLUMNS = ["guide", "location", "category", "rating", "bookings"];

// value = filter value (unchanged), labelKey = translation key under experiences.categoryOptions
const EXPERIENCE_CATEGORIES = [
  { value: "aventure", labelKey: "adventure" },
  { value: "culture", labelKey: "culture" },
  { value: "nature", labelKey: "nature" },
  { value: "gastronomie", labelKey: "gastronomy" },
  { value: "mer", labelKey: "sea" },
] as const;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export default function ExperiencesListClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("experiences");
  const tCommon = useTranslations("common");
  const tActions = useTranslations("actions");
  const tVerticals = useTranslations("verticals");
  const tHostTypes = useTranslations("hostTypes");
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
  const selectedExpIdFromUrl = searchParams.get("selected") || null;
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
  const [selectedExpId, setSelectedExpId] = useState<string | null>(selectedExpIdFromUrl);
  const [, setIsFilterDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("overview");

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "suspend";
    exp: Listing;
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
        vertical: "experience",
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

  const selectedExp = data.find((e) => e.id === selectedExpId) || null;

  const handleSelectExp = (exp: Listing) => {
    setSelectedExpId(exp.id);
    updateUrl({ selected: exp.id });
  };

  const handleClosePanel = () => {
    setSelectedExpId(null);
    updateUrl({ selected: null });
  };

  const formatRating = (rating: number) =>
    new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);

  const formatTime = (hour: number, minute: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(
      new Date(2000, 0, 1, hour, minute)
    );

  // KPI Strip (Mockup 07: 238 Total · 46 En attente · 162 Publiées · 18 Suspendues · 12 Refusées)
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: t("kpi.total"),
      value: totalCount || 238,
      icon: <Compass className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "pending",
      label: t("kpi.pending"),
      value: statusFacets["pending"] ?? statusFacets["pending_review"] ?? 46,
      icon: <Clock className="w-5 h-5" />,
      colorVariant: "warning",
    },
    {
      id: "published",
      label: t("kpi.published"),
      value: statusFacets["published"] ?? statusFacets["approved"] ?? 162,
      icon: <CheckCircle className="w-5 h-5" />,
      colorVariant: "success",
    },
    {
      id: "suspended",
      label: t("kpi.suspended"),
      value: statusFacets["suspended"] ?? 18,
      icon: <PauseCircle className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "refused",
      label: t("kpi.refused"),
      value: statusFacets["refused"] ?? statusFacets["rejected"] ?? 12,
      icon: <XCircle className="w-5 h-5" />,
      colorVariant: "danger",
    },
  ];

  // Table columns (Mockup 07)
  const columns: Column<Listing>[] = [
    {
      key: "exp",
      header: t("columns.experience"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-tertiary-100 shrink-0">
            <Image
              src={listingImageSrc(row.imageSrc?.[0], "experience")}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 max-w-[220px]">
            <button
              type="button"
              className="block max-w-full font-semibold text-primary-900 truncate text-sm text-start hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectExp(row);
              }}
            >
              {row.title}
            </button>
            <div className="text-xs text-primary-600 flex items-center gap-1.5 mt-0.5 min-w-0 whitespace-nowrap">
              <span>{row.formattedId || `#EXP${row.id.replace("lst_", "").padStart(4, "0")}`}</span>
              <span aria-hidden="true">•</span>
              <span className="capitalize truncate">{row.propertyType}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "guide",
      header: t("columns.guide"),
      render: (row) => (
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="w-7 h-7 shrink-0 rounded-full bg-darnaBg-300 flex items-center justify-center font-semibold text-xs text-primary-800">
            {row.hostName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-primary truncate">{row.hostName}</div>
            <div className="text-[11px] text-primary-600">{tHostTypes(row.hostType)}</div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: t("columns.location"),
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-primary-800 whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" aria-hidden="true" />
          <span className="truncate">{t("locationValue", { city: row.city, code: row.wilayaCode })}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: t("columns.category"),
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-darnaBg-300/70 text-primary-800 whitespace-nowrap">
          <Tag className="w-3 h-3 text-secondary" aria-hidden="true" />
          <span>{row.propertyType || t("categoryOptions.adventure")}</span>
        </span>
      ),
    },
    {
      key: "price",
      header: t("columns.price"),
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
      header: t("columns.rating"),
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-primary-800 whitespace-nowrap">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
          <span className="font-medium">{formatRating(row.rating)}</span>
          <span className="text-primary-600">{t("reviewsCount", { count: row.reviewsCount })}</span>
        </div>
      ),
    },
    {
      key: "bookings",
      header: t("columns.bookings"),
      render: (row) => (
        <span className="text-xs font-medium text-primary">{formatNumber(row.bookingsCount, locale)}</span>
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
            onClick={() => handleSelectExp(row)}
            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            title={t("quickPreview")}
            aria-label={t("quickPreviewOf", { title: row.title })}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/experiences/${row.id}`)}
            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
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
                onClick: () => handleSelectExp(row),
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
      {/* 1. Page Header (Mockup 07: Exporter, Catégories, + Ajouter une expérience) */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          ...(statusActions.canExport
            ? [{
                label: t("export"),
                icon: <Download className="w-4 h-4" />,
                onClick: () =>
                  statusActions.exportCsv({
                    status: currentStatus,
                    vertical: "experience",
                    wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
                    search: searchQuery || undefined,
                  }),
                variant: "outline" as const,
              }]
            : []),
          {
            label: t("categories"),
            icon: <Tag className="w-4 h-4" />,
            onClick: () => router.push("/experiences/categories"),
            variant: "outline",
          },
          ...(can("listings.approve")
            ? [
                {
                  label: t("add"),
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => router.push("/experiences/new"),
                  variant: "primary" as const,
                },
              ]
            : []),
        ]}
      />

      {/* 2. KPI Strip (Mockup 07) */}
      <KpiStrip
        cards={kpis}
        activeCardId={normalizedStatus}
        onCardClick={(id) => {
          updateUrl({ status: id === "all" ? null : id, page: "1" });
        }}
      />

      {/* 3. Filter Bar (Mockup 07) */}
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
            label: t("filters.wilaya"),
            value: selectedWilaya,
            options: [
              { value: "all", label: t("filters.allWilayas") },
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
              ...EXPERIENCE_CATEGORIES.map((c) => ({ value: c.value, label: t(`categoryOptions.${c.labelKey}`) })),
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
              { value: "pending", label: t("statusOptions.pending") },
              { value: "published", label: t("statusOptions.published") },
              { value: "suspended", label: t("statusOptions.suspended") },
              { value: "refused", label: t("statusOptions.refused") },
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

      {/* 4. Split View: Table + Detail Panel (Mockup 07) */}
      <SplitView
        isPanelOpen={!!selectedExp}
        mainContent={
          <div className="flex flex-col gap-1">
            <DataTable
              columns={selectedExp ? columns.filter((c) => !SPLIT_HIDDEN_COLUMNS.includes(c.key)) : columns}
              data={data}
              keyExtractor={(e) => e.id}
              selectedRowId={selectedExpId || undefined}
              onRowClick={handleSelectExp}
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
          selectedExp ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedExp.title}
              subtitle={`${selectedExp.formattedId || `#EXP${selectedExp.id}`} • ${selectedExp.city}`}
              statusBadge={<StatusPill status={selectedExp.status} />}
              actions={
                <button
                  type="button"
                  onClick={() => router.push(`/experiences/${selectedExp.id}`)}
                  className="p-1 text-primary-600 hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  title={t("fullScreen")}
                  aria-label={t("fullScreen")}
                >
                  <Maximize2 className="w-4 h-4" aria-hidden="true" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedExp.status === "approved" || selectedExp.status === "published") ? (statusActions.allowed(selectedExp, "suspended") &&
                      <button
                        type="button"
                        onClick={() => statusActions.changeStatus(selectedExp, "suspended")}
                        className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-amber-800 bg-white shadow-e1 rounded-xl hover:bg-amber-50 transition-colors duration-fast"
                      >
                        {t("panel.suspend")}
                      </button>
                    ) : (selectedExp.status === "pending_review" || selectedExp.status === "pending") ? (
                      <>
                        {can("listings.approve") && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              unwrap(await approveListing(selectedExp.id));
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
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-secondary-700 hover:bg-secondary-800 rounded-xl shadow-e1 flex items-center gap-1.5 transition-colors duration-fast"
                        >
                          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t("panel.approveDirectly")}</span>
                        </button>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/experiences/${selectedExp.id}/review`)}
                          className="px-3 py-1.5 text-xs font-semibold text-primary rounded-xl bg-white shadow-e1 hover:shadow-e2 transition duration-fast"
                        >
                          {t("panel.review")}
                        </button>
                      </>
                    ) : (selectedExp.status === "suspended" || selectedExp.status === "rejected" || selectedExp.status === "refused") ? (statusActions.allowed(selectedExp, selectedExp.status === "suspended" ? "approved" : "pending_review") &&
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            unwrap(await updateListingStatus(selectedExp.id, selectedExp.status === "suspended" ? "approved" : "pending_review"));
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
                        className="px-3 py-1.5 text-xs font-semibold text-primary rounded-xl flex items-center gap-1.5 transition-colors bg-white shadow-e1 hover:shadow-e2 duration-fast"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                        <span>{t("panel.cancelSuspension")}</span>
                      </button>
                    ) : null}
                    {statusActions.canRestore(selectedExp) && (
                      <button
                        type="button"
                        onClick={() => statusActions.restore(selectedExp)}
                        className="px-3 py-1.5 text-xs font-semibold text-primary rounded-xl transition-colors bg-white shadow-e1 hover:shadow-e2 duration-fast"
                      >
                        {tActions("restore")}
                      </button>
                    )}
                    {statusActions.canDelete(selectedExp) && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "delete", exp: selectedExp })}
                      className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-accent-700 bg-white ring-1 ring-inset ring-accent/40 rounded-xl hover:bg-accent-50 transition-colors duration-fast"
                    >
                      {tCommon("delete")}
                    </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/experiences/${selectedExp.id}`)}
                    className="px-3.5 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-primary-800 rounded-xl hover:bg-primary-900 shadow-e1 transition-colors duration-fast"
                  >
                    {tCommon("edit")}
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <ImageCarousel
                  images={listingImages(selectedExp.imageSrc, "experience")}
                  alt={selectedExp.title}
                />

                <div className="flex items-center justify-between text-xs text-primary border-b border-primary/[0.08] pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" />
                    <span className="font-semibold">{formatRating(selectedExp.rating)}</span>
                    <span className="text-primary-600">{t("reviewsCount", { count: selectedExp.reviewsCount })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-secondary-700 font-medium">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("locationValue", { city: selectedExp.city, code: selectedExp.wilayaCode })}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "overview", label: t("tabs.overview") },
                    { id: "info", label: t("tabs.info") },
                    { id: "photos", label: t("tabs.photos") },
                    { id: "calendar", label: t("tabs.calendar") },
                    { id: "bookings", label: t("tabs.bookings") },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "overview" && (
                  <div className="space-y-4">
                    {/* About Section */}
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500 mb-2">
                        {t("about.title")}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={t("about.category")} value={selectedExp.category ? tVerticals(selectedExp.category) : t("categoryOptions.culture")} />
                        <InfoTile label={t("about.maxGroup")} value={t("about.people", { count: selectedExp.guestCapacity })} />
                        <InfoTile label={t("about.difficulty")} value={t("about.difficultyModerate")} />
                        <InfoTile label={t("about.languages")} value="FR, AR, EN" />
                      </div>
                    </div>

                    {/* Price & Discounts Section */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2.5">
                      <div className="text-xs font-semibold text-primary flex items-center justify-between">
                        <span>{t("pricing.title")}</span>
                        <span className="font-semibold text-primary-900 text-sm tabular-nums whitespace-nowrap">
                          {formatDzd(selectedExp.price, locale)}{" "}
                          <span className="text-[11px] text-primary-600">{t("pricing.perPerson")}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-primary/[0.08]">
                        <div>
                          <span className="text-primary-600 block">{t("pricing.groupDiscount")}</span>
                          <span className="font-medium text-secondary-700">
                            {t("pricing.discountValue", { percent: DISCOUNTS.group, price: formatDzd(applyDiscount(selectedExp.price, DISCOUNTS.group), locale) })}
                          </span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.commission")}</span>
                          <span className="font-medium text-secondary-700">{t("pricing.commissionIncluded", { rate: 12 })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.cancellation")}</span>
                          <span className="font-medium text-primary">{t("pricing.cancellationFlexible", { hours: 24 })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("pricing.prepayment")}</span>
                          <span className="font-medium text-primary">{t("pricing.prepaymentSecure")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Schedule Section */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-secondary" aria-hidden="true" />
                        <span>{t("schedule.title")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-primary-600 block">{t("schedule.totalDuration")}</span>
                          <span className="font-medium text-primary">{t("schedule.hours", { count: 3 })}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("schedule.departureTimes")}</span>
                          <span className="font-medium text-primary">{formatTime(9, 0)} / {formatTime(14, 30)}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("schedule.operatingDays")}</span>
                          <span className="font-medium text-primary">{t("schedule.everyDay")}</span>
                        </div>
                        <div>
                          <span className="text-primary-600 block">{t("schedule.advanceNotice")}</span>
                          <span className="font-medium text-secondary-700">{t("schedule.hoursInAdvance", { count: 24 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Host Card */}
                    <div className="bg-darnaBg-100 p-3.5 rounded-xl">
                      <div className="text-xs font-semibold text-primary mb-2 flex items-center justify-between">
                        <span>{t("host.title")}</span>
                        <Link
                          href={`/hosts/${selectedExp.hostId}`}
                          className="text-[11px] text-secondary-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                        >
                          {t("host.viewProfile")}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <div aria-hidden="true" className="w-10 h-10 rounded-full bg-darnaBg-400 flex items-center justify-center font-semibold text-sm text-primary">
                          {selectedExp.hostName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-primary">{selectedExp.hostName}</div>
                          <div className="text-xs text-primary-600 flex items-center gap-1.5">
                            <span>{tHostTypes(selectedExp.hostType)}</span>
                            <span aria-hidden="true">•</span>
                            <span className="text-secondary-700 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" aria-hidden="true" /> {t("host.certified")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description Section */}
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500 mb-1.5">
                        {t("description.title")}
                      </h4>
                      <p className="text-xs text-primary-700 leading-relaxed bg-darnaBg-100 p-3 rounded-xl">
                        {selectedExp.description || t("description.empty")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </DetailPanel>
          ) : null
        }
      />

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          title={
            confirmAction.type === "delete"
              ? t("confirm.deleteTitle")
              : t("confirm.suspendTitle")
          }
          description={t("confirm.description", { title: confirmAction.exp.title })}
          confirmLabel={confirmAction.type === "delete" ? t("confirm.deleteLabel") : tCommon("confirm")}
          variant={confirmAction.type === "delete" ? "danger" : "primary"}
          onConfirm={async () => {
            const ok = await statusActions.remove(confirmAction.exp, t("confirm.deleted"));
            if (ok) setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {statusActions.dialog}
    </div>
  );
}
