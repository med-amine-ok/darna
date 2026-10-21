"use client";

import React, { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Ban,
  CheckCircle2,
  XCircle,
  Eye,
  KeyRound,
  Trash2,
  RotateCcw,
} from "lucide-react";
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
import { useToast } from "@/components/ui/Toast";
import { GuestUser, PaginatedResult } from "@/lib/types";
import { getWilayaName, WILAYAS } from "@/lib/utils/wilayas";
import { formatDzd, formatDate } from "@/lib/utils/format";
import {
  listUsers,
  suspendUser,
  unsuspendUser,
  banUser,
  deleteUser,
  restoreUser,
} from "@/lib/data/users";

export interface UsersClientProps {
  initialData: PaginatedResult<GuestUser>;
  initialStatus: string;
  initialRole: string;
}

export default function UsersClient({
  initialData,
  initialStatus,
  initialRole,
}: UsersClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const { success, error, info } = useToast();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<PaginatedResult<GuestUser>>(initialData);
  const [status, setStatus] = useState<string>(initialStatus);
  const [role, setRole] = useState<string>(initialRole);
  const [search, setSearch] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [isFlaggedOnly, setIsFlaggedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<GuestUser | null>(null);

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
      const res = await listUsers({
        status: overrideParams.status ?? status,
        role: overrideParams.role ?? role,
        search: overrideParams.search ?? search,
        wilayaCode: overrideParams.selectedWilaya ?? (selectedWilaya !== "all" ? selectedWilaya : undefined),
        isFlagged: overrideParams.isFlaggedOnly ?? (isFlaggedOnly ? true : undefined),
        page: overrideParams.page ?? currentPage,
        pageSize: overrideParams.pageSize ?? pageSize,
      });
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
  if (status !== "all") activeChips.push({ key: "status", label: "Status", valueDisplay: status });
  if (role !== "all") activeChips.push({ key: "role", label: "Role", valueDisplay: role });
  if (selectedWilaya !== "all") activeChips.push({ key: "wilaya", label: "Wilaya", valueDisplay: selectedWilaya });
  if (isFlaggedOnly) activeChips.push({ key: "flagged", label: "Flagged", valueDisplay: "Flagged Only" });

  const handleRemoveChip = (key: string) => {
    if (key === "status") { setStatus("all"); fetchData({ status: "all" }); }
    if (key === "role") { setRole("all"); fetchData({ role: "all" }); }
    if (key === "wilaya") { setSelectedWilaya("all"); fetchData({ selectedWilaya: "all" }); }
    if (key === "flagged") { setIsFlaggedOnly(false); fetchData({ isFlaggedOnly: false }); }
  };

  const handleClearAll = () => {
    setStatus("all");
    setRole("all");
    setSelectedWilaya("all");
    setIsFlaggedOnly(false);
    setSearch("");
    fetchData({ status: "all", role: "all", selectedWilaya: "all", isFlaggedOnly: false, search: "", page: 1 });
  };

  const handleSuspend = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: "Suspend User Account",
      description: `Temporarily suspend ${user.name}. They will not be able to book stays or leave reviews.`,
      variant: "danger",
      confirmLabel: "Suspend User",
      action: async () => {
        try {
          const updated = await suspendUser(user.id, "Violation of platform terms", { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Suspended user ${user.name}`);
          setDetailUser(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to suspend user");
        }
      },
    });
  };

  const handleBan = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: "Ban User Account",
      description: `Permanently ban ${user.name} from DARNA platform.`,
      variant: "danger",
      confirmLabel: "Ban User",
      action: async () => {
        try {
          const updated = await banUser(user.id, "Severe trust breach", { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Banned user ${user.name}`);
          setDetailUser(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to ban user");
        }
      },
    });
  };

  const handleDelete = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: "Delete User Confirmation",
      description: `Soft delete user record ${user.name}. Type user name below to confirm.`,
      variant: "danger",
      confirmLabel: "Delete User",
      requireTypedConfirmation: user.name,
      action: async () => {
        try {
          await deleteUser(user.id, { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Deleted user ${user.name}`);
          setDetailUser(null);
          fetchData();
        } catch (e: any) {
          error(e.message || "Failed to delete user");
        }
      },
    });
  };

  const handleResetPassword = (user: GuestUser) => {
    success(`Password reset link dispatched to ${user.email}`);
  };

  const columns: Column<GuestUser>[] = [
    {
      key: "name",
      header: t("guestUser"),
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size={36} />
          <div className="min-w-0">
            <span className="block font-bold text-primary truncate leading-tight">
              {u.name}
            </span>
            <span className="block text-[11px] text-neutral-400 truncate leading-snug">
              {u.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: t("role"),
      render: (u) => (
        <Badge variant={u.role === "both" ? "primary" : "secondary"}>
          {u.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: t("status"),
      render: (u) => (
        <StatusPill
          status={u.status}
          size="sm"
        />
      ),
    },
    {
      key: "emailVerified",
      header: t("verification"),
      render: (u) => (
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={`font-semibold ${u.emailVerified ? "text-secondary" : "text-neutral-400"}`}>
            {t("email")}: {u.emailVerified ? "✓" : "✗"}
          </span>
          <span className="text-neutral-300">·</span>
          <span className={`font-semibold ${u.idVerified ? "text-secondary" : "text-neutral-400"}`}>
            {t("id")}: {u.idVerified ? "✓" : "✗"}
          </span>
        </div>
      ),
    },
    {
      key: "bookingsCount",
      header: t("bookings"),
      align: "center",
      sortable: true,
      render: (u) => <span className="font-bold tabular-nums">{u.bookingsCount}</span>,
    },
    {
      key: "totalSpentDzd",
      header: t("totalSpend"),
      align: "right",
      sortable: true,
      render: (u) => (
        <span className="font-mono font-bold text-primary tabular-nums">
          {formatDzd(u.totalSpentDzd, locale)}
        </span>
      ),
    },
    {
      key: "joinedAt",
      header: t("joined"),
      align: "right",
      render: (u) => (
        <span className="text-neutral-500 tabular-nums">
          {formatDate(u.joinedAt, locale)}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      align: "right",
      render: (u) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDetailUser(u)}
            className="text-[11px] py-1 px-2 text-neutral-600"
          >
            <Eye className="w-3.5 h-3.5 me-1" /> {t("view")}
          </Button>

          <DropdownMenu
            items={[
              {
                label: t("resetPassword"),
                icon: <KeyRound className="w-3.5 h-3.5" />,
                onClick: () => handleResetPassword(u),
              },
              {
                label: t("suspend"),
                icon: <ShieldAlert className="w-3.5 h-3.5" />,
                onClick: () => handleSuspend(u),
                variant: "danger",
                disabled: u.status === "suspended",
              },
              {
                label: t("ban"),
                icon: <Ban className="w-3.5 h-3.5" />,
                onClick: () => handleBan(u),
                variant: "danger",
                disabled: u.status === "banned",
              },
              {
                label: t("delete"),
                icon: <Trash2 className="w-3.5 h-3.5" />,
                onClick: () => handleDelete(u),
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
          {t("title")}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <FilterBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("searchPlaceholder")}
        activeFilterCount={activeChips.length}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        totalResults={data.total}
        resultsLabel={t("bookings")}
      />

      <ActiveFilterChips
        filters={activeChips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAll}
      />

      <DataTable
        columns={columns}
        data={data.rows}
        keyExtractor={(u) => u.id}
        selectedIds={selectedIds}
        onSelectRow={(id) =>
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
          )
        }
        onSelectAll={() =>
          setSelectedIds((prev) =>
            prev.length === data.rows.length ? [] : data.rows.map((u) => u.id)
          )
        }
        isAllSelected={selectedIds.length > 0 && selectedIds.length === data.rows.length}
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

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        activeFilterCount={activeChips.length}
        onReset={handleClearAll}
        onApply={() => fetchData({ page: 1 })}
      >
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="guest">Guest Only</option>
            <option value="both">Guest & Host</option>
          </select>
        </div>
      </FilterDrawer>

      {/* User Detail Drawer */}
      {detailUser && (
        <Drawer
          isOpen={!!detailUser}
          onClose={() => setDetailUser(null)}
          size="md"
          title={detailUser.name}
          subtitle={`User ID: ${detailUser.id} · ${detailUser.email}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailUser(null)}>
                {tCommon("close")}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleSuspend(detailUser)}>
                {t("suspend")}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-start">
            <div className="p-4 rounded-2xl bg-darnaBg/50 border border-tertiary/60 grid grid-cols-2 gap-3">
              <div>
                <span className="text-neutral-400 block">{t("email")}</span>
                <span className="font-bold text-primary">{detailUser.phone || "—"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Wilaya</span>
                <span className="font-bold text-primary">{detailUser.wilayaCode ? getWilayaName(detailUser.wilayaCode, locale) : "Algiers"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">{t("totalSpend")}</span>
                <span className="font-bold font-mono text-primary">{formatDzd(detailUser.totalSpentDzd, locale)}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">{t("bookings")}</span>
                <span className="font-bold">{detailUser.bookingsCount}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-tertiary/60 space-y-2">
              <h4 className="font-bold text-primary">{t("verification")}</h4>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 font-semibold text-secondary">
                  <ShieldCheck className="w-4 h-4" /> {t("email")}
                </span>
                <span className="flex items-center gap-1 font-semibold text-secondary">
                  <ShieldCheck className="w-4 h-4" /> {t("id")}
                </span>
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
