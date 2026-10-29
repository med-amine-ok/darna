"use client";

import React, { useId, useState, useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  Building,
  User,
  Bed,
  ShieldCheck,
  Eye,
  FileCheck,
  MoreVertical,
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
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useToast } from "@/components/ui/Toast";
import { Host, PaginatedResult } from "@/lib/types";
import { WILAYAS, getWilayaLabel, getWilayaName, getWilayasByRegion } from "@/lib/utils/wilayas";
import { formatDzd, formatDate, formatNumber, intlLocale } from "@/lib/utils/format";
import {
  listHosts,
  approveHost,
  suspendHost,
  unsuspendHost,
  deleteHost,
  restoreHost,
  overrideCommission,
} from "@/lib/actions/hosts";
import { rechargeWallet } from "@/lib/actions/finance";
import { exportHosts } from "@/lib/actions/hosts";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { downloadCsv } from "@/lib/utils/download";
import { canHostAction } from "@/lib/domain/transitions";
import { isValidCommissionRate, isValidDzdAmount, MAX_RECHARGE_DZD } from "@/lib/pricing";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";

export interface HostsClientProps {
  initialData: PaginatedResult<Host>;
  initialHostType: string;
  initialStatus: string;
}

type DetailTab = "overview" | "documents" | "listings" | "bookings" | "money" | "history";

