"use client";

import React, { useId, useState, useTransition } from "react";
import Image from "next/image";
import { listingImageSrc, type PlaceholderKind } from "@/lib/placeholders";
import { useLocale, useTranslations } from "next-intl";
import {
  Home,
  Building,
  Compass,
  Truck,
  Sparkles,
  Eye,
  Table as TableIcon,
  LayoutGrid,
  Map as MapIcon,
  ShieldCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/data-table/FilterBar";
import { FilterDrawer } from "@/components/data-table/FilterDrawer";
import { ActiveFilterChips, ActiveFilterItem } from "@/components/data-table/ActiveFilterChips";
import { BulkBar, type BulkAction } from "@/components/data-table/BulkBar";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useToast } from "@/components/ui/Toast";
import { Listing, PaginatedResult } from "@/lib/types";
import { WILAYAS, getWilayaLabel, getWilayaName } from "@/lib/utils/wilayas";
import { formatDzd } from "@/lib/utils/format";
import {
  listListings,
  approveListing,
  requestChangesListing,
  featureListing,
  deleteListing,
  exportListings,
} from "@/lib/actions/listings";
import { useListingStatusActions } from "@/components/features/listings/useListingStatusActions";
import { downloadCsv } from "@/lib/utils/download";
import { applyDiscount, DISCOUNTS } from "@/lib/pricing";
import { canTransitionListing } from "@/lib/domain/transitions";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import ListingsMapView from "@/components/features/listings/ListingsMapView";
const placeholderKind = (category?: string): PlaceholderKind =>
  category === "vehicle" ? "car" : category === "experience" ? "experience" : category === "trip" ? "trip" : "stay";

export interface ListingsClientProps {
  initialData: PaginatedResult<Listing>;
  initialStatus: string;
  initialVertical: string;
}

type FetchOverrides = {
  status?: string;
  vertical?: string;
  search?: string;
  selectedWilayas?: string[];
  page?: number;
  pageSize?: number;
};

type ChecklistKey =
  | "photosOk"
  | "locationAccurate"
  | "priceReasonable"
  | "policiesPresent"
  | "descriptionAppropriate";

const CHECKLIST_KEYS: ChecklistKey[] = [
  "photosOk",
  "locationAccurate",
  "priceReasonable",
  "policiesPresent",
  "descriptionAppropriate",
];

const HOST_TYPE_KEYS = ["individual", "agency", "hotel", "hostel"];

function errorMessage(e: unknown): string | undefined {
  return e instanceof Error && e.message ? e.message : undefined;
}

