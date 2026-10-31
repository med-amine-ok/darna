"use client";

import React, { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Eye,
  KeyRound,
  Trash2,
  Download,
  Calendar,
  Star,
  Activity,
  MapPin,
  UserCheck,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/data-table/FilterBar";
import { FilterDrawer } from "@/components/data-table/FilterDrawer";
import {
  ActiveFilterChips,
  ActiveFilterItem,
} from "@/components/data-table/ActiveFilterChips";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { GuestUser, PaginatedResult } from "@/lib/types";
import { getWilayaName, getWilayaLabel, WILAYAS } from "@/lib/utils/wilayas";
import {
  formatDzd,
  formatDate,
  formatNumber,
  intlLocale,
} from "@/lib/utils/format";
import {
  listUsers,
  suspendUser,
  banUser,
  deleteUser,
  updateUserStatus,
} from "@/lib/actions/users";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";

export interface UsersClientProps {
  initialData: PaginatedResult<GuestUser>;
  initialStatus: string;
  initialRole: string;
}

const SELECT_CLASS =
  "w-full text-xs rounded-xl bg-white shadow-e1 p-2 text-primary focus:outline-none focus:border-primary-600 focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 cursor-pointer";

// Demo activity timestamp (mock panel content), rendered in the viewer's locale.
const DEMO_LOGIN_AT = "2024-03-20T08:34:00";

export default function UsersClient({
  initialData,
  initialStatus,
  initialRole,
}: UsersClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const { success, error, info } = useToast();
  const can = useCan();
  const [isPending, startTransition] = useTransition();
  const uid = useId();

  const statusLabel = (value: string) =>
    tStatus.has(value) ? tStatus(value) : value;
  const roleLabel = (value: string) =>
    t.has(`roles.${value}`) ? t(`roles.${value}`) : value;
  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale(locale), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const [data, setData] = useState<PaginatedResult<GuestUser>>(initialData);
  const [status, setStatus] = useState<string>(initialStatus);
  const [role, setRole] = useState<string>(initialRole);
  const [search, setSearch] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [isFlaggedOnly, setIsFlaggedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<GuestUser | null>(null);
  const [panelTab, setPanelTab] = useState("profile");

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
      const res = unwrap(
        await listUsers({
          status: overrideParams.status ?? status,
          role: overrideParams.role ?? role,
          search: overrideParams.search ?? search,
          wilayaCode:
            overrideParams.selectedWilaya ??
            (selectedWilaya !== "all" ? selectedWilaya : undefined),
          isFlagged:
            overrideParams.isFlaggedOnly ?? (isFlaggedOnly ? true : undefined),
          page: overrideParams.page ?? currentPage,
          pageSize: overrideParams.pageSize ?? pageSize,
        }),
      );
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
  if (status !== "all")
    activeChips.push({
      key: "status",
      label: t("status"),
      valueDisplay: statusLabel(status),
    });
  if (role !== "all")
    activeChips.push({
      key: "role",
      label: t("role"),
      valueDisplay: roleLabel(role),
    });
  if (selectedWilaya !== "all") {
    activeChips.push({
      key: "wilaya",
      label: t("wilaya"),
      valueDisplay: getWilayaName(selectedWilaya, locale),
    });
  }
  if (isFlaggedOnly)
    activeChips.push({
      key: "flagged",
      label: tStatus("flagged"),
      valueDisplay: t("flaggedOnly"),
    });

  const handleRemoveChip = (key: string) => {
    if (key === "status") {
      setStatus("all");
      fetchData({ status: "all" });
    }
    if (key === "role") {
      setRole("all");
      fetchData({ role: "all" });
    }
    if (key === "wilaya") {
      setSelectedWilaya("all");
      fetchData({ selectedWilaya: "all" });
    }
    if (key === "flagged") {
      setIsFlaggedOnly(false);
      fetchData({ isFlaggedOnly: false });
    }
  };

  const handleClearAll = () => {
    setStatus("all");
    setRole("all");
    setSelectedWilaya("all");
    setIsFlaggedOnly(false);
    setSearch("");
    fetchData({
      status: "all",
      role: "all",
      selectedWilaya: "all",
      isFlaggedOnly: false,
      search: "",
      page: 1,
    });
  };

  const handleSuspend = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: t("confirm.suspendTitle"),
      description: t("confirm.suspendDescription", { name: user.name }),
      variant: "danger",
      confirmLabel: t("confirm.suspendConfirm"),
      action: async () => {
        try {
          // Reason is stored in the audit trail, intentionally not localized.
          const updated = unwrap(
            await suspendUser(
              user.id,
              "Violation des conditions d'utilisation",
            ),
          );
          info(t("toasts.suspended", { name: user.name }));
          setDetailUser(updated);
          fetchData();
        } catch (e: any) {
          error(t("toasts.suspendFailed"), e.message);
        }
      },
    });
  };

  const handleBan = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: t("confirm.banTitle"),
      description: t("confirm.banDescription", { name: user.name }),
      variant: "danger",
      confirmLabel: t("confirm.banConfirm"),
      action: async () => {
        try {
          // Reason is stored in the audit trail, intentionally not localized.
          const updated = unwrap(
            await banUser(user.id, "Manquement grave à la sécurité"),
          );
          info(t("toasts.banned", { name: user.name }));
          setDetailUser(updated);
          fetchData();
        } catch (e: any) {
          error(t("toasts.banFailed"), e.message);
        }
      },
    });
  };

  const handleDelete = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: t("confirm.deleteTitle"),
      description: t("confirm.deleteDescription", { name: user.name }),
      variant: "danger",
      confirmLabel: t("confirm.deleteConfirm"),
      requireTypedConfirmation: user.name,
      action: async () => {
        try {
          unwrap(await deleteUser(user.id));
          info(t("toasts.deleted", { name: user.name }));
          setDetailUser(null);
          fetchData();
        } catch (e: any) {
          error(t("toasts.deleteFailed"), e.message);
        }
      },
    });
  };

  const handleResetPassword = (user: GuestUser) => {
    success(t("toasts.resetSent", { email: user.email }));
  };

  const facets = data.facets || {};
  const statusFacets = facets.status || {};
  const totalUsers = statusFacets.all || data.total || 1420;
  const activeUsers = statusFacets.active || 1280;
  const suspendedUsers = statusFacets.suspended || 32;
  const bannedUsers = statusFacets.banned || 18;
  const roleFacets = facets.role || {};
  const guestUsers = roleFacets.guest || 980;

  const kpis = [
    {
      id: "all",
      label: t("kpis.all"),
      value: totalUsers,
      icon: Users,
      colorVariant: "primary" as const,
      active: status === "all",
      onClick: () => handleStatusChange("all"),
    },
    {
      id: "active",
      label: t("kpis.active"),
      value: activeUsers,
      icon: CheckCircle2,
      colorVariant: "secondary" as const,
      active: status === "active",
      onClick: () => handleStatusChange("active"),
    },
    {
      id: "guests",
      label: t("kpis.guests"),
      value: guestUsers,
      icon: UserCheck,
      colorVariant: "tertiary" as const,
      active: role === "guest",
      onClick: () => {
        const nextRole = role === "guest" ? "all" : "guest";
        setRole(nextRole);
        fetchData({ role: nextRole, page: 1 });
      },
    },
    {
      id: "suspended",
      label: t("kpis.suspended"),
      value: suspendedUsers,
      icon: ShieldAlert,
      colorVariant: "tertiary" as const,
      active: status === "suspended",
      onClick: () => handleStatusChange("suspended"),
    },
    {
      id: "banned",
      label: t("kpis.banned"),
      value: bannedUsers,
      icon: Ban,
      colorVariant: "accent" as const,
      active: status === "banned",
      onClick: () => handleStatusChange("banned"),
    },
  ];

  const columns: Column<GuestUser>[] = [
    {
      key: "name",
      header: t("guestUser"),
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size={36} />
          <div className="min-w-0">
            <span className="block font-semibold text-primary truncate leading-tight">
              {u.name}
            </span>
            <span className="block text-[11px] text-primary-600 truncate leading-snug">
              {u.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "wilayaCode",
      header: t("location"),
      render: (u) => (
        <span className="text-xs text-primary-700 flex items-center gap-1 whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" />
          {u.wilayaCode ? getWilayaName(u.wilayaCode, locale) : ","}
        </span>
      ),
    },
    {
      key: "role",
      header: t("role"),
      render: (u) => (
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-darnaBg-300 text-primary-800 whitespace-nowrap">
          {u.role === "both" ? roleLabel("both") : roleLabel("guest")}
        </span>
      ),
    },
    {
      key: "bookingsCount",
      header: t("bookings"),
      sortable: true,
      render: (u) => (
        <span className="text-xs font-medium text-primary-800 tabular-nums">
          {formatNumber(u.bookingsCount, locale)}
        </span>
      ),
    },
    {
      key: "totalSpentDzd",
      header: t("totalSpend"),
      sortable: true,
      render: (u) => (
        <span className="text-xs font-semibold text-primary-900 tabular-nums whitespace-nowrap">
          {formatDzd(u.totalSpentDzd, locale)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("status"),
      render: (u) => <StatusPill status={u.status} />,
    },
    {
      key: "actions",
      header: tCommon("actions"),
      render: (u) => (
        // Stops row-click propagation only; the buttons inside are the interactive elements.
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-primary-600 hover:text-primary"
            onClick={() => setDetailUser(u)}
            title={t("quickView", { name: u.name })}
            aria-label={t("quickView", { name: u.name })}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </Button>
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="p-1 text-primary-600"
                aria-label={t("moreActions", { name: u.name })}
                aria-haspopup="menu"
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </Button>
            }
            items={[
              {
                label: t("menu.viewProfile"),
                icon: <Eye className="w-3.5 h-3.5" aria-hidden="true" />,
                onClick: () => setDetailUser(u),
              },
              ...(can("users.suspend")
                ? [
                    {
                      label: t("menu.markActive"),
                      icon: (
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-secondary"
                          aria-hidden="true"
                        />
                      ),
                      disabled: u.status === "active",
                      onClick: async () => {
                        try {
                          unwrap(await updateUserStatus(u.id, "active"));
                          success(t("toasts.markedActive"));
                          fetchData();
                        } catch (e: any) {
                          error(tCommon("error"), e.message);
                        }
                      },
                    },
                    {
                      label: t("menu.markPending"),
                      icon: (
                        <Clock
                          className="w-3.5 h-3.5 text-amber-700"
                          aria-hidden="true"
                        />
                      ),
                      disabled: u.status === "pending",
                      onClick: async () => {
                        try {
                          unwrap(await updateUserStatus(u.id, "pending"));
                          info(t("toasts.markedPending"));
                          fetchData();
                        } catch (e: any) {
                          error(tCommon("error"), e.message);
                        }
                      },
                    },
                    {
                      label: t("menu.suspendAccount"),
                      icon: (
                        <ShieldAlert
                          className="w-3.5 h-3.5 text-amber-700"
                          aria-hidden="true"
                        />
                      ),
                      onClick: () => handleSuspend(u),
                      variant: "danger" as const,
                      disabled: u.status === "suspended",
                    },
                  ]
                : []),
              ...(can("users.ban")
                ? [
                    {
                      label: t("menu.banAccount"),
                      icon: (
                        <Ban
                          className="w-3.5 h-3.5 text-accent"
                          aria-hidden="true"
                        />
                      ),
                      onClick: () => handleBan(u),
                      variant: "danger" as const,
                      disabled: u.status === "banned",
                    },
                  ]
                : []),
              {
                label: t("resetPassword"),
                icon: <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />,
                onClick: () => handleResetPassword(u),
              },
              ...(can("users.delete")
                ? [
                    {
                      label: t("delete"),
                      icon: (
                        <Trash2
                          className="w-3.5 h-3.5 text-accent"
                          aria-hidden="true"
                        />
                      ),
                      onClick: () => handleDelete(u),
                      variant: "danger" as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  const ids = {
    status: `${uid}-status`,
    role: `${uid}-role`,
    wilaya: `${uid}-wilaya`,
  };

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          can("reports.export")
            ? [
                {
                  label: tCommon("export"),
                  icon: <Download className="w-4 h-4" aria-hidden="true" />,
                  variant: "outline" as const,
                  onClick: () => success(t("toasts.exportReady")),
                },
              ]
            : []
        }
      />

      <KpiStrip cards={kpis} />

      <FilterBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("searchPlaceholder")}
        activeFilterCount={activeChips.length}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        totalResults={data.total}
        resultsLabel={t("resultsLabel")}
      />

      <ActiveFilterChips
        filters={activeChips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAll}
      />

      <SplitView
        isOpen={!!detailUser}
        mainContent={
          <div className="space-y-4">
            <DataTable
              columns={
                detailUser
                  ? columns.filter(
                      (c) =>
                        ![
                          "wilayaCode",
                          "role",
                          "bookingsCount",
                          "actions",
                        ].includes(c.key),
                    )
                  : columns
              }
              data={data.rows}
              keyExtractor={(u) => u.id}
              selectedIds={selectedIds}
              onSelectRow={(id) =>
                setSelectedIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((i) => i !== id)
                    : [...prev, id],
                )
              }
              onSelectAll={() =>
                setSelectedIds((prev) =>
                  prev.length === data.rows.length
                    ? []
                    : data.rows.map((u) => u.id),
                )
              }
              isAllSelected={
                selectedIds.length > 0 &&
                selectedIds.length === data.rows.length
              }
              isLoading={isPending}
              onRowClick={(u) => setDetailUser(u)}
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
          </div>
        }
        detailPanel={
          detailUser ? (
            <DetailPanel
              onClose={() => setDetailUser(null)}
              title={detailUser.name}
              subtitle={t("detail.subtitle", {
                id: detailUser.id,
                email: detailUser.email,
              })}
              status={detailUser.status}
              tabs={[
                { id: "profile", label: t("detail.tabs.profile") },
                { id: "bookings", label: t("detail.tabs.bookings") },
                { id: "reviews", label: t("detail.tabs.reviews") },
                { id: "payments", label: t("detail.tabs.payments") },
                { id: "activity", label: t("detail.tabs.activity") },
              ]}
              activeTab={panelTab}
              onTabChange={setPanelTab}
              footer={
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(detailUser)}
                      leftIcon={
                        <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                      }
                    >
                      {t("detail.resetPassword")}
                    </Button>
                    {can("users.suspend") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-accent-700 border-accent/40 hover:bg-accent/10"
                        onClick={() => handleSuspend(detailUser)}
                      >
                        {t("detail.suspend")}
                      </Button>
                    )}
                  </div>
                  {can("users.ban") && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleBan(detailUser)}
                    >
                      {t("detail.ban")}
                    </Button>
                  )}
                </div>
              }
            >
              {panelTab === "profile" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-darnaBg-100">
                    <Avatar name={detailUser.name} size={54} />
                    <div>
                      <h4 className="font-semibold text-primary text-base">
                        {detailUser.name}
                      </h4>
                      <p className="text-xs text-primary-600">
                        {detailUser.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusPill status={detailUser.status} />
                        <span className="text-[11px] text-primary-600">
                          {t("detail.joinedOn", {
                            date: formatDate(detailUser.joinedAt, locale),
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Price Grid (Price) */}
                  <div className="p-3.5 rounded-xl bg-white shadow-e1 space-y-2">
                    <h5 className="text-xs font-semibold text-primary block">
                      {t("detail.financialTitle")}
                    </h5>
                    <dl className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-darnaBg-100">
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.totalSpent")}
                        </dt>
                        <dd className="font-mono font-semibold text-xs text-primary block mt-0.5">
                          {formatDzd(detailUser.totalSpentDzd, locale)}
                        </dd>
                      </div>
                      <div className="p-2.5 rounded-lg bg-darnaBg-100">
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.walletBalance")}
                        </dt>
                        <dd className="font-mono font-semibold text-xs text-secondary-700 block mt-0.5">
                          {formatDzd(detailUser.walletBalanceDzd || 0, locale)}
                        </dd>
                      </div>
                      <div className="p-2.5 rounded-lg bg-darnaBg-100">
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.avgBooking")}
                        </dt>
                        <dd className="font-mono font-semibold text-xs text-primary block mt-0.5">
                          {formatDzd(
                            Math.round(
                              detailUser.totalSpentDzd /
                                Math.max(1, detailUser.bookingsCount),
                            ),
                            locale,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Activity Timestamps (Time) */}
                  <div className="p-3.5 rounded-xl bg-white shadow-e1 space-y-2">
                    <h5 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Clock
                        className="w-3.5 h-3.5 text-secondary"
                        aria-hidden="true"
                      />
                      <span>{t("detail.activityTitle")}</span>
                    </h5>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.registeredOn")}
                        </dt>
                        <dd className="font-medium text-primary-700">
                          {formatDate(detailUser.joinedAt, locale)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.lastActive")}
                        </dt>
                        <dd className="font-medium text-primary-700">
                          {formatDate(
                            detailUser.lastActiveAt || detailUser.joinedAt,
                            locale,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* About User Section (About) */}
                  <div className="p-3.5 rounded-xl bg-white shadow-e1 space-y-2">
                    <h5 className="text-xs font-semibold text-primary block">
                      {t("detail.aboutTitle")}
                    </h5>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.userRole")}
                        </dt>
                        <dd className="font-semibold text-primary">
                          {detailUser.role === "both"
                            ? roleLabel("both")
                            : roleLabel("guest")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.language")}
                        </dt>
                        <dd className="font-semibold text-primary uppercase">
                          {detailUser.preferredLanguage || "FR"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.bookings")}
                        </dt>
                        <dd className="font-semibold text-primary">
                          {t("detail.bookingsValue", {
                            count: detailUser.bookingsCount,
                          })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-primary-600 block">
                          {t("detail.reviewsFavs")}
                        </dt>
                        <dd className="font-semibold text-primary">
                          {t("detail.reviewsFavsValue", {
                            reviews: detailUser.reviewsWrittenCount || 0,
                            favs: detailUser.favoritesCount || 0,
                          })}
                        </dd>
                      </div>
                    </dl>
                    <div className="pt-2 border-t border-primary/[0.08] flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-primary-600">
                        <ShieldCheck
                          className="w-3.5 h-3.5 text-secondary"
                          aria-hidden="true"
                        />{" "}
                        {t("detail.identityStatus")}
                      </span>
                      <span className="text-secondary-700 font-semibold text-xs">
                        {detailUser.idVerified
                          ? t("detail.idVerified")
                          : t("detail.idPending")}
                      </span>
                    </div>
                  </div>

                  {/* Description / Bio Section (Disc) */}
                  <div className="p-3.5 rounded-xl bg-white shadow-e1 space-y-1.5">
                    <h5 className="text-xs font-semibold text-primary block">
                      {t("detail.bioTitle")}
                    </h5>
                    <p className="text-xs text-primary-600 leading-relaxed bg-darnaBg-100 p-3 rounded-lg">
                      {t("detail.bioText")}
                    </p>
                  </div>
                </div>
              )}

              {panelTab === "bookings" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white shadow-e1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-primary">
                        #R1248 · Villa Hydra
                      </span>
                      <StatusPill status="confirmed" />
                    </div>
                    <p className="text-[11px] text-primary-600 mt-1">
                      {t("detail.dateRange", {
                        start: formatDate("2024-03-12", locale),
                        end: formatDate("2024-03-15", locale),
                        duration: t("detail.nights", { count: 3 }),
                      })}
                    </p>
                    <p className="font-mono font-semibold text-xs text-primary mt-1">
                      {formatDzd(75000, locale)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white shadow-e1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-primary">
                        #R1092 · Excursion Tassili
                      </span>
                      <StatusPill status="completed" />
                    </div>
                    <p className="text-[11px] text-primary-600 mt-1">
                      {t("detail.dateRange", {
                        start: formatDate("2024-02-10", locale),
                        end: formatDate("2024-02-14", locale),
                        duration: t("detail.days", { count: 4 }),
                      })}
                    </p>
                    <p className="font-mono font-semibold text-xs text-primary mt-1">
                      {formatDzd(120000, locale)}
                    </p>
                  </div>
                </div>
              )}

              {panelTab === "reviews" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white shadow-e1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-primary">
                        Villa Hydra
                      </span>
                      <div
                        className="flex items-center text-secondary-700 text-xs"
                        role="img"
                        aria-label={t("detail.rating", {
                          rating: formatNumber(5, locale),
                        })}
                      >
                        <Star
                          className="w-3.5 h-3.5 fill-current me-1"
                          aria-hidden="true"
                        />{" "}
                        5.0
                      </div>
                    </div>
                    {/* Review body is user-generated content (mock record), shown as written. */}
                    <p
                      className="text-xs text-primary-600 mt-1 italic"
                      lang="fr"
                    >
                      &ldquo;Superbe accueil, maison propre et spacieuse. Hôte
                      très arrangeant !&rdquo;
                    </p>
                    <span className="text-[11px] text-primary-600 block mt-1">
                      {formatDate("2024-03-16", locale)}
                    </span>
                  </div>
                </div>
              )}

              {panelTab === "payments" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white shadow-e1 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-primary block">
                        {t("detail.cardPayment")}
                      </span>
                      <span className="text-[11px] text-primary-600">
                        {t("detail.transaction", { ref: "#TX-9012" })}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-xs text-secondary-700">
                      {formatDzd(75000, locale)}
                    </span>
                  </div>
                </div>
              )}

              {panelTab === "activity" && (
                <ul className="space-y-2 text-xs">
                  <li className="flex items-start gap-2 p-2">
                    <Activity
                      className="w-4 h-4 text-secondary mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-primary">
                        {t("detail.login")}
                      </p>
                      <span className="text-[11px] text-primary-600">
                        {t("detail.loginMeta", {
                          time: formatTime(DEMO_LOGIN_AT),
                          ip: "105.102.x.x",
                        })}
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 p-2">
                    <Calendar
                      className="w-4 h-4 text-primary mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-primary">
                        {t("detail.bookingMade", { ref: "#R1248" })}
                      </p>
                      <span className="text-[11px] text-primary-600">
                        {formatDate("2024-03-12", locale)}
                      </span>
                    </div>
                  </li>
                </ul>
              )}
            </DetailPanel>
          ) : undefined
        }
      />

      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        activeFilterCount={activeChips.length}
        onReset={handleClearAll}
        onApply={() => fetchData({ page: 1 })}
      >
        <div className="space-y-1.5">
          <label
            htmlFor={ids.status}
            className="block text-xs font-semibold text-primary"
          >
            {t("status")}
          </label>
          <select
            id={ids.status}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t("filters.allStatuses")}</option>
            <option value="active">{tStatus("active")}</option>
            <option value="suspended">{tStatus("suspended")}</option>
            <option value="banned">{tStatus("banned")}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={ids.role}
            className="block text-xs font-semibold text-primary"
          >
            {t("role")}
          </label>
          <select
            id={ids.role}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t("filters.allRoles")}</option>
            <option value="guest">{t("filters.guestOnly")}</option>
            <option value="both">{t("filters.guestAndHost")}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={ids.wilaya}
            className="block text-xs font-semibold text-primary"
          >
            {t("wilaya")}
          </label>
          <select
            id={ids.wilaya}
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t("filters.allWilayas")}</option>
            {WILAYAS.map((w) => (
              <option key={w.code} value={w.code}>
                {getWilayaLabel(w, locale)}
              </option>
            ))}
          </select>
        </div>
      </FilterDrawer>

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