const SELECT_CLASS =
  "w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 cursor-pointer";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function HostsClient({
  initialData,
  initialHostType,
  initialStatus,
}: HostsClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("hosts");
  const tCommon = useTranslations("common");
  const tHostTypes = useTranslations("hostTypes");
  const tStatus = useTranslations("status");
  const format = useFormatter();
  const uid = useId();
  const { success, error, info } = useToast();
  const tActions = useTranslations("actions");
  const [suspendTarget, setSuspendTarget] = useState<Host | null>(null);
  const can = useCan();
  const [isPending, startTransition] = useTransition();

  const formatRate = (rate: number) =>
    new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 2 }).format(rate / 100);
  const formatRating = (rating: number) =>
    new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
  const statusLabel = (value: string) => (tStatus.has(value) ? tStatus(value) : value);
  const hostTypeLabel = (value: string) => (tHostTypes.has(value) ? tHostTypes(value) : value);
  const verificationLabel = (value: string) =>
    t.has(`verification.${value}`) ? t(`verification.${value}`) : value;

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
  const [density] = useState<"comfortable" | "compact">("comfortable");

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawers & Modals
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [detailHost, setDetailHost] = useState<Host | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("overview");

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

  const ids = {
    wilaya: `${uid}-wilaya`,
    status: `${uid}-status`,
    verification: `${uid}-verification`,
    approvalMode: `${uid}-approval-mode`,
    rate: `${uid}-rate`,
    rateError: `${uid}-rate-error`,
    amount: `${uid}-amount`,
    amountError: `${uid}-amount-error`,
    receipt: `${uid}-receipt`,
    tabPanel: `${uid}-detail-panel`,
  };

  // Refetch data when filters change
  const fetchData = async (overrideParams: Record<string, any> = {}) => {
    startTransition(async () => {
      const res = unwrap(await listHosts({
        hostType: overrideParams.hostType ?? hostType,
        status: overrideParams.status ?? status,
        search: overrideParams.search ?? search,
        wilayaCode: overrideParams.selectedWilayas ?? (selectedWilayas.length > 0 ? selectedWilayas : undefined),
        verificationStatus: overrideParams.verification ?? verification,
        approvalMode: overrideParams.approvalMode ?? (approvalMode !== "all" ? (approvalMode as any) : undefined),
        onlyNegativeBalance: overrideParams.onlyNegative ?? onlyNegative,
        page: overrideParams.page ?? currentPage,
        pageSize: overrideParams.pageSize ?? pageSize,
      }));
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
    activeChips.push({ key: "status", label: t("chips.status"), valueDisplay: statusLabel(status) });
  }
  if (selectedWilayas.length > 0) {
    activeChips.push({
      key: "wilayas",
      label: t("chips.wilayas"),
      valueDisplay: t("chips.wilayasSelected", { count: selectedWilayas.length }),
    });
  }
  if (verification !== "all") {
    activeChips.push({
      key: "verification",
      label: t("chips.verification"),
      valueDisplay: verificationLabel(verification),
    });
  }
  if (approvalMode !== "all") {
    activeChips.push({
      key: "approvalMode",
      label: t("chips.bookingMode"),
      valueDisplay: t.has(`approvalModes.${approvalMode}`) ? t(`approvalModes.${approvalMode}`) : approvalMode,
    });
  }
  if (onlyNegative) {
    activeChips.push({ key: "negative", label: t("chips.balance"), valueDisplay: t("chips.negativeOnly") });
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

  const openDetail = (h: Host) => {
    setDetailHost(h);
    setOverrideRateInput(h.commissionRate);
  };

  // Actions
  const handleApprove = (host: Host) => {
    setConfirmState({
      isOpen: true,
      title: t("confirm.approveTitle", { name: host.ownerName }),
      description: t("confirm.approveDescription", {
        name: host.businessName || host.ownerName,
        type: hostTypeLabel(host.hostType),
      }),
      variant: "primary",
      confirmLabel: t("confirm.approveConfirm"),
      action: async () => {
        try {
          const updated = unwrap(await approveHost(host.id));
          success(t("toasts.approved", { name: host.ownerName }));
          setDetailHost(updated);
          fetchData();
        } catch (e: any) {
          error(t("toasts.approveFailed"), e.message);
        }
      },
    });
  };

  // Suspension requires a written reason (enforced server-side too).
  const handleSuspend = (host: Host) => setSuspendTarget(host);

  const confirmSuspend = async (reason: string) => {
    if (!suspendTarget) return;
    try {
      const updated = unwrap(await suspendHost(suspendTarget.id, reason));
      info(t("toasts.suspended", { name: suspendTarget.ownerName }), undefined);
      if (detailHost?.id === updated.id) setDetailHost(updated);
      setSuspendTarget(null);
      fetchData();
    } catch (e: any) {
      error(tActions("actionFailed"), e.message);
    }
  };

  const runHostAction = async (fn: () => Promise<any>, label: string) => {
    try {
      const updated = unwrap(await fn()) as Host;
      success(label);
      if (detailHost?.id === updated.id) setDetailHost(updated);
      fetchData();
    } catch (e: any) {
      error(tActions("actionFailed"), e.message);
    }
  };

  const handleDelete = (host: Host) => {
    setConfirmState({
      isOpen: true,
      title: t("confirm.deleteTitle"),
      description: t("confirm.deleteDescription", { name: host.businessName || host.ownerName }),
      variant: "danger",
      confirmLabel: t("confirm.deleteConfirm"),
      requireTypedConfirmation: host.ownerName,
      action: async () => {
        try {
          unwrap(await deleteHost(host.id));
          info(t("toasts.deleted", { name: host.ownerName }));
          setDetailHost(null);
          fetchData();
        } catch (e: any) {
          error(t("toasts.deleteFailed"), e.message);
        }
      },
    });
  };

  const handleSaveCommission = async () => {
    if (!detailHost) return;
    if (!isValidCommissionRate(overrideRateInput)) {
      error(tActions("actionFailed"), tActions("invalidRate"));
      return;
    }
    try {
      const updated = unwrap(await overrideCommission(detailHost.id, overrideRateInput));
      success(t("toasts.commissionUpdated", { rate: formatRate(overrideRateInput) }));
      setDetailHost(updated);
      fetchData();
    } catch (e: any) {
      error(t("toasts.commissionFailed"), e.message);
    }
  };

  const handleRechargeSubmit = async () => {
    if (!detailHost) return;
    if (!isValidDzdAmount(rechargeAmount, 1, MAX_RECHARGE_DZD)) {
      error(tActions("actionFailed"), tActions("invalidAmount", { max: formatDzd(MAX_RECHARGE_DZD, locale) }));
      return;
    }
    try {
      const res = unwrap(await rechargeWallet({
        hostId: detailHost.id,
        amount: rechargeAmount,
        method: "ccp_transfer",
        // Stored in the ledger/audit trail — intentionally not localized.
        reason: "Admin portal offline top-up",
        receiptReference: rechargeRef.trim(),
      }));
      success(t("toasts.recharged", { amount: formatDzd(rechargeAmount, locale) }));
      setDetailHost({ ...detailHost, walletBalance: res.newBalance });
      fetchData();
    } catch (e: any) {
      error(t("toasts.rechargeFailed"), e.message);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = unwrap(
        await exportHosts({
          hostType,
          status,
          search,
          wilayaCode: selectedWilayas.length > 0 ? selectedWilayas : undefined,
          verificationStatus: verification,
          approvalMode: approvalMode !== "all" ? (approvalMode as any) : undefined,
          onlyNegativeBalance: onlyNegative,
        })
      );
      downloadCsv(res.filename, res.csv);
      success(tActions("exportStarted"), tActions("exportRows", { count: res.rowCount }));
    } catch (e: any) {
      error(tActions("exportFailed"), e.message);
    }
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
            <span className="block text-[11px] text-neutral-500 truncate leading-snug">
              {h.email}
            </span>
          </div>
        </div>
      ),
    },
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
      header: t("documentsColumn"),
      render: (h) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
            h.verificationStatus === "verified"
              ? "text-secondary-700"
              : h.verificationStatus === "pending"
              ? "text-[#8C682E]"
              : "text-accent-700"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          {verificationLabel(h.verificationStatus)}
        </span>
      ),
    },
    {
      key: "listingsCount",
      header: t("listingsCount"),
      align: "center",
      sortable: true,
      render: (h) => <span className="font-bold tabular-nums">{formatNumber(h.listingsCount, locale)}</span>,
    },
    {
      key: "bookingsCount",
      header: t("bookingsCount"),
      align: "center",
      sortable: true,
      render: (h) => <span className="font-bold tabular-nums">{formatNumber(h.bookingsCount, locale)}</span>,
    },
    {
      key: "rating",
      header: t("rating"),
      align: "center",
      sortable: true,
      render: (h) => (
        <span className="font-semibold text-amber-700 tabular-nums">
          <span aria-hidden="true">★</span> {formatRating(h.rating)}
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
            h.walletBalance < 0 ? "text-accent-700" : "text-primary"
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
          {formatRate(h.commissionRate)}
          {h.isCommissionOverridden && (
            <span className="text-[10px] text-accent-700 ms-1 font-bold" aria-hidden="true">★</span>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: tCommon("actions"),
      align: "right",
      render: (h) => (
        // Stops row-click propagation only; the buttons inside are the interactive elements.
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {(h.status === "under_review" || h.status === "applied") && can("hosts.approve") ? (
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
              onClick={() => openDetail(h)}
              className="text-[11px] py-1 px-2 text-neutral-600"
            >
              <Eye className="w-3.5 h-3.5 me-1" aria-hidden="true" /> {t("viewDetails")}
            </Button>
          )}

          <DropdownMenu
            trigger={
              <button
                type="button"
                aria-label={t("moreActions", { name: h.businessName || h.ownerName })}
                aria-haspopup="menu"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-primary hover:bg-neutral-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                <MoreVertical className="w-4 h-4" aria-hidden="true" />
              </button>
            }
            items={[
              {
                label: t("viewDetails"),
                onClick: () => openDetail(h),
              },
              ...(can("hosts.approve")
                ? [{
                    label: t("approveHost"),
                    onClick: () => handleApprove(h),
                    disabled: !canHostAction(h.status, "approve"),
                  }]
                : []),
              ...(can("hosts.suspend")
                ? [{
                    label: t("suspendHost"),
                    onClick: () => handleSuspend(h),
                    variant: "danger" as const,
                    disabled: !canHostAction(h.status, "suspend"),
                  }]
                : []),
              ...(can("hosts.suspend") && canHostAction(h.status, "unsuspend")
                ? [{
                    label: tActions("reactivate"),
                    onClick: () => runHostAction(() => unsuspendHost(h.id), tActions("statusUpdated")),
                  }]
                : []),
              ...(can("hosts.delete") && canHostAction(h.status, "restore")
                ? [{
                    label: tActions("restore"),
                    onClick: () => runHostAction(() => restoreHost(h.id), tActions("restored")),
                  }]
                : []),
              ...(can("hosts.delete")
                ? [{
                    label: t("deleteHost"),
                    onClick: () => handleDelete(h),
                    variant: "danger" as const,
                    disabled: !canHostAction(h.status, "delete"),
                  }]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  const detailTabs: { id: DetailTab; label: string }[] = detailHost
    ? [
        { id: "overview", label: t("drawer.tabs.overview") },
        { id: "documents", label: t("drawer.tabs.documents", { count: detailHost.documents.length }) },
        { id: "listings", label: t("drawer.tabs.listings", { count: detailHost.listingsCount }) },
        { id: "bookings", label: t("drawer.tabs.bookings", { count: detailHost.bookingsCount }) },
        { id: "money", label: t("drawer.tabs.money") },
        { id: "history", label: t("drawer.tabs.history") },
      ]
    : [];

  const handleDetailTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const isRtl = locale === "ar";
    const next = e.key === (isRtl ? "ArrowLeft" : "ArrowRight");
    const prev = e.key === (isRtl ? "ArrowRight" : "ArrowLeft");
    if (!next && !prev && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const last = detailTabs.length - 1;
    const target =
      e.key === "Home" ? 0 : e.key === "End" ? last : next ? (index === last ? 0 : index + 1) : index === 0 ? last : index - 1;
    setActiveDetailTab(detailTabs[target].id);
    const tabEl = document.getElementById(`${uid}-tab-${detailTabs[target].id}`);
    tabEl?.focus();
  };

  const now = Date.now();

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
          { id: "individual", label: t("individualTab"), count: data.facets?.hostType?.individual, icon: <User className="w-3.5 h-3.5" aria-hidden="true" /> },
          { id: "agency", label: t("agencyTab"), count: data.facets?.hostType?.agency, icon: <Building className="w-3.5 h-3.5" aria-hidden="true" /> },
          { id: "hotel", label: t("hotelTab"), count: data.facets?.hostType?.hotel, icon: <Building className="w-3.5 h-3.5" aria-hidden="true" /> },
          { id: "hostel", label: t("hostelTab"), count: data.facets?.hostType?.hostel, icon: <Bed className="w-3.5 h-3.5" aria-hidden="true" /> },
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
        onExport={can("reports.export") ? handleExportCsv : undefined}
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
        onRowClick={openDetail}
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
          ...(can("hosts.approve") ? [{
            id: "bulk_approve",
            label: t("bulk.approveSelected"),
            variant: "secondary" as const,
            onClick: () => {
              setConfirmState({
                isOpen: true,
                title: t("confirm.bulkApproveTitle", { count: selectedIds.length }),
                description: t("confirm.bulkApproveDescription"),
                variant: "primary",
                confirmLabel: t("confirm.bulkApproveConfirm"),
                action: async () => {
                  try {
                    for (const id of selectedIds) {
                      unwrap(await approveHost(id));
                    }
                    success(t("toasts.bulkApproved", { count: selectedIds.length }));
                    setSelectedIds([]);
                  } catch (e: any) {
                    error(t("toasts.bulkApproveFailed"), e.message);
                  }
                  fetchData();
                },
              });
            },
          }] : []),
          ...(can("reports.export") ? [{
            id: "bulk_export",
            label: t("bulk.exportSelected"),
            variant: "outline" as const,
            onClick: handleExportCsv,
          }] : []),
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
        <div className="space-y-2" role="group" aria-labelledby={ids.wilaya}>
          <div className="flex items-center justify-between">
            <span id={ids.wilaya} className="block text-xs font-bold text-primary">
              {t("filters.wilaya")}
            </span>
            <div
              className="flex items-center gap-1 text-[10px] text-secondary-700 font-bold"
              role="group"
              aria-label={t("filters.regionShortcuts")}
            >
              <button
                type="button"
                onClick={() => handleSelectRegion("north")}
                className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                {t("filters.north")}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleSelectRegion("high_plateaus")}
                className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                {t("filters.highPlateaus")}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleSelectRegion("south")}
                className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                {t("filters.south")}
              </button>
            </div>
          </div>
          <MultiSelect
            placeholder={t("filters.wilayaPlaceholder")}
            options={WILAYAS.map((w) => ({
              value: w.code,
              label: getWilayaLabel(w, locale),
            }))}
            selectedValues={selectedWilayas}
            onChange={setSelectedWilayas}
          />
        </div>

        {/* Status Lifecycle */}
        <div className="space-y-1.5">
          <label htmlFor={ids.status} className="block text-xs font-bold text-primary">
            {t("filters.partnerStatus")}
          </label>
          <select
            id={ids.status}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t("filters.allStatuses")}</option>
            <option value="applied">{t("filters.appliedNew")}</option>
            <option value="under_review">{tStatus("under_review")}</option>
            <option value="approved">{tStatus("approved")}</option>
            <option value="rejected">{tStatus("rejected")}</option>
            <option value="suspended">{tStatus("suspended")}</option>
            <option value="banned">{tStatus("banned")}</option>
          </select>
        </div>

        {/* Verification Status */}
        <div className="space-y-1.5">
          <label htmlFor={ids.verification} className="block text-xs font-bold text-primary">
            {t("filters.documentVerification")}
          </label>
          <select
            id={ids.verification}
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t("filters.allDocuments")}</option>
            <option value="verified">{t("filters.docsVerified")}</option>
            <option value="pending">{t("filters.docsPending")}</option>
            <option value="missing">{t("filters.docsMissing")}</option>
            <option value="expired">{t("filters.docsExpired")}</option>
          </select>
        </div>

        {/* Booking Approval Mode */}
        <div className="space-y-1.5">
          <label htmlFor={ids.approvalMode} className="block text-xs font-bold text-primary">
            {t("filters.approvalMode")}
          </label>
          <select
            id={ids.approvalMode}
            value={approvalMode}
            onChange={(e) => setApprovalMode(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t("filters.anyMode")}</option>
            <option value="instant">{t("approvalModes.instant")}</option>
            <option value="request">{t("approvalModes.request")}</option>
          </select>
        </div>

        {/* Price Range Slider */}
        <RangeSlider
          label={t("filters.priceRange")}
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
          subtitle={t("drawer.subtitle", {
            type: hostTypeLabel(detailHost.hostType),
            city: detailHost.city,
            id: detailHost.id,
          })}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailHost(null)}>
                {tCommon("close")}
              </Button>
              {detailHost.status !== "approved" ? (
                can("hosts.approve") && canHostAction(detailHost.status, "approve") && (
                  <Button variant="primary" size="sm" onClick={() => handleApprove(detailHost)}>
                    {t("drawer.approveHost")}
                  </Button>
                )
              ) : (
                can("hosts.suspend") && (
                  <Button variant="danger" size="sm" onClick={() => handleSuspend(detailHost)}>
                    {t("drawer.suspendHost")}
                  </Button>
                )
              )}
            </div>
          }
        >
          {/* Drawer Tabs (Exactly 6 Miller 7±2 compliant tabs) */}
          <div
            role="tablist"
            aria-label={t("drawer.sections")}
            className="flex items-center gap-1.5 border-b border-neutral-100 pb-2 overflow-x-auto"
          >
            {detailTabs.map((tab, index) => {
              const selected = activeDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`${uid}-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={ids.tabPanel}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveDetailTab(tab.id)}
                  onKeyDown={(e) => handleDetailTabKeyDown(e, index)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                    selected
                      ? "bg-primary text-white"
                      : "text-neutral-500 hover:text-primary hover:bg-neutral-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            id={ids.tabPanel}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-${activeDetailTab}`}
            className="pt-1"
          >
          {activeDetailTab === "overview" && (
            <div className="space-y-4 text-xs">
              <dl className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-darnaBg/40 border border-tertiary/50">
                <div>
                  <dt className="text-neutral-500 block">{t("drawer.overview.ownerName")}</dt>
                  <dd className="font-bold text-primary">{detailHost.ownerName}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 block">{t("drawer.overview.businessName")}</dt>
                  <dd className="font-bold text-primary">{detailHost.businessName || t("drawer.overview.individualPartner")}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 block">{t("drawer.overview.email")}</dt>
                  <dd className="font-bold text-primary break-all">{detailHost.email}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 block">{t("drawer.overview.phone")}</dt>
                  <dd className="font-bold text-primary" dir="ltr">{detailHost.phone}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 block">{t("drawer.overview.wilaya")}</dt>
                  <dd className="font-bold text-primary">{getWilayaName(detailHost.wilayaCode, locale)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 block">{t("drawer.overview.walletBalance")}</dt>
                  <dd className={`font-mono font-bold ${detailHost.walletBalance < 0 ? "text-accent-700" : "text-primary"}`}>
                    {formatDzd(detailHost.walletBalance, locale)}
                  </dd>
                </div>
              </dl>

              {detailHost.agencyMetadata && (
                <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                  <h4 className="font-bold text-primary">{t("drawer.overview.agencyTitle")}</h4>
                  <dl className="grid grid-cols-3 gap-2">
                    <div>
                      <dt className="text-neutral-500 block">{t("drawer.overview.teamSize")}</dt>
                      <dd className="font-bold">
                        {t("drawer.overview.teamSizeValue", { count: detailHost.agencyMetadata.teamSize })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 block">{t("drawer.overview.licenseNo")}</dt>
                      <dd className="font-bold font-mono">{detailHost.agencyMetadata.licenseNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 block">{t("drawer.overview.offersTrips")}</dt>
                      <dd className="font-bold text-secondary-700">
                        {detailHost.agencyMetadata.hasTrips ? t("drawer.overview.yes") : t("drawer.overview.no")}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {detailHost.hotelMetadata && (
                <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                  <h4 className="font-bold text-primary">{t("drawer.overview.hotelTitle")}</h4>
                  <dl className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-neutral-500 block">{t("drawer.overview.stars")}</dt>
                      <dd className="font-bold text-amber-700">
                        <span aria-hidden="true">{"★".repeat(detailHost.hotelMetadata.starRating)}</span>
                        <span className="sr-only">
                          {t("drawer.overview.starsValue", { count: detailHost.hotelMetadata.starRating })}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 block">{t("drawer.overview.totalRooms")}</dt>
                      <dd className="font-bold">
                        {t("drawer.overview.roomsValue", { count: detailHost.hotelMetadata.roomCount })}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Internal Moderator Notes */}
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <h4 className="font-bold text-primary">{t("drawer.overview.internalNotes")}</h4>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  {t("drawer.overview.internalNotesText")}
                </p>
              </div>
            </div>
          )}

          {activeDetailTab === "documents" && (
            <ul className="space-y-3 text-xs">
              {detailHost.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="p-3.5 rounded-2xl bg-white border border-tertiary/60 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="font-bold text-primary block">{doc.title}</span>
                      <span className="text-[11px] text-neutral-500">
                        {t("drawer.documents.meta", {
                          date: formatDate(doc.uploadedAt, locale),
                          status: statusLabel(doc.status),
                        })}
                      </span>
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("drawer.documents.viewFileLabel", { title: doc.title })}
                    className="px-3 py-1 rounded-lg border border-tertiary/70 text-primary font-bold hover:bg-darnaBg/70 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                  >
                    {t("drawer.documents.viewFile")}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {activeDetailTab === "listings" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-darnaBg/50 border border-tertiary/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary block">{t("drawer.listings.activeFleet")}</span>
                  <span className="text-[11px] text-neutral-500">
                    {t("drawer.listings.registered", { count: detailHost.listingsCount })}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-secondary/15 text-secondary-700 font-bold text-[11px]">
                  {tStatus("published")}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <span className="font-semibold text-neutral-700 block">{t("drawer.listings.subsections")}</span>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <dt className="text-neutral-500 block text-[10px]">{t("drawer.listings.stays")}</dt>
                    <dd className="text-primary text-sm font-bold">{formatNumber(Math.ceil(detailHost.listingsCount * 0.6), locale)}</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <dt className="text-neutral-500 block text-[10px]">{t("drawer.listings.hotelRooms")}</dt>
                    <dd className="text-primary text-sm font-bold">{formatNumber(Math.floor(detailHost.listingsCount * 0.3), locale)}</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <dt className="text-neutral-500 block text-[10px]">{t("drawer.listings.trips")}</dt>
                    <dd className="text-primary text-sm font-bold">{formatNumber(Math.max(1, Math.floor(detailHost.listingsCount * 0.1)), locale)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeDetailTab === "bookings" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">{t("drawer.bookings.title")}</span>
                  <span className="font-bold text-secondary-700 font-mono">
                    {t("drawer.bookings.completed", { count: detailHost.bookingsCount })}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {t("drawer.bookings.trackRecord")}
                </p>
              </div>
            </div>
          )}

          {activeDetailTab === "money" && (
            <div className="space-y-4 text-xs">
              {/* Wallet Summary */}
              <div className="p-4 rounded-2xl bg-darnaBg/50 border border-tertiary/60 flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block text-[11px]">{t("drawer.money.currentBalance")}</span>
                  <span className="text-xl font-bold font-mono text-primary">
                    {formatDzd(detailHost.walletBalance, locale)}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">
                  {t.rich("drawer.money.rate", {
                    rate: formatRate(detailHost.commissionRate),
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </span>
              </div>

              {/* Commission Override */}
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <h4 className="font-bold text-primary">
                  <label htmlFor={ids.rate}>{t("drawer.money.commissionTitle")}</label>
                </h4>
                <div className="flex items-center gap-3">
                  <input
                    id={ids.rate}
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    aria-invalid={!isValidCommissionRate(overrideRateInput)}
                    aria-describedby={!isValidCommissionRate(overrideRateInput) ? ids.rateError : undefined}
                    value={overrideRateInput}
                    onChange={(e) => setOverrideRateInput(Number(e.target.value))}
                    className="w-24 p-2 rounded-xl border border-tertiary/80 text-sm font-bold font-mono text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600"
                  />
                  <span className="font-bold text-sm" aria-hidden="true">%</span>
                  <Button variant="primary" size="sm" onClick={handleSaveCommission} disabled={!can("hosts.commission_override")}>
                    {t("drawer.money.saveOverride")}
                  </Button>
                </div>
                {!isValidCommissionRate(overrideRateInput) && (
                  <p id={ids.rateError} className="text-[11px] font-semibold text-accent-700">
                    {tActions("invalidRate")}
                  </p>
                )}
              </div>

              {/* Recharge Form */}
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-3">
                <h4 className="font-bold text-primary">{t("drawer.money.rechargeTitle")}</h4>
                <div>
                  <label htmlFor={ids.amount} className="block text-neutral-600 font-semibold mb-1">
                    {t("drawer.money.amount")}
                  </label>
                  <input
                    id={ids.amount}
                    type="number"
                    min={1}
                    max={MAX_RECHARGE_DZD}
                    step={1}
                    aria-invalid={!isValidDzdAmount(rechargeAmount, 1, MAX_RECHARGE_DZD)}
                    aria-describedby={!isValidDzdAmount(rechargeAmount, 1, MAX_RECHARGE_DZD) ? ids.amountError : undefined}
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-tertiary/80 text-sm font-bold font-mono text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600"
                  />
                  {!isValidDzdAmount(rechargeAmount, 1, MAX_RECHARGE_DZD) && (
                    <p id={ids.amountError} className="mt-1 text-[11px] font-semibold text-accent-700">
                      {tActions("invalidAmount", { max: formatDzd(MAX_RECHARGE_DZD, locale) })}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={ids.receipt} className="block text-neutral-600 font-semibold mb-1">
                    {t("drawer.money.receiptRef")}
                  </label>
                  <input
                    id={ids.receipt}
                    type="text"
                    value={rechargeRef}
                    onChange={(e) => setRechargeRef(e.target.value)}
                    placeholder={t("drawer.money.receiptPlaceholder")}
                    className="w-full p-2 rounded-xl border border-tertiary/80 text-xs text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600"
                  />
                </div>
                <Button variant="secondary" size="md" className="w-full" onClick={handleRechargeSubmit} disabled={!can("wallets.recharge") || !isValidDzdAmount(rechargeAmount, 1, MAX_RECHARGE_DZD) || !rechargeRef.trim()}>
                  {t("drawer.money.creditWallet")}
                </Button>
              </div>
            </div>
          )}

          {activeDetailTab === "history" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
                <h4 className="font-bold text-primary">{t("drawer.history.title")}</h4>
                <ul className="divide-y divide-neutral-100 text-[11px]">
                  <li className="py-2 flex justify-between gap-3">
                    <span className="text-neutral-700">{t("drawer.history.verifiedBy", { name: "Nadia" })}</span>
                    <span className="text-neutral-500">{format.relativeTime(now - 2 * DAY_MS, now)}</span>
                  </li>
                  <li className="py-2 flex justify-between gap-3">
                    <span className="text-neutral-700">{t("drawer.history.idApproved")}</span>
                    <span className="text-neutral-500">{format.relativeTime(now - 3 * DAY_MS, now)}</span>
                  </li>
                  <li className="py-2 flex justify-between gap-3">
                    <span className="text-neutral-700">{t("drawer.history.applicationSubmitted")}</span>
                    <span className="text-neutral-500">{format.relativeTime(now - 5 * DAY_MS, now)}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
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
      <ReasonDialog
        isOpen={!!suspendTarget}
        title={tActions("suspendHostTitle", { name: suspendTarget?.businessName || suspendTarget?.ownerName || "" })}
        description={tActions("suspendHostDescription")}
        confirmLabel={tActions("suspend")}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={confirmSuspend}
      />
    </div>
  );
}
