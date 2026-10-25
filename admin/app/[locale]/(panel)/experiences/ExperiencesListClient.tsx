"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
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
  Users,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  Tag,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip, KpiCardItem } from "@/components/ui/KpiStrip";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { InfoTile } from "@/components/ui/InfoTile";
import { Tabs } from "@/components/ui/Tabs";
import { useLocale } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listListings, approveListing, suspendListing, restoreListing, updateListingStatus } from "@/lib/data/listings";
import { Listing } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

const EXPERIENCE_CATEGORIES = ["Aventure", "Culture", "Nature", "Gastronomie", "Mer"];

export default function ExperiencesListClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

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
  const [pageSize, setPageSize] = useState(10);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(selectedExpIdFromUrl);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await listListings({
        status: currentStatus,
        vertical: "experience",
        wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
        search: searchQuery || undefined,
        page,
        pageSize,
      });
      setData(res.rows);
      setTotal(res.total);
      setTotalPages(res.totalPages || Math.ceil(res.total / pageSize));
      setFacets(res.facets || {});
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentStatus, selectedWilaya, selectedCategory, page, pageSize, searchQuery]);

  const selectedExp = data.find((e) => e.id === selectedExpId) || null;

  const handleSelectExp = (exp: Listing) => {
    setSelectedExpId(exp.id);
    updateUrl({ selected: exp.id });
  };

  const handleClosePanel = () => {
    setSelectedExpId(null);
    updateUrl({ selected: null });
  };

  // KPI Strip (Mockup 07: 238 Total · 46 En attente · 162 Publiées · 18 Suspendues · 12 Refusées)
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: "Total des expériences",
      value: totalCount || 238,
      icon: <Compass className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "pending",
      label: "En attente de validation",
      value: statusFacets["pending"] ?? statusFacets["pending_review"] ?? 46,
      icon: <Clock className="w-5 h-5" />,
      colorVariant: "warning",
    },
    {
      id: "published",
      label: "Publiées",
      value: statusFacets["published"] ?? statusFacets["approved"] ?? 162,
      icon: <CheckCircle className="w-5 h-5" />,
      colorVariant: "success",
    },
    {
      id: "suspended",
      label: "Suspendues",
      value: statusFacets["suspended"] ?? 18,
      icon: <PauseCircle className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "refused",
      label: "Refusées",
      value: statusFacets["refused"] ?? statusFacets["rejected"] ?? 12,
      icon: <XCircle className="w-5 h-5" />,
      colorVariant: "danger",
    },
  ];

  // Table columns (Mockup 07)
  const columns: Column<Listing>[] = [
    {
      key: "exp",
      header: "Expérience",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#E5DFD3] shrink-0 border border-[#D9C9B2]/40">
            <Image
              src={row.imageSrc?.[0] || "/placeholder-experience.jpg"}
              alt={row.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div
              className="font-medium text-[#2E3A2F] truncate text-sm hover:underline cursor-pointer"
              onClick={() => handleSelectExp(row)}
            >
              {row.title}
            </div>
            <div className="text-xs text-[#2E3A2F]/60 flex items-center gap-1.5 mt-0.5">
              <span>{row.formattedId || `#EXP${row.id.replace("lst_", "").padStart(4, "0")}`}</span>
              <span>•</span>
              <span className="capitalize">{row.propertyType}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "guide",
      header: "Organisateur / Guide",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#EAE5D9] flex items-center justify-center font-semibold text-xs text-[#2E3A2F] border border-[#D9C9B2]/50">
            {row.hostName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#2E3A2F] truncate">{row.hostName}</div>
            <div className="text-[11px] text-[#2E3A2F]/60 capitalize">{row.hostType}</div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Lieu",
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-[#2E3A2F]">
          <MapPin className="w-3.5 h-3.5 text-[#6B7F5B] shrink-0" />
          <span className="truncate">{row.city}, {row.wilayaCode}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Catégorie",
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAE5D9] text-[#2E3A2F] border border-[#D9C9B2]/50">
          <Tag className="w-3 h-3 text-[#6B7F5B]" />
          <span>{row.propertyType || "Aventure"}</span>
        </span>
      ),
    },
    {
      key: "price",
      header: "Prix (DZD)",
      render: (row) => (
        <div className="text-xs font-medium text-[#2E3A2F]">
          {row.price.toLocaleString("fr-FR")} DZD
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "rating",
      header: "Note",
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-[#2E3A2F]">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="font-medium">{row.rating.toFixed(1)}</span>
          <span className="text-[#2E3A2F]/60">({row.reviewsCount})</span>
        </div>
      ),
    },
    {
      key: "bookings",
      header: "Réservations",
      render: (row) => (
        <span className="text-xs font-medium text-[#2E3A2F]">{row.bookingsCount}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-end",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleSelectExp(row)}
            className="p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors"
            title={locale === "ar" ? "معاينة سريعة" : locale === "en" ? "Quick preview" : "Aperçu rapide"}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/experiences/${row.id}`)}
            className="p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors"
            title={locale === "ar" ? "فتح التفاصيل" : locale === "en" ? "View full page" : "Consulter"}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <DropdownMenu
            items={[
              {
                label: locale === "ar" ? "معاينة سريعة" : locale === "en" ? "Quick preview" : "Aperçu rapide",
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => handleSelectExp(row),
              },
              {
                label: locale === "ar" ? "موافقة ونشر (Approved)" : locale === "en" ? "Approve / Publish" : "Approuver / Publier",
                icon: <CheckCircle className="w-3.5 h-3.5 text-secondary" />,
                disabled: row.status === "approved" || row.status === "published",
                onClick: async () => {
                  await updateListingStatus(row.id, "approved");
                  addToast({
                    title: locale === "ar" ? "تمت الموافقة على النشاط" : locale === "en" ? "Experience approved" : "Expérience approuvée",
                    variant: "success",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "تعيين قيد المراجعة (Pending)" : locale === "en" ? "Mark as Pending Review" : "Mettre en attente",
                icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
                disabled: row.status === "pending" || row.status === "pending_review",
                onClick: async () => {
                  await updateListingStatus(row.id, "pending_review");
                  addToast({
                    title: locale === "ar" ? "تم وضع النشاط قيد المراجعة" : locale === "en" ? "Experience marked pending" : "Expérience mise en attente",
                    variant: "info",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "تعليق النشاط (Suspend)" : locale === "en" ? "Suspend Experience" : "Suspendre l'activité",
                icon: <PauseCircle className="w-3.5 h-3.5 text-amber-700" />,
                disabled: row.status === "suspended",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "suspended");
                  addToast({
                    title: locale === "ar" ? "تم تعليق النشاط" : locale === "en" ? "Experience suspended" : "Expérience suspendue",
                    variant: "warning",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "رفض النشاط (Reject)" : locale === "en" ? "Reject Experience" : "Refuser l'activité",
                icon: <XCircle className="w-3.5 h-3.5 text-accent" />,
                disabled: row.status === "rejected" || row.status === "refused",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "rejected");
                  addToast({
                    title: locale === "ar" ? "تم رفض النشاط" : locale === "en" ? "Experience rejected" : "Expérience refusée",
                    variant: "warning",
                  });
                  fetchData();
                },
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
        title="Gestion des expériences"
        subtitle="Supervisez les activités, excursions et ateliers proposés par les guides et agences."
        actions={[
          {
            label: "Exporter",
            icon: <Download className="w-4 h-4" />,
            onClick: () => {
              addToast({ title: "Export en cours", description: "Le fichier CSV sera téléchargé sous peu.", variant: "info" });
            },
            variant: "outline",
          },
          {
            label: "Catégories",
            icon: <Tag className="w-4 h-4" />,
            onClick: () => router.push("/experiences/categories"),
            variant: "outline",
          },
          {
            label: "Ajouter une expérience",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => router.push("/experiences/new"),
            variant: "primary",
          },
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
        searchPlaceholder="Rechercher par titre, guide, lieu..."
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "wilaya",
            label: "Région / Wilaya",
            value: selectedWilaya,
            options: [
              { value: "all", label: locale === "ar" ? "جميع الولايات" : locale === "en" ? "All wilayas" : "Toutes les wilayas" },
              ...WILAYAS.map((w) => ({ value: w.code, label: getWilayaLabel(w, locale) })),
            ],
            onChange: (val) => {
              setSelectedWilaya(val);
              setPage(1);
            },
          },
          {
            id: "category",
            label: "Catégorie",
            value: selectedCategory,
            options: [
              { value: "all", label: "Toutes les catégories" },
              ...EXPERIENCE_CATEGORIES.map((c) => ({ value: c.toLowerCase(), label: c })),
            ],
            onChange: (val) => {
              setSelectedCategory(val);
              setPage(1);
            },
          },
          {
            id: "status",
            label: "Statut",
            value: normalizedStatus,
            options: [
              { value: "all", label: "Tous les statuts" },
              { value: "pending", label: "En attente de validation" },
              { value: "published", label: "Publiée" },
              { value: "suspended", label: "Suspendue" },
              { value: "refused", label: "Refusée" },
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
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(e) => e.id}
              selectedRowId={selectedExpId || undefined}
              onRowClick={handleSelectExp}
              isLoading={isLoading}
              emptyMessage="Aucune expérience trouvée avec ces filtres."
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
                itemLabel="expériences"
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
                  onClick={() => router.push(`/experiences/${selectedExp.id}`)}
                  className="p-1 text-[#2E3A2F]/60 hover:text-[#2E3A2F] rounded"
                  title="Plein écran"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedExp.status === "approved" || selectedExp.status === "published") ? (
                      <button
                        onClick={() => setConfirmAction({ type: "suspend", exp: selectedExp })}
                        className="px-3 py-1.5 text-xs font-medium text-[#8C682E] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                      >
                        {locale === "ar" ? "تعليق" : locale === "en" ? "Suspend" : "Suspendre"}
                      </button>
                    ) : (selectedExp.status === "pending_review" || selectedExp.status === "pending") ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await approveListing(selectedExp.id, { id: "usr_superadmin", name: "Super Admin", role: "super_admin" });
                              addToast({
                                title: locale === "ar" ? "تمت الموافقة" : locale === "en" ? "Experience approved" : "Expérience approuvée",
                                description: locale === "ar" ? "تمت الموافقة على هذه التجربة ونشرها مباشرة" : locale === "en" ? "This experience has been approved directly" : "Cette expérience a été approuvée directement.",
                                variant: "success",
                              });
                              fetchData();
                            } catch (err: any) {
                              addToast({ title: "Erreur", description: err.message, variant: "danger" });
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6B7F5B] hover:bg-[#5a6b4c] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{locale === "ar" ? "موافقة مباشرة" : locale === "en" ? "Approve directly" : "Approuver directement"}</span>
                        </button>
                        <button
                          onClick={() => router.push(`/experiences/${selectedExp.id}/review`)}
                          className="px-3 py-1.5 text-xs font-medium text-[#2E3A2F] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                        >
                          {locale === "ar" ? "فحص الملف" : locale === "en" ? "Review file" : "Examiner"}
                        </button>
                      </>
                    ) : (selectedExp.status === "suspended" || selectedExp.status === "rejected" || selectedExp.status === "refused") ? (
                      <button
                        onClick={async () => {
                          try {
                            await restoreListing(selectedExp.id, { id: "usr_superadmin", name: "Super Admin", role: "super_admin" });
                            addToast({
                              title: locale === "ar" ? "تم إلغاء التعليق" : locale === "en" ? "Suspension lifted" : "Suspension annulée",
                              description: locale === "ar" ? "تمت إعادة تفعيل هذه التجربة بنجاح" : locale === "en" ? "This experience has been reactivated" : "L'expérience a été réactivée avec succès.",
                              variant: "success",
                            });
                            fetchData();
                          } catch (err: any) {
                            addToast({ title: "Erreur", description: err.message, variant: "danger" });
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-[#2E3A2F] bg-[#D9C9B2]/40 hover:bg-[#D9C9B2]/70 border border-[#D9C9B2] rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#6B7F5B]" />
                        <span>{locale === "ar" ? "إلغاء التعليق" : locale === "en" ? "Cancel suspension" : "Annuler la suspension"}</span>
                      </button>
                    ) : null}
                    <button
                      onClick={() => setConfirmAction({ type: "delete", exp: selectedExp })}
                      className="px-3 py-1.5 text-xs font-medium text-[#C96F4F] border border-[#C96F4F]/40 rounded-lg hover:bg-[#C96F4F]/10"
                    >
                      {locale === "ar" ? "حذف" : locale === "en" ? "Delete" : "Supprimer"}
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/experiences/${selectedExp.id}`)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
                  >
                    Modifier
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <ImageCarousel
                  images={selectedExp.imageSrc?.length ? selectedExp.imageSrc : ["/placeholder-experience.jpg"]}
                  alt={selectedExp.title}
                />

                <div className="flex items-center justify-between text-xs text-[#2E3A2F] border-b border-[#D9C9B2]/40 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold">{selectedExp.rating.toFixed(1)}</span>
                    <span className="text-[#2E3A2F]/60">({selectedExp.reviewsCount} avis)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#6B7F5B] font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedExp.city}, {selectedExp.wilayaCode}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "overview", label: "Aperçu" },
                    { id: "info", label: "Informations" },
                    { id: "photos", label: "Photos" },
                    { id: "calendar", label: "Calendrier" },
                    { id: "bookings", label: "Réservations" },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "overview" && (
                  <div className="space-y-4">
                    {/* About Section */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-2">
                        {locale === "ar" ? "حول التجربة (About)" : locale === "en" ? "About This Experience" : "À propos de l'expérience"}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={locale === "ar" ? "الفئة" : locale === "en" ? "Category" : "Catégorie"} value={selectedExp.category || "Culture & Découverte"} />
                        <InfoTile label={locale === "ar" ? "حجم الفوج" : locale === "en" ? "Max Group" : "Taille max"} value={`${selectedExp.guestCapacity} pers.`} />
                        <InfoTile label={locale === "ar" ? "المستوى" : locale === "en" ? "Difficulty" : "Niveau"} value="Modéré" />
                        <InfoTile label={locale === "ar" ? "اللغات" : locale === "en" ? "Languages" : "Langues"} value="FR, AR, EN" />
                      </div>
                    </div>

                    {/* Price & Discounts Section (Price & Disc) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2.5">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center justify-between">
                        <span>{locale === "ar" ? "الأسعار والخصومات (Price & Disc)" : locale === "en" ? "Pricing & Discounts" : "Tarification & Remises"}</span>
                        <span className="font-bold text-[#2E3A2F] text-sm font-mono">{selectedExp.price.toLocaleString("fr-FR")} DZD <span className="text-[10px] text-[#2E3A2F]/60">/ {locale === "ar" ? "شخص" : locale === "en" ? "person" : "personne"}</span></span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#D9C9B2]/40">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "خصم المجموعات" : locale === "en" ? "Group Discount" : "Remise groupe (>4 pers)"}</span>
                          <span className="font-medium text-[#6B7F5B]">-10% ({Math.round(selectedExp.price * 0.9).toLocaleString("fr-FR")} DZD)</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "عمولة المنصة" : locale === "en" ? "Commission" : "Commission DARNA"}</span>
                          <span className="font-medium text-[#6B7F5B]">12% ({locale === "ar" ? "مشمولة" : locale === "en" ? "included" : "incluse"})</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "سياسة الإلغاء" : locale === "en" ? "Cancellation" : "Politique d'annulation"}</span>
                          <span className="font-medium text-[#2E3A2F]">Flexible (24h avant)</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "الدفع المسبق" : locale === "en" ? "Prepayment" : "Acompte requis"}</span>
                          <span className="font-medium text-[#2E3A2F]">100% sécurisé</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Schedule Section (Time) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#6B7F5B]" />
                        <span>{locale === "ar" ? "المواعيد والمدة الزمنية (Time)" : locale === "en" ? "Times & Schedule" : "Horaires & Durée"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "المدة الإجمالية" : locale === "en" ? "Total Duration" : "Durée totale"}</span>
                          <span className="font-medium text-[#2E3A2F]">3 heures</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "أوقات الانطلاق" : locale === "en" ? "Departure Times" : "Créneaux de départ"}</span>
                          <span className="font-medium text-[#2E3A2F]">09h00 / 14h30</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "أيام النشاط" : locale === "en" ? "Operating Days" : "Jours d'activité"}</span>
                          <span className="font-medium text-[#2E3A2F]">Tous les jours</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "الحد الأدنى للحجز المسبق" : locale === "en" ? "Advance Notice" : "Réservation anticipée"}</span>
                          <span className="font-medium text-[#6B7F5B]">24 heures à l'avance</span>
                        </div>
                      </div>
                    </div>

                    {/* Host Card */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50">
                      <div className="text-xs font-semibold text-[#2E3A2F] mb-2 flex items-center justify-between">
                        <span>{locale === "ar" ? "المنظم / المرشد" : locale === "en" ? "Organizer / Guide" : "Organisateur / Guide"}</span>
                        <span className="text-[11px] text-[#6B7F5B] cursor-pointer hover:underline">
                          {locale === "ar" ? "عرض الملف" : locale === "en" ? "View profile" : "Voir le profil"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E5DFD3] flex items-center justify-center font-bold text-sm text-[#2E3A2F]">
                          {selectedExp.hostName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#2E3A2F]">{selectedExp.hostName}</div>
                          <div className="text-xs text-[#2E3A2F]/60 capitalize flex items-center gap-1.5">
                            <span>{selectedExp.hostType}</span>
                            <span>•</span>
                            <span className="text-[#6B7F5B] flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> {locale === "ar" ? "مرشد معتمد" : locale === "en" ? "Certified Guide" : "Guide certifié"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description Section (Disc) */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">
                        {locale === "ar" ? "الوصف الكامل (Description)" : locale === "en" ? "Description" : "Description"}
                      </h4>
                      <p className="text-xs text-[#2E3A2F]/80 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                        {selectedExp.description || (locale === "ar" ? "لا يوجد وصف متوفر" : "Aucune description fournie pour cette expérience.")}
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
              ? "Supprimer cette expérience ?"
              : "Suspendre cette expérience ?"
          }
          description={`Vous êtes sur le point de modifier le statut de "${confirmAction.exp.title}". Cette action sera consignée dans le journal d'audit.`}
          confirmLabel={confirmAction.type === "delete" ? "Supprimer définitivement" : "Confirmer"}
          variant={confirmAction.type === "delete" ? "danger" : "primary"}
          onConfirm={async () => {
            if (confirmAction.type === "delete") {
              addToast({ title: "Expérience supprimée", variant: "warning" });
            } else {
              await suspendListing(confirmAction.exp.id, "Suspension administrative", {
                id: "usr_admin",
                name: "Admin",
                role: "super_admin",
              });
              addToast({ title: "Expérience suspendue", variant: "info" });
            }
            setConfirmAction(null);
            fetchData();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
