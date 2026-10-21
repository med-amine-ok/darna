"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Home,
  Building,
  Bed,
  Compass,
  Truck,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Map as MapIcon,
  Star,
  Check,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/data-table/FilterBar";
import { FilterDrawer } from "@/components/data-table/FilterDrawer";
import { ActiveFilterChips, ActiveFilterItem } from "@/components/data-table/ActiveFilterChips";
import { BulkBar } from "@/components/data-table/BulkBar";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useToast } from "@/components/ui/Toast";
import { Listing, ListingStatus, ListingVertical, PaginatedResult } from "@/lib/types";
import { WILAYAS, getWilayaName } from "@/lib/utils/wilayas";
import { formatDzd, formatDate } from "@/lib/utils/format";
import {
  listListings,
  approveListing,
  rejectListing,
  requestChangesListing,
  suspendListing,
  featureListing,
  deleteListing,
  restoreListing,
} from "@/lib/data/listings";
import ListingsMapView from "@/components/features/listings/ListingsMapView";

export interface ListingsClientProps {
  initialData: PaginatedResult<Listing>;
  initialStatus: string;
  initialVertical: string;
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
  const { success, error, info } = useToast();
  const [isPending, startTransition] = useTransition();

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
  const [checklist, setChecklist] = useState({
    photosOk: true,
    locationAccurate: true,
    priceReasonable: true,
    policiesPresent: true,
    descriptionAppropriate: true,
  });

