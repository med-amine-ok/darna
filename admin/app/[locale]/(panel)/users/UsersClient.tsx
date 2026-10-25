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
  Download,
  Calendar,
  CreditCard,
  Star,
  Activity,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/data-table/FilterBar";
import { FilterDrawer } from "@/components/data-table/FilterDrawer";
import { ActiveFilterChips, ActiveFilterItem } from "@/components/data-table/ActiveFilterChips";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { GuestUser, PaginatedResult } from "@/lib/types";
import { getWilayaName, getWilayaLabel, WILAYAS } from "@/lib/utils/wilayas";
import { formatDzd, formatDate } from "@/lib/utils/format";
import {
  listUsers,
  suspendUser,
  unsuspendUser,
  banUser,
  deleteUser,
  restoreUser,
  updateUserStatus,
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
  if (status !== "all") activeChips.push({ key: "status", label: "Statut", valueDisplay: status });
  if (role !== "all") activeChips.push({ key: "role", label: "Rôle", valueDisplay: role });
  if (selectedWilaya !== "all") activeChips.push({ key: "wilaya", label: "Wilaya", valueDisplay: selectedWilaya });
  if (isFlaggedOnly) activeChips.push({ key: "flagged", label: "Signalé", valueDisplay: "Signalé uniquement" });

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
      title: "Suspendre le compte utilisateur",
      description: `Suspendre temporairement ${user.name}. L'utilisateur ne pourra plus réserver ni publier d'avis.`,
      variant: "danger",
      confirmLabel: "Suspendre l'utilisateur",
      action: async () => {
        try {
          const updated = await suspendUser(user.id, "Violation des conditions d'utilisation", { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Utilisateur ${user.name} suspendu`);
          setDetailUser(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Impossible de suspendre l'utilisateur");
        }
      },
    });
  };

  const handleBan = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: "Bannir définitivement l'utilisateur",
      description: `Bannir définitivement ${user.name} de la plateforme DARNA.`,
      variant: "danger",
      confirmLabel: "Bannir l'utilisateur",
      action: async () => {
        try {
          const updated = await banUser(user.id, "Manquement grave à la sécurité", { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Utilisateur ${user.name} banni`);
          setDetailUser(updated);
          fetchData();
        } catch (e: any) {
          error(e.message || "Impossible de bannir l'utilisateur");
        }
      },
    });
  };

  const handleDelete = (user: GuestUser) => {
    setConfirmState({
      isOpen: true,
      title: "Supprimer l'utilisateur",
      description: `Suppression réversible du compte de ${user.name}. Tapez le nom de l'utilisateur pour confirmer.`,
      variant: "danger",
      confirmLabel: "Supprimer le compte",
      requireTypedConfirmation: user.name,
      action: async () => {
        try {
          await deleteUser(user.id, { id: "adm_01", name: "Admin", role: "super_admin" });
          info(`Utilisateur ${user.name} supprimé`);
          setDetailUser(null);
          fetchData();
        } catch (e: any) {
          error(e.message || "Impossible de supprimer l'utilisateur");
        }
      },
    });
  };

  const handleResetPassword = (user: GuestUser) => {
    success(`Lien de réinitialisation envoyé à ${user.email}`);
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
      label: "Tous les utilisateurs",
      value: totalUsers,
      icon: Users,
      colorVariant: "primary" as const,
      active: status === "all",
      onClick: () => handleStatusChange("all"),
    },
    {
      id: "active",
      label: "Comptes actifs",
      value: activeUsers,
      icon: CheckCircle2,
      colorVariant: "secondary" as const,
      active: status === "active",
      onClick: () => handleStatusChange("active"),
    },
    {
      id: "guests",
      label: "Voyageurs",
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
      label: "Comptes suspendus",
      value: suspendedUsers,
      icon: ShieldAlert,
      colorVariant: "tertiary" as const,
      active: status === "suspended",
      onClick: () => handleStatusChange("suspended"),
    },
    {
      id: "banned",
      label: "Comptes bannis",
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
      key: "wilayaCode",
      header: "Localisation",
      render: (u) => (
        <span className="text-xs text-neutral-600 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
          {u.wilayaCode ? getWilayaName(u.wilayaCode, locale) : "Alger"}
        </span>
      ),
    },
    {
      key: "role",
      header: "Rôle",
      render: (u) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-primary">
          {u.role === "both" ? "Voyageur & Hôte" : "Voyageur"}
        </span>
      ),
    },
    {
      key: "bookingsCount",
      header: t("bookings"),
      sortable: true,
      render: (u) => (
        <span className="text-xs font-mono font-medium text-primary">
          {u.bookingsCount}
        </span>
      ),
    },
    {
      key: "totalSpentDzd",
      header: t("totalSpend"),
      sortable: true,
      render: (u) => (
        <span className="text-xs font-mono font-bold text-primary">
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
      header: "",
      render: (u) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-neutral-500 hover:text-primary"
            onClick={() => setDetailUser(u)}
            title="Aperçu rapide"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm" className="p-1 text-neutral-500">
                ⋯
              </Button>
            }
            items={[
              {
                label: locale === "ar" ? "عرض الملف الشخصي" : locale === "en" ? "View profile" : "Voir le profil",
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => setDetailUser(u),
              },
              {
                label: locale === "ar" ? "تفعيل الحساب (Active)" : locale === "en" ? "Mark as Active / Approved" : "Activer / Approuver",
                icon: <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />,
                disabled: u.status === "active",
                onClick: async () => {
                  await updateUserStatus(u.id, "active");
                  success(locale === "ar" ? "تم تفعيل الحساب بنجاح" : locale === "en" ? "User marked as active" : "Compte activé avec succès");
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "وضع قيد المراجعة (Pending)" : locale === "en" ? "Mark as Pending" : "Mettre en attente",
                icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
                disabled: u.status === "pending",
                onClick: async () => {
                  await updateUserStatus(u.id, "pending");
                  info(locale === "ar" ? "تم وضع الحساب قيد المراجعة" : locale === "en" ? "User marked as pending" : "Compte placé en attente");
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "تعليق الحساب (Suspend)" : locale === "en" ? "Suspend user" : "Suspendre le compte",
                icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />,
                onClick: () => handleSuspend(u),
                variant: "danger",
                disabled: u.status === "suspended",
              },
              {
                label: locale === "ar" ? "حظر الحساب (Ban)" : locale === "en" ? "Ban user" : "Bannir le compte",
                icon: <Ban className="w-3.5 h-3.5 text-accent" />,
                onClick: () => handleBan(u),
                variant: "danger",
                disabled: u.status === "banned",
              },
              {
                label: locale === "ar" ? "إعادة تعيين كلمة المرور" : locale === "en" ? "Reset password" : t("resetPassword"),
                icon: <KeyRound className="w-3.5 h-3.5" />,
                onClick: () => handleResetPassword(u),
              },
              {
                label: locale === "ar" ? "حذف الحساب" : locale === "en" ? "Delete user" : t("delete"),
                icon: <Trash2 className="w-3.5 h-3.5 text-accent" />,
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
      <PageHeader
        title={t("title")}
        subtitle="Gérez les comptes utilisateurs, voyageurs et permissions de la plateforme."
        actions={[
          {
            label: "Exporter",
            icon: <Download className="w-4 h-4" />,
            variant: "outline",
            onClick: () => success("Export des utilisateurs généré"),
          },
        ]}
      />

      <KpiStrip cards={kpis} />

      <FilterBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t("searchPlaceholder")}
        activeFilterCount={activeChips.length}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        totalResults={data.total}
        resultsLabel="utilisateurs"
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
          </div>
        }
        detailPanel={
          detailUser ? (
            <DetailPanel
              onClose={() => setDetailUser(null)}
              title={detailUser.name}
              subtitle={`ID: #${detailUser.id} · ${detailUser.email}`}
              status={detailUser.status}
              tabs={[
                { id: "profile", label: "Profil" },
                { id: "bookings", label: "Réservations" },
                { id: "reviews", label: "Avis" },
                { id: "payments", label: "Paiements" },
                { id: "activity", label: "Activité" },
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
                    >
                      <KeyRound className="w-3.5 h-3.5 me-1" />
                      Mot de passe
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-accent border-accent/40 hover:bg-accent/10"
                      onClick={() => handleSuspend(detailUser)}
                    >
                      Suspendre
                    </Button>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleBan(detailUser)}
                  >
                    Bannir
                  </Button>
                </div>
              }
            >
              {panelTab === "profile" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-darnaBg border border-tertiary/40">
                    <Avatar name={detailUser.name} size={54} />
                    <div>
                      <h4 className="font-bold text-primary text-base">{detailUser.name}</h4>
                      <p className="text-xs text-neutral-500">{detailUser.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusPill status={detailUser.status} />
                        <span className="text-[11px] text-neutral-400">
                          Inscrit le {formatDate(detailUser.joinedAt, locale)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Price Grid (Price) */}
                  <div className="p-3.5 rounded-xl bg-white border border-tertiary/40 space-y-2">
                    <span className="text-xs font-bold text-primary block">
                      {locale === "ar" ? "المؤشرات المالية والمبالغ (Price)" : locale === "en" ? "Financial & Price Metrics" : "Métriques financières & Dépenses"}
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "إجمالي الإنفاق" : locale === "en" ? "Total Spent" : "Dépenses totales"}</span>
                        <span className="font-mono font-bold text-xs text-primary block mt-0.5">{formatDzd(detailUser.totalSpentDzd, locale)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "رصيد المحفظة" : locale === "en" ? "Wallet Balance" : "Portefeuille"}</span>
                        <span className="font-mono font-bold text-xs text-secondary block mt-0.5">{formatDzd(detailUser.walletBalanceDzd || 0, locale)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "متوسط الحجز" : locale === "en" ? "Avg. Booking" : "Panier moyen"}</span>
                        <span className="font-mono font-bold text-xs text-primary block mt-0.5">{formatDzd(Math.round(detailUser.totalSpentDzd / Math.max(1, detailUser.bookingsCount)), locale)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Timestamps (Time) */}
                  <div className="p-3.5 rounded-xl bg-white border border-tertiary/40 space-y-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      <span>{locale === "ar" ? "التواريخ والنشاط الزمني (Time)" : locale === "en" ? "Activity & Timestamps" : "Historique temporel & Activité"}</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "تاريخ التسجيل" : locale === "en" ? "Registered On" : "Date d'inscription"}</span>
                        <span className="font-medium text-neutral-700">{formatDate(detailUser.joinedAt, locale)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "آخر نشاط" : locale === "en" ? "Last Active" : "Dernière connexion"}</span>
                        <span className="font-medium text-neutral-700">{formatDate(detailUser.lastActiveAt || detailUser.joinedAt, locale)}</span>
                      </div>
                    </div>
                  </div>

                  {/* About User Section (About) */}
                  <div className="p-3.5 rounded-xl bg-white border border-tertiary/40 space-y-2">
                    <span className="text-xs font-bold text-primary block">
                      {locale === "ar" ? "حول المستخدم والتحقق (About)" : locale === "en" ? "About & Verification" : "À propos du compte & Vérification"}
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "الرتبة والنوع" : locale === "en" ? "User Role" : "Rôle"}</span>
                        <span className="font-semibold text-primary">{detailUser.role === "both" ? "Voyageur & Hôte" : "Voyageur"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "اللغة المفضلة" : locale === "en" ? "Language" : "Langue préférée"}</span>
                        <span className="font-semibold text-primary uppercase">{detailUser.preferredLanguage || "FR"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "الحجوزات" : locale === "en" ? "Bookings" : "Réservations"}</span>
                        <span className="font-semibold text-primary">{detailUser.bookingsCount} {locale === "ar" ? "حجز" : locale === "en" ? "bookings" : "effectuées"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">{locale === "ar" ? "التقييمات والمفضلة" : locale === "en" ? "Reviews & Favs" : "Avis & Favoris"}</span>
                        <span className="font-semibold text-primary">{detailUser.reviewsWrittenCount || 0} avis · {detailUser.favoritesCount || 0} favs</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-neutral-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-secondary" /> {locale === "ar" ? "حالة التحقق من الهوية" : locale === "en" ? "Identity Status" : "Statut d'identité"}
                      </span>
                      <span className="text-secondary font-bold text-xs">{detailUser.idVerified ? "Vérifié (CNI conforme)" : "En attente de vérification"}</span>
                    </div>
                  </div>

                  {/* Description / Bio Section (Disc) */}
                  <div className="p-3.5 rounded-xl bg-white border border-tertiary/40 space-y-1.5">
                    <span className="text-xs font-bold text-primary block">
                      {locale === "ar" ? "الوصف والسيرة الذاتية (Description)" : locale === "en" ? "User Bio & Description" : "Bio & Description du profil"}
                    </span>
                    <p className="text-xs text-neutral-600 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                      {locale === "ar"
                        ? "مستخدم معتمد على منصة دارنا، مهتم بالسياحة والرحلات والاستكشافات الثقافية. سجل الحجوزات ممتاز وبدون أي مخالفات."
                        : locale === "en"
                        ? "Verified DARNA guest, passionate about authentic accommodations and Sahara expeditions. Excellent booking track record with no disputes."
                        : "Voyageur vérifié sur la plateforme DARNA, passionné par les hébergements authentiques et les circuits sahariens. Excellent historique sans aucun litige."}
                    </p>
                  </div>
                </div>
              )}

              {panelTab === "bookings" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-tertiary/40">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-primary">#R1248 · Villa Hydra</span>
                      <StatusPill status="confirmed" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">12 mars 2024 - 15 mars 2024 · 3 nuits</p>
                    <p className="font-mono font-bold text-xs text-primary mt-1">75 000 DZD</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-tertiary/40">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-primary">#R1092 · Excursion Tassili</span>
                      <StatusPill status="completed" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">10 fév 2024 - 14 fév 2024 · 4 jours</p>
                    <p className="font-mono font-bold text-xs text-primary mt-1">120 000 DZD</p>
                  </div>
                </div>
              )}

              {panelTab === "reviews" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-tertiary/40">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-primary">Séjour Villa Hydra</span>
                      <div className="flex items-center text-secondary text-xs">
                        <Star className="w-3.5 h-3.5 fill-current me-1" /> 5.0
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1 italic">
                      "Superbe accueil, maison propre et spacieuse. Hôte très arrangeant !"
                    </p>
                    <span className="text-[10px] text-neutral-400 block mt-1">16 mars 2024</span>
                  </div>
                </div>
              )}

              {panelTab === "payments" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-tertiary/40 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-primary block">Paiement CIB / Edahabia</span>
                      <span className="text-[11px] text-neutral-400">Transaction #TX-9012</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-secondary">75 000 DZD</span>
                  </div>
                </div>
              )}

              {panelTab === "activity" && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2">
                    <Activity className="w-4 h-4 text-secondary mt-0.5" />
                    <div>
                      <p className="font-semibold text-primary">Connexion au compte</p>
                      <span className="text-[11px] text-neutral-400">Aujourd'hui à 08:34 (IP: 105.102.x.x)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2">
                    <Calendar className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-primary">Réservation effectuée #R1248</p>
                      <span className="text-[11px] text-neutral-400">12 mars 2024</span>
                    </div>
                  </div>
                </div>
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
          <label className="block text-xs font-bold text-primary">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
            <option value="banned">Banni</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">Tous les rôles</option>
            <option value="guest">Voyageur uniquement</option>
            <option value="both">Voyageur & Hôte</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary">Wilaya</label>
          <select
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className="w-full text-xs rounded-xl bg-white border border-tertiary/70 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
          >
            <option value="all">
              {locale === "ar" ? "جميع الولايات" : locale === "en" ? "All wilayas" : "Toutes les wilayas"}
            </option>
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