export default function ListingsClient({
  initialData,
  initialStatus,
  initialVertical,
}: ListingsClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("listings");
  const tCommon = useTranslations("common");
  const tVerticals = useTranslations("verticals");
  const tHostTypes = useTranslations("hostTypes");
  const tActions = useTranslations("actions");
  const { success, error, info } = useToast();
  const can = useCan();
  const [isPending, startTransition] = useTransition();
  const revisionId = useId();

  // State
  const [data, setData] = useState<PaginatedResult<Listing>>(initialData);
  const [status, setStatus] = useState<string>(initialStatus);
  const [vertical, setVertical] = useState<string>(initialVertical);
  const [search, setSearch] = useState("");
  const [selectedWilayas, setSelectedWilayas] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [viewMode, setViewMode] = useState<"table" | "grid" | "map">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawers & Modals
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);

  // Moderation checklist state for detail review
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    photosOk: true,
    locationAccurate: true,
    priceReasonable: true,
    policiesPresent: true,
    descriptionAppropriate: true,
  });

  const [changesNote, setChangesNote] = useState("");
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [changesNoteError, setChangesNoteError] = useState(false);

  // Dialogs
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: "danger" | "warning" | "primary";
    confirmLabel?: string;
    requireTypedConfirmation?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const hostTypeLabel = (type: string) => (HOST_TYPE_KEYS.includes(type) ? tHostTypes(type) : type);
  const verticalLabel = (v: string) => (tVerticals.has(v) ? tVerticals(v) : v);

  const fetchData = async (overrideParams: FetchOverrides = {}) => {
    startTransition(async () => {
      let res;
      try {
        res = unwrap(await listListings({
        status: overrideParams.status ?? status,
        vertical: overrideParams.vertical ?? vertical,
        search: overrideParams.search ?? search,
        wilayaCode: overrideParams.selectedWilayas ?? (selectedWilayas.length > 0 ? selectedWilayas : undefined),
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < 100000 ? priceRange[1] : undefined,
        page: overrideParams.page ?? currentPage,
        pageSize: overrideParams.pageSize ?? pageSize,
      }));
      } catch (e: unknown) {
        error(errorMessage(e) || t("toasts.loadFailed"));
        return;
      }
      setData(res);
    });
  };

  const handleStatusTabChange = (newStatus: string) => {
    setStatus(newStatus);
    setCurrentPage(1);
    fetchData({ status: newStatus, page: 1 });
  };

  const handleVerticalChange = (newVert: string) => {
    setVertical(newVert);
    setCurrentPage(1);
    fetchData({ vertical: newVert, page: 1 });
  };

  const handleSearchChange = (q: string) => {
    setSearch(q);
    fetchData({ search: q, page: 1 });
  };

  // Active filter chips
  const activeChips: ActiveFilterItem[] = [];
  if (vertical !== "all") {
    activeChips.push({ key: "vertical", label: t("vertical"), valueDisplay: verticalLabel(vertical) });
  }
  if (selectedWilayas.length > 0) {
    activeChips.push({
      key: "wilayas",
      label: t("filters.wilayas"),
      valueDisplay: t("filters.wilayasSelected", { count: selectedWilayas.length }),
    });
  }

  const handleRemoveChip = (key: string) => {
    if (key === "vertical") {
      setVertical("all");
      fetchData({ vertical: "all" });
    } else if (key === "wilayas") {
      setSelectedWilayas([]);
      fetchData({ selectedWilayas: [] });
    }
  };

  const handleClearAllFilters = () => {
    setStatus("all");
    setVertical("all");
    setSelectedWilayas([]);
    setSearch("");
    setPriceRange([0, 100000]);
    fetchData({
      status: "all",
      vertical: "all",
      selectedWilayas: [],
      search: "",
      page: 1,
    });
  };

  // Actions
  const handleApprove = (listing: Listing) => {
    setConfirmState({
      isOpen: true,
      title: t("approveAction"),
      description: t("dialogs.approveDescription", { title: listing.title }),
      variant: "primary",
      confirmLabel: t("approveAction"),
      action: async () => {
        try {
          const updated = unwrap(await approveListing(listing.id));
          success(t("toasts.approved", { title: listing.title }));
          setDetailListing(updated);
          fetchData();
        } catch (e: unknown) {
          error(errorMessage(e) || t("toasts.approveFailed"));
        }
      },
    });
  };

  const statusActions = useListingStatusActions(() => {
    setDetailListing(null);
    fetchData();
  });

  const handleRequestChanges = async (listing: Listing) => {
    if (changesNote.trim().length < 3) {
      setChangesNoteError(true);
      return;
    }
    try {
      const updated = unwrap(await requestChangesListing(listing.id, changesNote));
      info(t("toasts.changesRequested", { title: listing.title }));
      setDetailListing(updated);
      setIsRequestingChanges(false);
      setChangesNote("");
      setChangesNoteError(false);
      fetchData();
    } catch (e: unknown) {
      error(errorMessage(e) || t("toasts.requestChangesFailed"));
    }
  };

  const handleToggleFeature = async (listing: Listing) => {
    try {
      const updated = unwrap(await featureListing(listing.id, !listing.isFeatured));
      success(updated.isFeatured ? t("toasts.featured") : t("toasts.unfeatured"));
      setDetailListing(updated);
      fetchData();
    } catch (e: unknown) {
      error(errorMessage(e) || t("toasts.featureFailed"));
    }
  };

  const handleDelete = (listing: Listing) => {
    setConfirmState({
      isOpen: true,
      title: t("dialogs.deleteTitle"),
      description: t("dialogs.deleteDescription", { title: listing.title }),
      variant: "danger",
      confirmLabel: t("dialogs.deleteConfirm"),
      requireTypedConfirmation: listing.title,
      action: async () => {
        try {
          unwrap(await deleteListing(listing.id));
          info(t("toasts.deleted", { title: listing.title }));
          setDetailListing(null);
          fetchData();
        } catch (e: unknown) {
          error(errorMessage(e) || t("toasts.deleteFailed"));
        }
      },
    });
  };

  // Full filtered dataset (all pages), built + audited on the server.
  const handleExportCsv = async () => {
    try {
      const res = unwrap(await exportListings({
        status,
        vertical,
        search,
        wilayaCode: selectedWilayas.length > 0 ? selectedWilayas : undefined,
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < 100000 ? priceRange[1] : undefined,
      }));
      downloadCsv(res.filename, res.csv);
      success(tActions("exportStarted"), tActions("exportRows", { count: res.rowCount }));
    } catch (e: unknown) {
      error(tActions("exportFailed"), errorMessage(e));
    }
  };

  const closeDetail = () => {
    setDetailListing(null);
    setIsRequestingChanges(false);
    setChangesNoteError(false);
  };

  const columns: Column<Listing>[] = [
    {
      key: "title",
      header: t("propertyTitle"),
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-tertiary-100 shrink-0">
            <Image
              src={listingImageSrc(l.imageSrc[0], placeholderKind(l.category))}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 max-w-[300px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailListing(l);
                }}
                className="font-semibold text-primary-900 truncate leading-tight block text-start hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                {l.title}
              </button>
              {l.isFeatured && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md whitespace-nowrap">
                  {t("featuredBadge")}
                </span>
              )}
            </div>
            <span className="block text-xs text-primary-600 truncate leading-snug">
              {t("byHost", { host: l.hostName, type: hostTypeLabel(l.hostType) })}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "wilayaCode",
      header: t("columns.wilaya"),
      render: (l) => (
        <span className="font-medium text-primary-700 whitespace-nowrap">
          {getWilayaName(l.wilayaCode, locale)}
        </span>
      ),
    },
    {
      key: "price",
      header: t("priceDzd"),
      align: "right",
      sortable: true,
      render: (l) => (
        <span className="font-semibold text-primary-900 tabular-nums whitespace-nowrap">
          {formatDzd(l.price, locale)}
        </span>
      ),
    },
    {
      key: "status",
      header: tCommon("status"),
      render: (l) => (
        <StatusPill
          status={l.status}
          size="sm"
        />
      ),
    },
    {
      key: "rating",
      header: t("columns.rating"),
      align: "center",
      sortable: true,
      render: (l) => (
        <span className="font-semibold text-amber-700 tabular-nums whitespace-nowrap">
          <span aria-hidden="true">★ </span>
          {l.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "bookingsCount",
      header: t("columns.bookings"),
      align: "center",
      sortable: true,
      render: (l) => <span className="font-semibold text-primary-800 tabular-nums">{l.bookingsCount}</span>,
    },
    {
      key: "actions",
      header: tCommon("actions"),
      align: "right",
      render: (l) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {l.status === "pending_review" && can("listings.approve") ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleApprove(l)}
              className="text-xs py-1 px-2.5 whitespace-nowrap"
            >
              {t("approveAction")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailListing(l)}
              className="text-xs py-1 px-2 text-primary-700 whitespace-nowrap"
              leftIcon={<Eye className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              {tCommon("view")}
            </Button>
          )}

          <DropdownMenu
            items={[
              {
                label: tCommon("inspect"),
                onClick: () => setDetailListing(l),
              },
              {
                label: l.isFeatured ? t("menu.unfeature") : t("menu.feature"),
                onClick: () => handleToggleFeature(l),
                disabled: !can("listings.feature"),
              },
              {
                label: t("menu.approve"),
                onClick: () => handleApprove(l),
                disabled: !statusActions.allowed(l, "approved"),
              },
              {
                label: t("menu.markPending"),
                onClick: () => statusActions.changeStatus(l, "pending_review"),
                disabled: !statusActions.allowed(l, "pending_review"),
              },
              {
                label: t("menu.suspend"),
                onClick: () => statusActions.changeStatus(l, "suspended"),
                variant: "danger",
                disabled: !statusActions.allowed(l, "suspended"),
              },
              {
                label: t("menu.reject"),
                onClick: () => statusActions.changeStatus(l, "rejected"),
                variant: "danger",
                disabled: !statusActions.allowed(l, "rejected"),
              },
              {
                label: t("menu.delete"),
                onClick: () => handleDelete(l),
                variant: "danger",
                disabled: !statusActions.canDelete(l),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const viewModes = [
    { id: "table" as const, label: t("tableView"), icon: <TableIcon className="w-4 h-4" aria-hidden="true" /> },
    { id: "grid" as const, label: t("gridView"), icon: <LayoutGrid className="w-4 h-4" aria-hidden="true" /> },
    { id: "map" as const, label: t("mapView"), icon: <MapIcon className="w-4 h-4" aria-hidden="true" /> },
  ];

  const checklistLabels: Record<ChecklistKey, string> = {
    photosOk: t("checklist.photosOk"),
    locationAccurate: t("checklist.locationAccurate"),
    priceReasonable: t("checklist.priceReasonable"),
    policiesPresent: t("checklist.policiesPresent"),
    descriptionAppropriate: t("checklist.descriptionAppropriate"),
  };

  const revisionErrorId = `${revisionId}-error`;

  return (
    <div className="space-y-6 text-start">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-heading text-primary-900">
            {t("title")}
          </h1>
          <p className="text-meta text-primary-600 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* View Switchers */}
        <div
          role="group"
          aria-label={t("viewModeLabel")}
          className="flex items-center gap-1 bg-white p-1 rounded-2xl shadow-e1 self-start sm:self-auto"
        >
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              aria-pressed={viewMode === mode.id}
              aria-label={mode.label}
              title={mode.label}
              className={`p-1.5 rounded-xl text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                viewMode === mode.id ? "bg-primary text-white shadow-2xs" : "text-primary-600 hover:text-primary"
              }`}
            >
              {mode.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Top Status Tabs */}
      <Tabs
        tabs={[
          { id: "all", label: t("allTab"), count: data.facets?.status?.all },
          { id: "pending_review", label: t("pendingTab"), count: data.facets?.status?.pending_review },
          { id: "approved", label: t("approvedTab"), count: data.facets?.status?.approved },
          { id: "changes_requested", label: t("changesTab"), count: data.facets?.status?.changes_requested },
          { id: "rejected", label: t("rejectedTab"), count: data.facets?.status?.rejected },
          { id: "suspended", label: t("suspendedTab"), count: data.facets?.status?.suspended },
        ]}
        activeTab={status}
        onChange={handleStatusTabChange}
      />

      {/* Secondary Vertical Segmented Control */}
      <div
        role="group"
        aria-label={t("vertical")}
        className="flex items-center gap-1.5 overflow-x-auto darna-admin-scrollbar py-1 text-xs"
      >
        {[
          { id: "all", label: tCommon("all") },
          { id: "home", label: tVerticals("home"), icon: <Home className="w-3.5 h-3.5" aria-hidden="true" /> },
          { id: "hotel", label: tVerticals("hotel"), icon: <Building className="w-3.5 h-3.5" aria-hidden="true" /> },
          { id: "experience", label: tVerticals("experience"), icon: <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> },
          { id: "vehicle", label: tVerticals("vehicle"), icon: <Truck className="w-3.5 h-3.5" aria-hidden="true" /> },
          { id: "trip", label: tVerticals("trip"), icon: <Compass className="w-3.5 h-3.5" aria-hidden="true" /> },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => handleVerticalChange(v.id)}
            aria-pressed={vertical === v.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
              vertical === v.id
                ? "bg-secondary-700 text-white shadow-xs"
                : "bg-white border border-tertiary/70 text-primary-700 hover:bg-darnaBg"
            }`}
          >
            {v.icon}
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("searchPlaceholder")}
        activeFilterCount={activeChips.length}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        totalResults={data.total}
        resultsLabel={t("allTab")}
        onExport={can("reports.export") ? handleExportCsv : undefined}
      />

      {/* Active Filter Chips */}
      <ActiveFilterChips
        filters={activeChips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAllFilters}
      />

      {/* Render Active View */}
      {viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={data.rows}
          keyExtractor={(l) => l.id}
          selectedIds={selectedIds}
          onSelectRow={(id) =>
            setSelectedIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            )
          }
          onSelectAll={() =>
            setSelectedIds((prev) =>
              prev.length === data.rows.length ? [] : data.rows.map((l) => l.id)
            )
          }
          isAllSelected={selectedIds.length > 0 && selectedIds.length === data.rows.length}
          isLoading={isPending}
          onRowClick={(l) => setDetailListing(l)}
        />
      ) : viewMode === "grid" ? (
        /* Cards Grid View */
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {data.rows.map((listing) => (
            <li key={listing.id}>
              <button
                type="button"
                onClick={() => setDetailListing(listing)}
                aria-label={t("grid.openLabel", { title: listing.title })}
                className="group w-full h-full text-start rounded-2xl bg-white shadow-e1 overflow-hidden hover:shadow-e2 transition cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                <span className="block w-full">
                  <span className="relative block w-full h-44 bg-neutral-100 overflow-hidden">
                    <Image
                      src={listingImageSrc(listing.imageSrc[0], placeholderKind(listing.category))}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 start-2.5">
                      <StatusPill
                        status={listing.status}
                        variant={listing.status === "approved" ? "success" : "warning"}
                        size="sm"
                      />
                    </span>
                    <span className="absolute bottom-2.5 end-2.5 tabular-nums font-semibold text-xs bg-primary-950/75 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {formatDzd(listing.price, locale)}
                    </span>
                  </span>

                  <span className="block p-4 space-y-1.5">
                    <span className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-secondary-700">{verticalLabel(listing.category)}</span>
                      <span className="text-amber-700 font-semibold">
                        <span aria-hidden="true">★ </span>
                        {listing.rating.toFixed(1)}
                      </span>
                    </span>
                    <span className="block text-sm font-semibold text-primary line-clamp-2 leading-tight">
                      {listing.title}
                    </span>
                    <span className="block text-[11px] text-primary-600">
                      {t("cityHost", { city: listing.city, host: listing.hostName })}
                    </span>
                  </span>
                </span>

                <span className="w-full p-3 px-4 border-t border-primary/[0.08] flex items-center justify-between text-xs bg-darnaBg/30">
                  <span className="text-primary-600 font-medium">{t("grid.bookings", { count: listing.bookingsCount })}</span>
                  <span className="font-semibold text-secondary-700 group-hover:underline inline-flex items-center gap-1">
                    {t("grid.moderate")}
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        /* Interactive Map View */
        <ListingsMapView
          listings={data.rows}
          onSelectListing={(l) => setDetailListing(l)}
        />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        totalItems={data.total}
        pageSize={pageSize}
        itemLabel={t("itemLabel")}
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

      {/* Floating Bulk Bar */}
      <BulkBar
        selectedCount={selectedIds.length}
        totalFilteredCount={data.total}
        onClearSelection={() => setSelectedIds([])}
        actions={([
          {
            id: "bulk_approve_listings",
            label: t("bulk.approve"),
            variant: "secondary",
            onClick: () => {
              setConfirmState({
                isOpen: true,
                title: t("bulk.approveTitle", { count: selectedIds.length }),
                description: t("bulk.approveDescription"),
                variant: "primary",
                confirmLabel: t("bulk.approve"),
                action: async () => {
                  try {
                    for (const id of selectedIds) {
                      const row = data.rows.find((r) => r.id === id);
                      if (row && !canTransitionListing(row.status, "approved")) continue;
                      unwrap(await approveListing(id));
                    }
                  } catch (e: unknown) {
                    error(errorMessage(e) || t("bulk.approveFailed"));
                    fetchData();
                    return;
                  }
                  success(t("bulk.approved", { count: selectedIds.length }));
                  setSelectedIds([]);
                  fetchData();
                },
              });
            },
          },
          {
            id: "bulk_export_listings",
            label: t("bulk.export"),
            variant: "outline",
            onClick: handleExportCsv,
          },
        ] as BulkAction[])
          .filter((a) => a.id !== "bulk_approve_listings" || can("listings.approve"))
          .filter((a) => a.id !== "bulk_export_listings" || can("reports.export"))}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        activeFilterCount={activeChips.length}
        onReset={handleClearAllFilters}
        onApply={() => fetchData({ page: 1 })}
      >
        <MultiSelect
          label={t("columns.wilaya")}
          placeholder={t("filters.wilayaPlaceholder")}
          options={WILAYAS.map((w) => ({
            value: w.code,
            label: getWilayaLabel(w, locale),
          }))}
          selectedValues={selectedWilayas}
          onChange={setSelectedWilayas}
        />

        <RangeSlider
          label={t("filters.priceRange")}
          min={0}
          max={100000}
          step={2500}
          value={priceRange}
          onChange={setPriceRange}
        />
      </FilterDrawer>

      {/* Listing Detail & Moderation Drawer */}
      {detailListing && (
        <Drawer
          isOpen={!!detailListing}
          onClose={closeDetail}
          size="lg"
          title={detailListing.title}
          subtitle={t("detail.subtitle", {
            type: detailListing.propertyType,
            city: detailListing.city,
            id: detailListing.id,
          })}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={closeDetail}>
                {tCommon("close")}
              </Button>
              {detailListing.status === "pending_review" && can("listings.approve") && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRequestingChanges(true)}
                    className="text-amber-800"
                  >
                    {t("requestChanges")}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(detailListing)}
                  >
                    {t("approveAction")}
                  </Button>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-5 text-xs text-start">
            {/* Gallery Lightbox Preview */}
            <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-neutral-100 border border-primary/[0.08]">
              <Image
                src={listingImageSrc(detailListing.imageSrc[0], placeholderKind(detailListing.category))}
                alt={detailListing.title}
                fill
                sizes="(min-width: 768px) 640px, 100vw"
                className="object-cover"
              />
              <span className="absolute top-3 start-3">
                <StatusPill
                  status={detailListing.status}
                  variant={detailListing.status === "approved" ? "success" : "warning"}
                  size="sm"
                />
              </span>
            </div>

            {/* Moderation Checklist */}
            <fieldset className="p-4 rounded-2xl bg-darnaBg/60 border border-primary/[0.08] space-y-2.5">
              <legend className="sr-only">{t("moderationChecklist")}</legend>
              <h4 aria-hidden="true" className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-secondary-700" aria-hidden="true" />
                {t("moderationChecklist")}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {CHECKLIST_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-white cursor-pointer shadow-e1"
                  >
                    <input
                      type="checkbox"
                      checked={checklist[key]}
                      onChange={(e) =>
                        setChecklist({ ...checklist, [key]: e.target.checked })
                      }
                      className="rounded text-secondary focus:ring-secondary"
                    />
                    <span className="text-[11px] font-medium text-primary">{checklistLabels[key]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Price Sanity Hint vs Wilaya Median */}
            <div className="p-3.5 rounded-2xl bg-white flex items-center justify-between text-xs shadow-e1">
              <div>
                <span className="text-primary-600 block text-[11px]">{t("detail.nightlyPrice")}</span>
                <span className="font-semibold tabular-nums text-primary text-sm">
                  {formatDzd(detailListing.price, locale)}
                </span>
              </div>
              <div className="text-end">
                <span className="text-primary-600 block text-[11px]">{t("detail.medianBenchmark")}</span>
                <span className="font-semibold text-secondary-700 text-xs">
                  {t("detail.medianValue", { amount: formatDzd(16500, locale) })}
                </span>
              </div>
            </div>

            {/* Price & Discounts Section */}
            <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-primary block">
                {t("detail.pricingTitle")}
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.commission")}</span>
                  <span className="font-semibold text-secondary-700">{t("detail.commissionValue", { rate: 12 })}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.weeklyDiscount")}</span>
                  <span className="font-semibold text-secondary-700">
                    {t("detail.weeklyDiscountValue", {
                      rate: DISCOUNTS.weekly,
                      amount: formatDzd(applyDiscount(detailListing.price, DISCOUNTS.weekly, 7), locale),
                    })}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.cleaningFee")}</span>
                  <span className="font-semibold text-primary">{formatDzd(3500, locale)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.deposit")}</span>
                  <span className="font-semibold text-primary">{formatDzd(20000, locale)}</span>
                </div>
              </div>
            </div>

            {/* Time & Schedule Section */}
            <div className="bg-darnaBg-100 p-3.5 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-secondary-700" aria-hidden="true" />
                <span>{t("detail.timesTitle")}</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.checkIn")}</span>
                  <span className="font-medium text-primary">{t("detail.checkInValue", { time: "15:00" })}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.checkOut")}</span>
                  <span className="font-medium text-primary">{t("detail.checkOutValue", { time: "11:00" })}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.minStay")}</span>
                  <span className="font-medium text-primary">{t("detail.nights", { count: 2 })}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-darnaBg-100">
                  <span className="text-primary-600 block text-[11px]">{t("detail.cancellation")}</span>
                  <span className="font-medium text-secondary-700">{t("detail.cancellationValue", { hours: 48 })}</span>
                </div>
              </div>
            </div>

            {/* Request Changes Form */}
            {isRequestingChanges && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <label htmlFor={revisionId} className="block font-semibold text-amber-900">
                  {t("revision.title")}
                </label>
                <textarea
                  id={revisionId}
                  rows={3}
                  value={changesNote}
                  onChange={(e) => {
                    setChangesNote(e.target.value);
                    if (e.target.value.trim().length >= 3) setChangesNoteError(false);
                  }}
                  aria-invalid={changesNoteError || undefined}
                  aria-describedby={changesNoteError ? revisionErrorId : undefined}
                  placeholder={t("revision.placeholder")}
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                />
                {changesNoteError && (
                  <p id={revisionErrorId} role="alert" className="text-[11px] font-medium text-accent-700">
                    {tActions("reasonTooShort", { min: 3 })}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsRequestingChanges(false);
                      setChangesNoteError(false);
                    }}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleRequestChanges(detailListing)}>
                    {t("revision.send")}
                  </Button>
                </div>
              </div>
            )}

            {/* Description & Amenities */}
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">{t("detail.description")}</h4>
              <p className="text-primary-700 leading-relaxed">{detailListing.description}</p>
            </div>

            {/* Amenities tags */}
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">{t("detail.amenities")}</h4>
              <ul className="flex flex-wrap gap-1.5">
                {detailListing.amenities.map((amenity, idx) => (
                  <li
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 text-primary-700 font-medium text-[11px]"
                  >
                    {amenity}
                  </li>
                ))}
              </ul>
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
        requireTypedConfirmation={confirmState.requireTypedConfirmation}
      />
      {statusActions.dialog}
    </div>
  );
}