  const [changesNote, setChangesNote] = useState("");
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);

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

  const fetchData = async (overrideParams: Record<string, any> = {}) => {
    startTransition(async () => {
      const res = await listListings({
        status: overrideParams.status ?? status,
        vertical: overrideParams.vertical ?? vertical,
        search: overrideParams.search ?? search,
        wilayaCode: overrideParams.selectedWilayas ?? (selectedWilayas.length > 0 ? selectedWilayas : undefined),
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < 100000 ? priceRange[1] : undefined,
        page: overrideParams.page ?? currentPage,
        pageSize: overrideParams.pageSize ?? pageSize,
      });
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
    activeChips.push({ key: "vertical", label: "Vertical", valueDisplay: vertical });
  }
  if (selectedWilayas.length > 0) {
    activeChips.push({
      key: "wilayas",
      label: "Wilayas",
      valueDisplay: `${selectedWilayas.length} selected`,
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
      title: `Approve Listing`,
      description: `Publish ${listing.title} directly to the public traveler catalog.`,
      variant: "primary",
      confirmLabel: "Approve Listing",
      action: async () => {
        try {
          const updated = await approveListing(listing.id, { id: "adm_01", name: "Admin", role: "super_admin" });
          success(`Approved listing: ${listing.title}`, undefined, () => {
            suspendListing(listing.id, "Undo approve", { id: "adm_01", name: "Admin", role: "super_admin" }).then(() => fetchData());
          });
          setDetailListing(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to approve listing");
        }
      },
    });
  };

  const handleRequestChanges = async (listing: Listing) => {
    if (!changesNote.trim()) return;
    try {
      const updated = await requestChangesListing(listing.id, changesNote, { id: "adm_01", name: "Admin", role: "super_admin" });
      info(`Requested changes on ${listing.title}`);
      setDetailListing(updated);
      setIsRequestingChanges(false);
      setChangesNote("");
      fetchData();
    } catch (e: any) {
      error(e.message || "Failed to request changes");
    }
  };

  const handleToggleFeature = async (listing: Listing) => {
    try {
      const updated = await featureListing(listing.id, !listing.isFeatured, { id: "adm_01", name: "Admin", role: "super_admin" });
      success(updated.isFeatured ? "Featured on homepage" : "Unfeatured listing");
      setDetailListing(updated);
      fetchData();
    } catch (e: any) {
      error(e.message || "Failed to feature listing");
    }
  };

  const handleDelete = (listing: Listing) => {
    setConfirmState({
      isOpen: true,
      title: `Permanent Deletion Confirmation`,
      description: `Soft-delete listing ${listing.title}. To confirm, please type the exact title below.`,
      variant: "danger",
      confirmLabel: "Delete Listing",
      requireTypedConfirmation: listing.title,
      action: async () => {
        try {
          await deleteListing(listing.id, { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Deleted listing: ${listing.title}`);
          setDetailListing(null);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to delete listing");
        }
      },
    });
  };

  const handleExportCsv = () => {
    const headers = "ID,Title,Vertical,Host,Wilaya,Price_DZD,Status,Rating,Bookings\n";
    const rows = data.rows
      .map(
        (l) =>
          `"${l.id}","${l.title.replace(/"/g, '""')}","${l.category}","${l.hostName}","${l.wilayaCode}",${l.price},"${l.status}",${l.rating},${l.bookingsCount}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `DARNA-Listings-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Filtered listings CSV exported successfully");
  };

  const columns: Column<Listing>[] = [
    {
      key: "title",
      header: t("propertyTitle"),
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-10 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-tertiary/60">
            <Image
              src={l.imageSrc[0] || "/assets/house.png"}
              alt={l.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-primary truncate leading-tight block">
                {l.title}
              </span>
              {l.isFeatured && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md">
                  Featured
                </span>
              )}
            </div>
            <span className="block text-[11px] text-neutral-400 truncate leading-snug">
              by {l.hostName} ({l.hostType})
            </span>
          </div>
        </div>
      ),
    },
    // {
    //   key: "category",
    //   header: t("vertical"),
    //   render: (l) => (
    //     <Badge
    //       variant={
    //         l.category === "home"
    //           ? "primary"
    //           : l.category === "hotel"
    //           ? "secondary"
    //           : l.category === "trip"
    //           ? "accent"
    //           : "outline"
    //       }
    //     >
    //       {tVerticals.has(l.category) ? tVerticals(l.category) : l.category}
    //     </Badge>
    //   ),
    // },
    {
      key: "wilayaCode",
      header: "Wilaya",
      render: (l) => (
        <span className="font-semibold text-neutral-600">
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
        <span className="font-mono font-bold text-primary tabular-nums">
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
      header: "Rating",
      align: "center",
      sortable: true,
      render: (l) => (
        <span className="font-semibold text-amber-600 tabular-nums">
          ★ {l.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "bookingsCount",
      header: "Bookings",
      align: "center",
      sortable: true,
      render: (l) => <span className="font-bold tabular-nums">{l.bookingsCount}</span>,
    },
    {
      key: "actions",
      header: tCommon("actions"),
      align: "right",
      render: (l) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {l.status === "pending_review" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleApprove(l)}
              className="text-[11px] py-1 px-2.5"
            >
              {t("approveAction")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailListing(l)}
              className="text-[11px] py-1 px-2 text-neutral-600"
            >
              <Eye className="w-3.5 h-3.5 me-1" /> {tCommon("view")}
            </Button>
          )}

          <DropdownMenu
            items={[
              {
                label: tCommon("inspect"),
                onClick: () => setDetailListing(l),
              },
              {
                label: l.isFeatured ? "Unfeature Listing" : "Feature on Homepage",
                onClick: () => handleToggleFeature(l),
              },
              {
                label: t("approveAction"),
                onClick: () => handleApprove(l),
                disabled: l.status === "approved",
              },
              {
                label: "Suspend Listing",
                onClick: () => handleSuspend(l),
                variant: "danger",
                disabled: l.status === "suspended",
              },
              {
                label: "Delete Listing",
                onClick: () => handleDelete(l),
                variant: "danger",
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const handleSuspend = (listing: Listing) => {
    setConfirmState({
      isOpen: true,
      title: "Suspend Listing",
      description: `Temporarily suspend ${listing.title} from catalog visibility.`,
      variant: "danger",
      confirmLabel: "Suspend Listing",
      action: async () => {
        try {
          const updated = await suspendListing(listing.id, "Violation of quality rules", { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Suspended listing ${listing.title}`);
          setDetailListing(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to suspend listing");
        }
      },
    });
  };

  return (
    <div className="space-y-6 text-start">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-tertiary/70 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === "table" ? "bg-primary text-white shadow-2xs" : "text-neutral-500 hover:text-primary"
            }`}
            title={t("tableView")}
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === "grid" ? "bg-primary text-white shadow-2xs" : "text-neutral-500 hover:text-primary"
            }`}
            title={t("gridView")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`p-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === "map" ? "bg-primary text-white shadow-2xs" : "text-neutral-500 hover:text-primary"
            }`}
            title={t("mapView")}
          >
            <MapIcon className="w-4 h-4" />
          </button>
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
      <div className="flex items-center gap-1.5 overflow-x-auto darna-admin-scrollbar py-1 text-xs">
        {[
          { id: "all", label: tCommon("all") },
          { id: "home", label: tVerticals("home"), icon: <Home className="w-3.5 h-3.5" /> },
          { id: "hotel", label: tVerticals("hotel"), icon: <Building className="w-3.5 h-3.5" /> },
          { id: "experience", label: tVerticals("experience"), icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: "vehicle", label: tVerticals("vehicle"), icon: <Truck className="w-3.5 h-3.5" /> },
          { id: "trip", label: tVerticals("trip"), icon: <Compass className="w-3.5 h-3.5" /> },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => handleVerticalChange(v.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer select-none whitespace-nowrap ${
              vertical === v.id
                ? "bg-secondary text-white shadow-xs"
                : "bg-white border border-tertiary/70 text-neutral-600 hover:bg-darnaBg"
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
        onExport={handleExportCsv}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {data.rows.map((listing) => (
            <div
              key={listing.id}
              onClick={() => setDetailListing(listing)}
              className="group rounded-3xl bg-white border border-tertiary/70 shadow-darna-card overflow-hidden hover:shadow-darna-hover transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="relative w-full h-44 bg-neutral-100 overflow-hidden">
                  <Image
                    src={listing.imageSrc[0] || "/assets/house.png"}
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2.5 start-2.5">
                    <StatusPill
                      label={listing.status.replace("_", " ")}
                      variant={listing.status === "approved" ? "success" : "warning"}
                      size="sm"
                    />
                  </span>
                  <span className="absolute bottom-2.5 end-2.5 font-mono font-bold text-xs bg-black/75 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {formatDzd(listing.price, locale)}
                  </span>
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-secondary">{listing.category.toUpperCase()}</span>
                    <span className="text-amber-600 font-bold">★ {listing.rating.toFixed(1)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-primary line-clamp-2 leading-tight">
                    {listing.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    {listing.city} · Host: {listing.hostName}
                  </p>
                </div>
              </div>

              <div className="p-3 px-4 border-t border-neutral-100 flex items-center justify-between text-xs bg-darnaBg/30">
                <span className="text-neutral-500 font-medium">{listing.bookingsCount} bookings</span>
                <span className="font-bold text-secondary group-hover:underline">Moderate →</span>
              </div>
            </div>
          ))}
        </div>
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
        actions={[
          {
            id: "bulk_approve_listings",
            label: "Approve Selected",
            variant: "secondary",
            onClick: () => {
              setConfirmState({
                isOpen: true,
                title: `Approve ${selectedIds.length} Listings`,
                description: "Publish all selected properties to the live traveler catalog.",
                variant: "primary",
                confirmLabel: "Approve Selected",
                action: async () => {
                  for (const id of selectedIds) {
                    await approveListing(id, { id: "adm_01", name: "Admin", role: "super_admin" });
                  }
                  success(`Bulk approved ${selectedIds.length} listings`);
                  setSelectedIds([]);
                  fetchData();
                },
              });
            },
          },
          {
            id: "bulk_export_listings",
            label: "Export Selected",
            variant: "outline",
            onClick: handleExportCsv,
          },
        ]}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        activeFilterCount={activeChips.length}
        onReset={handleClearAllFilters}
        onApply={() => fetchData({ page: 1 })}
      >
        <div className="space-y-2">
          <label className="block text-xs font-bold text-primary">Wilaya</label>
          <MultiSelect
            placeholder="Select provinces..."
            options={WILAYAS.map((w) => ({
              value: w.code,
              label: `${w.code} - ${w.nameEn}`,
            }))}
            selectedValues={selectedWilayas}
            onChange={setSelectedWilayas}
          />
        </div>

        <RangeSlider
          label="Price Range (DZD)"
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
          onClose={() => {
            setDetailListing(null);
            setIsRequestingChanges(false);
          }}
          size="lg"
          title={detailListing.title}
          subtitle={`${detailListing.propertyType} in ${detailListing.city} · ID: ${detailListing.id}`}
          footer={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailListing(null);
                  setIsRequestingChanges(false);
                }}
              >
                Close
              </Button>
              {detailListing.status === "pending_review" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRequestingChanges(true)}
                    className="text-amber-700"
                  >
                    Request Changes
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(detailListing)}
                  >
                    Approve Listing
                  </Button>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-5 text-xs text-start">
            {/* Gallery Lightbox Preview */}
            <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-neutral-100 border border-tertiary/70">
              <Image
                src={detailListing.imageSrc[0] || "/assets/house.png"}
                alt={detailListing.title}
                fill
                className="object-cover"
              />
              <span className="absolute top-3 start-3">
                <StatusPill
                  label={detailListing.status.replace("_", " ")}
                  variant={detailListing.status === "approved" ? "success" : "warning"}
                  size="sm"
                />
              </span>
            </div>

            {/* Moderation Checklist */}
            <div className="p-4 rounded-2xl bg-darnaBg/60 border border-tertiary/70 space-y-2.5">
              <h4 className="font-bold text-primary flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                Moderation Quality Checklist
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: "photosOk", label: "High quality realistic photos" },
                  { key: "locationAccurate", label: "Accurate wilaya & coordinates" },
                  { key: "priceReasonable", label: "Price sanity vs wilaya median" },
                  { key: "policiesPresent", label: "Cancellation policies present" },
                  { key: "descriptionAppropriate", label: "Appropriate description copy" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-tertiary/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(checklist as any)[item.key]}
                      onChange={(e) =>
                        setChecklist({ ...checklist, [item.key]: e.target.checked })
                      }
                      className="rounded text-secondary focus:ring-secondary"
                    />
                    <span className="text-[11px] font-medium text-primary">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Sanity Hint vs Wilaya Median */}
            <div className="p-3.5 rounded-xl bg-white border border-tertiary/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Nightly Price</span>
                <span className="font-bold font-mono text-primary text-sm">
                  {formatDzd(detailListing.price, locale)}
                </span>
              </div>
              <div className="text-end">
                <span className="text-neutral-400 block text-[11px]">Wilaya Median Benchmark</span>
                <span className="font-bold text-secondary text-xs">
                  ~16,500 DZD (Within Normal Range)
                </span>
              </div>
            </div>

            {/* Request Changes Form */}
            {isRequestingChanges && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <h4 className="font-bold text-amber-900">Note to Host: Revisions Required</h4>
                <textarea
                  rows={3}
                  value={changesNote}
                  onChange={(e) => setChangesNote(e.target.value)}
                  placeholder="e.g. Please upload clear photos of the bathroom and clarify the exact parking location."
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsRequestingChanges(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleRequestChanges(detailListing)}>
                    Send Revision Request
                  </Button>
                </div>
              </div>
            )}

            {/* Description & Amenities */}
            <div className="space-y-2">
              <h4 className="font-bold text-primary">Description</h4>
              <p className="text-neutral-600 leading-relaxed">{detailListing.description}</p>
            </div>

            {/* Amenities tags */}
            <div className="space-y-2">
              <h4 className="font-bold text-primary">Amenities & Inclusions</h4>
              <div className="flex flex-wrap gap-1.5">
                {detailListing.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 font-medium text-[11px]"
                  >
                    {amenity}
                  </span>
                ))}
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
        requireTypedConfirmation={confirmState.requireTypedConfirmation}
      />
    </div>
  );
}
