"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Building,
  User,
  Bed,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Percent,
  SlidersHorizontal,
  Download,
  Trash2,
  Eye,
  FileCheck,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/data-table/FilterBar";
import { FilterDrawer } from "@/components/data-table/FilterDrawer";
import { ActiveFilterChips, ActiveFilterItem } from "@/components/data-table/ActiveFilterChips";
import { BulkBar } from "@/components/data-table/BulkBar";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useToast } from "@/components/ui/Toast";
import { Host, HostType, HostStatus, PaginatedResult } from "@/lib/types";
import { WILAYAS, getWilayaName, getWilayasByRegion } from "@/lib/utils/wilayas";
import { formatDzd, formatDate, formatNumber } from "@/lib/utils/format";
import {
  listHosts,
  approveHost,
  rejectHost,
  suspendHost,
  unsuspendHost,
  deleteHost,
  restoreHost,
  overrideCommission,
} from "@/lib/data/hosts";
import { rechargeWallet } from "@/lib/data/finance";

export interface HostsClientProps {
  initialData: PaginatedResult<Host>;
  initialHostType: string;
  initialStatus: string;
}

export default function HostsClient({
  initialData,
  initialHostType,
  initialStatus,
}: HostsClientProps) {
  const router = useRouter();
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("hosts");
  const tCommon = useTranslations("common");
  const tHostTypes = useTranslations("hostTypes");
  const { success, error, info } = useToast();
  const [isPending, startTransition] = useTransition();

  // State
  const [data, setData] = useState<PaginatedResult<Host>>(initialData);
  const [hostType, setHostType] = useState<string>(initialHostType);
  const [status, setStatus] = useState<string>(initialStatus);
  const [search, setSearch] = useState("");
  const [selectedWilayas, setSelectedWilayas] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [verification, setVerification] = useState<string>("all");
  const [approvalMode, setApprovalMode] = useState<string>("all");
  const [onlyNegative, setOnlyNegative] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawers & Modals
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [detailHost, setDetailHost] = useState<Host | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "documents" | "listings" | "bookings" | "money" | "history">("overview");

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

  // Commission & Recharge inputs inside drawer
  const [overrideRateInput, setOverrideRateInput] = useState<number>(12);
  const [rechargeAmount, setRechargeAmount] = useState<number>(50000);
  const [rechargeRef, setRechargeRef] = useState<string>("");

  // Refetch data when filters change
  const fetchData = async (overrideParams: Record<string, any> = {}) => {
    startTransition(async () => {
      const res = await listHosts({
        hostType: overrideParams.hostType ?? hostType,
        status: overrideParams.status ?? status,
        search: overrideParams.search ?? search,
        wilayaCode: overrideParams.selectedWilayas ?? (selectedWilayas.length > 0 ? selectedWilayas : undefined),
        verificationStatus: overrideParams.verification ?? verification,
        approvalMode: overrideParams.approvalMode ?? (approvalMode !== "all" ? (approvalMode as any) : undefined),
        onlyNegativeBalance: overrideParams.onlyNegative ?? onlyNegative,
        page: overrideParams.page ?? currentPage,
        pageSize: overrideParams.pageSize ?? pageSize,
      });
      setData(res);
    });
  };

  const handleTabChange = (type: string) => {
    setHostType(type);
    setCurrentPage(1);
    fetchData({ hostType: type, page: 1 });
  };

  const handleSearchChange = (q: string) => {
    setSearch(q);
    fetchData({ search: q, page: 1 });
  };

  // Active filter chips calculation
  const activeChips: ActiveFilterItem[] = [];
  if (status !== "all") {
    activeChips.push({ key: "status", label: "Status", valueDisplay: status });
  }
  if (selectedWilayas.length > 0) {
    activeChips.push({
      key: "wilayas",
      label: "Wilayas",
      valueDisplay: `${selectedWilayas.length} selected`,
    });
  }
  if (verification !== "all") {
    activeChips.push({ key: "verification", label: "Verification", valueDisplay: verification });
  }
  if (approvalMode !== "all") {
    activeChips.push({ key: "approvalMode", label: "Booking Mode", valueDisplay: approvalMode });
  }
  if (onlyNegative) {
    activeChips.push({ key: "negative", label: "Balance", valueDisplay: "Negative only" });
  }

  const handleRemoveChip = (key: string) => {
    if (key === "status") {
      setStatus("all");
      fetchData({ status: "all" });
    } else if (key === "wilayas") {
      setSelectedWilayas([]);
      fetchData({ selectedWilayas: [] });
    } else if (key === "verification") {
      setVerification("all");
      fetchData({ verification: "all" });
    } else if (key === "approvalMode") {
      setApprovalMode("all");
      fetchData({ approvalMode: "all" });
    } else if (key === "negative") {
      setOnlyNegative(false);
      fetchData({ onlyNegative: false });
    }
  };

  const handleClearAllFilters = () => {
    setStatus("all");
    setSelectedWilayas([]);
    setVerification("all");
    setApprovalMode("all");
    setOnlyNegative(false);
    setSearch("");
    fetchData({
      status: "all",
      selectedWilayas: [],
      verification: "all",
      approvalMode: "all",
      onlyNegative: false,
      search: "",
      page: 1,
    });
  };

  // Region helpers for Wilaya
  const handleSelectRegion = (region: "north" | "high_plateaus" | "south") => {
    const regionalCodes = getWilayasByRegion(region).map((w) => w.code);
    setSelectedWilayas(regionalCodes);
  };

  // Actions
  const handleApprove = (host: Host) => {
    setConfirmState({
      isOpen: true,
      title: `Approve ${host.ownerName}`,
      description: `This will grant active marketplace permissions to ${host.businessName || host.ownerName} (${host.hostType}).`,
      variant: "primary",
      confirmLabel: "Approve Host",
      action: async () => {
        try {
          const updated = await approveHost(host.id, { id: "adm_01", name: "Admin", role: "super_admin" });
          success(`Approved host ${host.ownerName}`, undefined, () => {
            // Undo action
            suspendHost(host.id, "Undo approve", { id: "adm_01", name: "Admin", role: "super_admin" }).then(() => fetchData());
          });
          setDetailHost(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to approve host");
        }
      },
    });
  };

  const handleSuspend = (host: Host) => {
    setConfirmState({
      isOpen: true,
      title: `Suspend Host Account`,
      description: `Are you sure you want to suspend ${host.businessName || host.ownerName}? Their listings will be temporarily hidden from travelers.`,
      variant: "danger",
      confirmLabel: "Suspend Host",
      action: async () => {
        try {
          const updated = await suspendHost(host.id, "Violation of platform terms", { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Suspended host ${host.ownerName}`, undefined);
          setDetailHost(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to suspend host");
        }
      },
    });
  };

  const handleDelete = (host: Host) => {
    setConfirmState({
      isOpen: true,
      title: `Permanent Deletion Confirmation`,
      description: `Soft delete host record ${host.businessName || host.ownerName}. To confirm, please type the host owner's full name below.`,
      variant: "danger",
      confirmLabel: "Delete Host",
      requireTypedConfirmation: host.ownerName,
      action: async () => {
        try {
          await deleteHost(host.id, { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Deleted host ${host.ownerName}`);
          setDetailHost(null);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to delete host");
        }
      },
    });
  };

  const handleSaveCommission = async () => {
    if (!detailHost) return;
    try {
      const updated = await overrideCommission(detailHost.id, overrideRateInput, { id: "adm_01", name: "Admin", role: "super_admin" });
      success(`Updated commission rate to ${overrideRateInput}%`);
      setDetailHost(updated);
      fetchData();
    } catch (e: any) {
      error(e.message || "Failed to update commission");
    }
  };

  const handleRechargeSubmit = async () => {
    if (!detailHost || rechargeAmount <= 0) return;
    try {
      const res = await rechargeWallet({
        hostId: detailHost.id,
        amount: rechargeAmount,
        method: "ccp_transfer",
        reason: "Admin portal offline top-up",
        receiptReference: rechargeRef || `REC-${Date.now().toString().slice(-6)}`,
        actor: { id: "adm_01", name: "Admin", role: "super_admin" },
      });
      success(`Credited ${formatDzd(rechargeAmount, locale)} to host wallet`);
      setDetailHost({ ...detailHost, walletBalance: res.newBalance });
      fetchData();
    } catch (e: any) {
      error(e.message || "Failed to recharge wallet");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = "ID,Name,Business,Type,Wilaya,Status,Listings,Bookings,Rating,Balance_DZD,Commission_Rate\n";
    const rows = data.rows
      .map(
        (h) =>
          `"${h.id}","${h.ownerName}","${h.businessName || ""}","${h.hostType}","${h.wilayaCode}","${h.status}",${h.listingsCount},${h.bookingsCount},${h.rating},${h.walletBalance},${h.commissionRate}%`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `DARNA-Hosts-${hostType}-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Filtered hosts CSV exported successfully");
  };

  // Columns definition
  const columns: Column<Host>[] = [
    {
      key: "ownerName",
      header: t("partnerEntity"),
      sortable: true,
      render: (h) => (
        <div className="flex items-center gap-3">
          <Avatar name={h.ownerName} size={36} />
          <div className="min-w-0">
            <span className="block font-bold text-primary truncate leading-tight">
              {h.businessName || h.ownerName}
            </span>
            <span className="block text-[11px] text-neutral-400 truncate leading-snug">
              {h.email}
            </span>
          </div>
        </div>
      ),
    },
    // {
    //   key: "hostType",
    //   header: t("category"),
    //   render: (h) => (
    //     <Badge
    //       variant={
    //         h.hostType === "agency"
    //           ? "accent"
    //           : h.hostType === "hotel"
    //           ? "primary"
    //           : h.hostType === "hostel"
    //           ? "tertiary"
    //           : "secondary"
    //       }
    //     >
    //       {tHostTypes.has(h.hostType) ? tHostTypes(h.hostType) : h.hostType}
    //     </Badge>
    //   ),
    // },
    {
      key: "wilayaCode",
      header: t("wilaya"),
      render: (h) => (
        <span className="font-semibold text-neutral-600">
          {getWilayaName(h.wilayaCode, locale)}
        </span>
      ),
    },
    {
      key: "status",
      header: tCommon("status"),
      render: (h) => (
        <StatusPill
          status={h.status}
          size="sm"
        />
      ),
    },
    {
      key: "verificationStatus",
      header: "Documents",
      render: (h) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
            h.verificationStatus === "verified"
              ? "text-secondary"
              : h.verificationStatus === "pending"
              ? "text-[#8C682E]"
              : "text-accent"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {h.verificationStatus}
        </span>
      ),
    },
    {
      key: "listingsCount",
      header: t("listingsCount"),
      align: "center",
      sortable: true,
      render: (h) => <span className="font-bold tabular-nums">{h.listingsCount}</span>,
    },
    {
      key: "bookingsCount",
      header: t("bookingsCount"),
      align: "center",
      sortable: true,
      render: (h) => <span className="font-bold tabular-nums">{h.bookingsCount}</span>,
    },
    {
      key: "rating",
      header: t("rating"),
      align: "center",
      sortable: true,
      render: (h) => (
        <span className="font-semibold text-amber-600 tabular-nums">
          ★ {h.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "walletBalance",
      header: t("walletBalance"),
      align: "right",
      sortable: true,
      render: (h) => (
        <span
          className={`font-mono font-bold tabular-nums ${
            h.walletBalance < 0 ? "text-accent" : "text-primary"
          }`}
        >
          {formatDzd(h.walletBalance, locale)}
        </span>
      ),
    },
    {
      key: "commissionRate",
      header: t("takeRate"),
      align: "right",
      render: (h) => (
        <span className="text-xs font-semibold tabular-nums text-neutral-600">
          {h.commissionRate}%
          {h.isCommissionOverridden && (
            <span className="text-[10px] text-accent ms-1 font-bold">★</span>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: tCommon("actions"),
      align: "right",
      render: (h) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {h.status === "under_review" || h.status === "applied" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleApprove(h)}
              className="text-[11px] py-1 px-2.5"
            >
              {t("approveHost")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDetailHost(h);
                setOverrideRateInput(h.commissionRate);
              }}
              className="text-[11px] py-1 px-2 text-neutral-600"
            >
              <Eye className="w-3.5 h-3.5 me-1" /> {t("viewDetails")}
            </Button>
          )}

          <DropdownMenu
            items={[
              {
                label: t("viewDetails"),
                onClick: () => {
                  setDetailHost(h);
                  setOverrideRateInput(h.commissionRate);
                },
              },
              {
                label: t("approveHost"),
                onClick: () => handleApprove(h),
                disabled: h.status === "approved",
              },
              {
                label: t("suspendHost"),
                onClick: () => handleSuspend(h),
                variant: "danger",
                disabled: h.status === "suspended",
              },
              {
                label: t("deleteHost"),
                onClick: () => handleDelete(h),
                variant: "danger",
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-start">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Top Category Tabs with Live Counts */}
      <Tabs
        tabs={[
          { id: "all", label: t("allPartners"), count: data.facets?.hostType?.all },
          { id: "individual", label: t("individualTab"), count: data.facets?.hostType?.individual, icon: <User className="w-3.5 h-3.5" /> },
          { id: "agency", label: t("agencyTab"), count: data.facets?.hostType?.agency, icon: <Building className="w-3.5 h-3.5" /> },
          { id: "hotel", label: t("hotelTab"), count: data.facets?.hostType?.hotel, icon: <Building className="w-3.5 h-3.5" /> },
          { id: "hostel", label: t("hostelTab"), count: data.facets?.hostType?.hostel, icon: <Bed className="w-3.5 h-3.5" /> },
        ]}
        activeTab={hostType}
        onChange={handleTabChange}
      />

      {/* Filter Bar */}
      <FilterBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("searchPlaceholder")}
        activeFilterCount={activeChips.length}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        totalResults={data.total}
        resultsLabel={t("allPartners")}
        onExport={handleExportCsv}
      />

      {/* Active Filter Chips */}
      <ActiveFilterChips
        filters={activeChips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAllFilters}
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={data.rows}
        keyExtractor={(h) => h.id}
        selectedIds={selectedIds}
        onSelectRow={(id) =>
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
          )
        }
        onSelectAll={() =>
          setSelectedIds((prev) =>
            prev.length === data.rows.length ? [] : data.rows.map((h) => h.id)
          )
        }
        isAllSelected={selectedIds.length > 0 && selectedIds.length === data.rows.length}
        isLoading={isPending}
        density={density}
        onRowClick={(h) => {
          setDetailHost(h);
          setOverrideRateInput(h.commissionRate);
        }}
      />

      {/* Server-Side Pagination */}
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

      {/* Floating Bulk Actions Bar */}
      <BulkBar
        selectedCount={selectedIds.length}
        totalFilteredCount={data.total}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            id: "bulk_approve",
            label: "Approve Selected",
            variant: "secondary",
            onClick: () => {
              setConfirmState({
                isOpen: true,
                title: `Bulk Approve ${selectedIds.length} Hosts`,
                description: "This will approve all selected host accounts immediately.",
                variant: "primary",
                confirmLabel: "Approve All Selected",
                action: async () => {
                  for (const id of selectedIds) {
                    await approveHost(id, { id: "adm_01", name: "Admin", role: "super_admin" });
                  }
                  success(`Bulk approved ${selectedIds.length} hosts`);
                  setSelectedIds([]);
                  fetchData();
                },
              });
            },
          },
          {
            id: "bulk_export",
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
        {/* Wilaya Filter (All 69 Wilayas) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-primary">Wilaya (Province)</label>
            <div className="flex items-center gap-1 text-[10px] text-secondary font-bold">
              <button type="button" onClick={() => handleSelectRegion("north")} className="hover:underline">
                North
              </button>
              <span>·</span>
              <button type="button" onClick={() => handleSelectRegion("high_plateaus")} className="hover:underline">
                High Plateaus
              </button>
              <span>·</span>
              <button type="button" onClick={() => handleSelectRegion("south")} className="hover:underline">
                South
              </button>
            </div>
          </div>
          <MultiSelect
            placeholder="Select Algerian wilayas..."
            options={WILAYAS.map((w) => ({
              value: w.code,
              label: `${w.code} - ${w.nameEn}`,
            }))}
            selectedValues={selectedWilayas}
            onChange={setSelectedWilayas}
          />
        </div>

        {/* Status Lifecycle */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary">Partner Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="applied">Applied (New)</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {/* Verification Status */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary">Document Verification</label>
          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">All Documents</option>
            <option value="verified">Complete & Verified</option>
            <option value="pending">Pending Document Review</option>
            <option value="missing">Missing Documents</option>
            <option value="expired">Expired Documents</option>
          </select>
        </div>

        {/* Booking Approval Mode */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary">Booking Approval Mode</label>
          <select
            value={approvalMode}
            onChange={(e) => setApprovalMode(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">Any Mode</option>
            <option value="instant">Instant Booking</option>
            <option value="request">Manual Host Request</option>
          </select>
        </div>

        {/* Price Range Slider */}
        <RangeSlider
          label="Price Range (DZD)"
          min={0}
          max={100000}
          step={2000}
          value={priceRange}
          onChange={setPriceRange}
        />
      </FilterDrawer>

      {/* Host Detail Drawer */}
      {detailHost && (
        <Drawer
          isOpen={!!detailHost}
          onClose={() => setDetailHost(null)}
          size="lg"
          title={detailHost.businessName || detailHost.ownerName}
          subtitle={`${detailHost.hostType.toUpperCase()} in ${detailHost.city} · ID: ${detailHost.id}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailHost(null)}>
                Close
              </Button>
              {detailHost.status !== "approved" ? (
                <Button variant="primary" size="sm" onClick={() => handleApprove(detailHost)}>
                  Approve Host
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => handleSuspend(detailHost)}>
                  Suspend Host
                </Button>
              )}
            </div>
          }
        >
          {/* Drawer Tabs (Exactly 6 Miller 7±2 compliant tabs) */}
          <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-2 overflow-x-auto">
            {[
              { id: "overview", label: "Overview" },
              { id: "documents", label: `Documents (${detailHost.documents.length})` },
              { id: "listings", label: `Listings (${detailHost.listingsCount})` },
              { id: "bookings", label: `Bookings (${detailHost.bookingsCount})` },
              { id: "money", label: "Money" },
              { id: "history", label: "History" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveDetailTab(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  activeDetailTab === t.id
                    ? "bg-primary text-white"
                    : "text-neutral-500 hover:text-primary hover:bg-neutral-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeDetailTab === "overview" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-darnaBg/40 border border-tertiary/50">
                <div>
                  <span className="text-neutral-400 block">Owner Name</span>
                  <span className="font-bold text-primary">{detailHost.ownerName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Business Name</span>
                  <span className="font-bold text-primary">{detailHost.businessName || "Individual Partner"}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Email</span>
                  <span className="font-bold text-primary">{detailHost.email}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Phone</span>
                  <span className="font-bold text-primary">{detailHost.phone}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Wilaya</span>
                  <span className="font-bold text-primary">{getWilayaName(detailHost.wilayaCode, locale)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Wallet Balance</span>
                  <span className={`font-mono font-bold ${detailHost.walletBalance < 0 ? "text-accent" : "text-primary"}`}>
                    {formatDzd(detailHost.walletBalance, locale)}
                  </span>
                </div>
              </div>

              {detailHost.agencyMetadata && (
                <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                  <h4 className="font-bold text-primary">Agency & Staff Details</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-neutral-400 block">Team Size</span>
                      <span className="font-bold">{detailHost.agencyMetadata.teamSize} staff</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">License No.</span>
                      <span className="font-bold font-mono">{detailHost.agencyMetadata.licenseNumber}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Offers Trips</span>
                      <span className="font-bold text-secondary">Yes</span>
                    </div>
                  </div>
                </div>
              )}

              {detailHost.hotelMetadata && (
                <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                  <h4 className="font-bold text-primary">Hotel Classification</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-neutral-400 block">Stars</span>
                      <span className="font-bold text-amber-600">{"★".repeat(detailHost.hotelMetadata.starRating)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Total Rooms</span>
                      <span className="font-bold">{detailHost.hotelMetadata.roomCount} Rooms</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Moderator Notes */}
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <h4 className="font-bold text-primary">Internal Notes</h4>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  Verified Algerian tourism operator. Identity documents matched against national records. Contact phone verified via SMS dispatch.
                </p>
              </div>
            </div>
          )}

          {activeDetailTab === "documents" && (
            <div className="space-y-3 text-xs">
              {detailHost.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-2xl bg-white border border-tertiary/60 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-primary block">{doc.title}</span>
                      <span className="text-[11px] text-neutral-400">
                        Uploaded {formatDate(doc.uploadedAt, locale)} · Status: {doc.status}
                      </span>
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-lg border border-tertiary/70 text-primary font-bold hover:bg-darnaBg/70 transition"
                  >
                    View File
                  </a>
                </div>
              ))}
            </div>
          )}

          {activeDetailTab === "listings" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-darnaBg/50 border border-tertiary/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary block">Active Listings Fleet</span>
                  <span className="text-[11px] text-neutral-500">{detailHost.listingsCount} properties registered</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-secondary/15 text-secondary font-bold text-[11px]">
                  Published
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <span className="font-semibold text-neutral-700 block">Catalog Sub-sections:</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-neutral-400 block text-[10px]">Stays / Homes</span>
                    <strong className="text-primary text-sm">{Math.ceil(detailHost.listingsCount * 0.6)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-neutral-400 block text-[10px]">Hotel Rooms</span>
                    <strong className="text-primary text-sm">{Math.floor(detailHost.listingsCount * 0.3)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-neutral-400 block text-[10px]">Trips & Tours</span>
                    <strong className="text-primary text-sm">{Math.max(1, Math.floor(detailHost.listingsCount * 0.1))}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === "bookings" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">Guest Reservations</span>
                  <span className="font-bold text-secondary font-mono">{detailHost.bookingsCount} completed stays</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Reliable track record. Average check-in confirmation within 24 minutes.
                </p>
              </div>
            </div>
          )}

          {activeDetailTab === "money" && (
            <div className="space-y-4 text-xs">
              {/* Wallet Summary */}
              <div className="p-4 rounded-2xl bg-darnaBg/50 border border-tertiary/60 flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Current Wallet Balance</span>
                  <span className="text-xl font-bold font-mono text-primary">
                    {formatDzd(detailHost.walletBalance, locale)}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">
                  Rate: <strong>{detailHost.commissionRate}%</strong>
                </span>
              </div>

              {/* Commission Override */}
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <h4 className="font-bold text-primary">Platform Commission Rate</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={overrideRateInput}
                    onChange={(e) => setOverrideRateInput(Number(e.target.value))}
                    className="w-24 p-2 rounded-xl border border-tertiary/80 text-sm font-bold font-mono text-primary"
                  />
                  <span className="font-bold text-sm">%</span>
                  <Button variant="primary" size="sm" onClick={handleSaveCommission}>
                    Save Override
                  </Button>
                </div>
              </div>

              {/* Recharge Form */}
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-3">
                <h4 className="font-bold text-primary">Credit Partner Wallet (Offline Top-Up)</h4>
                <div>
                  <label className="block text-neutral-500 font-semibold mb-1">Amount (DZD)</label>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-tertiary/80 text-sm font-bold font-mono text-primary"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-semibold mb-1">Receipt / Wire Reference</label>
                  <input
                    type="text"
                    value={rechargeRef}
                    onChange={(e) => setRechargeRef(e.target.value)}
                    placeholder="e.g. BNA-VIR-891244"
                    className="w-full p-2 rounded-xl border border-tertiary/80 text-xs text-primary"
                  />
                </div>
                <Button variant="secondary" size="md" className="w-full" onClick={handleRechargeSubmit}>
                  Credit Wallet
                </Button>
              </div>
            </div>
          )}

          {activeDetailTab === "history" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <h4 className="font-bold text-primary">Partner History of Actions</h4>
                <div className="divide-y divide-neutral-100 text-[11px]">
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-700">Account verified by Nadia</span>
                    <span className="text-neutral-400">2 days ago</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-700">Identity document approved</span>
                    <span className="text-neutral-400">3 days ago</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-700">Partner application submitted</span>
                    <span className="text-neutral-400">5 days ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
