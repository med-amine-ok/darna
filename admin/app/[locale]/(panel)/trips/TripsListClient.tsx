"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Plane,
  CheckCircle,
  Clock,
  XCircle,
  PauseCircle,
  FileEdit,
  Download,
  Plus,
  Eye,
  ExternalLink,
  MapPin,
  Calendar,
  Users,
  Star,
  Tag,
  Check,
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
import { InfoTile } from "@/components/ui/InfoTile";
import { Tabs } from "@/components/ui/Tabs";
import { useLocale } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listListings, approveListing, suspendListing, restoreListing, updateListingStatus } from "@/lib/data/listings";
import { Listing } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

const TRIP_CATEGORIES = ["Sahara & Sud", "Circuit Culturel", "Randonnée & Bivouac", "Séjour Balnéaire", "Circuit Grand Sud"];

export default function TripsListClient() {
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
  const selectedTripIdFromUrl = searchParams.get("selected") || null;
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
  const [selectedTripId, setSelectedTripId] = useState<string | null>(selectedTripIdFromUrl);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("details");

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "suspend";
    trip: Listing;
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
        vertical: "trip",
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

  const selectedTrip = data.find((t) => t.id === selectedTripId) || null;

  const handleSelectTrip = (trip: Listing) => {
    setSelectedTripId(trip.id);
    updateUrl({ selected: trip.id });
  };

  const handleClosePanel = () => {
    setSelectedTripId(null);
    updateUrl({ selected: null });
  };

  // KPI Strip (Mockup 02: 156 Tous · 98 Publiés · 24 En attente · 12 Suspendus · 8 Refusés · 14 Brouillons)
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: "Tous les voyages",
      value: totalCount || 156,
      icon: <Plane className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "published",
      label: "Publiés",
      value: statusFacets["published"] ?? statusFacets["approved"] ?? 98,
      icon: <CheckCircle className="w-5 h-5" />,
      colorVariant: "success",
    },
    {
      id: "pending",
      label: "En attente",
      value: statusFacets["pending"] ?? statusFacets["pending_review"] ?? 24,
      icon: <Clock className="w-5 h-5" />,
      colorVariant: "warning",
    },
    {
      id: "suspended",
      label: "Suspendus",
      value: statusFacets["suspended"] ?? 12,
      icon: <PauseCircle className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "refused",
      label: "Refusés",
      value: statusFacets["refused"] ?? statusFacets["rejected"] ?? 8,
      icon: <XCircle className="w-5 h-5" />,
      colorVariant: "danger",
    },
    {
      id: "draft",
      label: "Brouillons",
      value: statusFacets["draft"] ?? 14,
      icon: <FileEdit className="w-5 h-5" />,
      colorVariant: "neutral",
    },
  ];

  // Table columns (Mockup 02: #, Voyage, Destination, Date de départ, Durée, Prix, Statut, Actions)
  const columns: Column<Listing>[] = [
    {
      key: "id",
      header: "#",
      className: "w-20",
      render: (row) => (
        <span className="font-mono text-xs text-[#2E3A2F]/70 font-semibold">
          {row.formattedId || `#T${row.id.replace("lst_", "").padStart(4, "0")}`}
        </span>
      ),
    },
    {
      key: "trip",
      header: "Voyage",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#E5DFD3] shrink-0 border border-[#D9C9B2]/40">
            <Image
              src={row.imageSrc?.[0] || "/placeholder-trip.jpg"}
              alt={row.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div
              className="font-medium text-[#2E3A2F] truncate text-sm hover:underline cursor-pointer"
              onClick={() => handleSelectTrip(row)}
            >
              {row.title}
            </div>
            <div className="text-xs text-[#2E3A2F]/60 capitalize mt-0.5">
              {row.propertyType || "Circuit Sahara"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-[#2E3A2F]">
          <MapPin className="w-3.5 h-3.5 text-[#6B7F5B] shrink-0" />
          <span className="truncate">{row.city}, {row.wilayaCode}</span>
        </div>
      ),
    },
    {
      key: "departure",
      header: "Date de départ",
      render: (row) => (
        <div className="text-xs text-[#2E3A2F] flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-[#2E3A2F]/50" />
          <span>15 nov. 2024</span>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Durée",
      render: (row) => <span className="text-xs text-[#2E3A2F]">5 jours / 4 nuits</span>,
    },
    {
      key: "price",
      header: "Prix (DZD)",
      render: (row) => (
        <div className="text-xs font-semibold text-[#2E3A2F]">
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
      key: "actions",
      header: "Actions",
      className: "text-end",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleSelectTrip(row)}
            className="p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors"
            title={locale === "ar" ? "معاينة سريعة" : locale === "en" ? "Quick preview" : "Aperçu rapide"}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/trips/${row.id}`)}
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
                onClick: () => handleSelectTrip(row),
              },
              {
                label: locale === "ar" ? "موافقة ونشر (Approved)" : locale === "en" ? "Approve / Publish" : "Approuver / Publier",
                icon: <CheckCircle className="w-3.5 h-3.5 text-secondary" />,
                disabled: row.status === "approved" || row.status === "published",
                onClick: async () => {
                  await updateListingStatus(row.id, "approved");
                  addToast({
                    title: locale === "ar" ? "تمت الموافقة على الرحلة" : locale === "en" ? "Trip approved" : "Voyage approuvé",
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
                    title: locale === "ar" ? "تم وضع الرحلة قيد المراجعة" : locale === "en" ? "Trip marked pending" : "Voyage mis en attente",
                    variant: "info",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "تعليق الرحلة (Suspend)" : locale === "en" ? "Suspend Trip" : "Suspendre le voyage",
                icon: <PauseCircle className="w-3.5 h-3.5 text-amber-700" />,
                disabled: row.status === "suspended",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "suspended");
                  addToast({
                    title: locale === "ar" ? "تم تعليق الرحلة" : locale === "en" ? "Trip suspended" : "Voyage suspendu",
                    variant: "warning",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "رفض الرحلة (Reject)" : locale === "en" ? "Reject Trip" : "Refuser le voyage",
                icon: <XCircle className="w-3.5 h-3.5 text-accent" />,
                disabled: row.status === "rejected" || row.status === "refused",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "rejected");
                  addToast({
                    title: locale === "ar" ? "تم رفض الرحلة" : locale === "en" ? "Trip rejected" : "Voyage refusé",
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
      {/* 1. Page Header (Mockup 02: Exporter, Catégories, + Ajouter un voyage) */}
      <PageHeader
        title="Voyages organisés"
        subtitle="Gérez les circuits touristiques et voyages organisés par les agences agréées."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                addToast({ title: "Export en cours", description: "Le fichier CSV sera téléchargé sous peu.", variant: "info" });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE] transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
            <button
              onClick={() => router.push("/trips/categories")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE] transition-colors shadow-sm"
            >
              <Tag className="w-4 h-4" />
              <span>Catégories</span>
            </button>
            <button
              onClick={() => router.push("/trips/new")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un voyage</span>
            </button>
          </div>
        }
      />

      {/* 2. KPI Strip (Mockup 02: 6 cards) */}
      <KpiStrip
        cards={kpis}
        activeCardId={normalizedStatus}
        onCardClick={(id) => {
          updateUrl({ status: id === "all" ? null : id, page: "1" });
        }}
      />

      {/* 3. Filter Bar (Mockup 02) */}
      <FilterBar
        searchPlaceholder="Rechercher un voyage, une destination..."
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "wilaya",
            label: "Destination",
            value: selectedWilaya,
            options: [
              { value: "all", label: locale === "ar" ? "جميع الوجهات" : locale === "en" ? "All destinations" : "Toutes les destinations" },
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
              ...TRIP_CATEGORIES.map((c) => ({ value: c.toLowerCase(), label: c })),
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
              { value: "published", label: "Publié" },
              { value: "pending", label: "En attente" },
              { value: "suspended", label: "Suspendu" },
              { value: "refused", label: "Refusé" },
              { value: "draft", label: "Brouillon" },
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

      {/* 4. Split View: Table + Detail Panel (Mockup 02) */}
      <SplitView
        isPanelOpen={!!selectedTrip}
        mainContent={
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(t) => t.id}
              selectedRowId={selectedTripId || undefined}
              onRowClick={handleSelectTrip}
              isLoading={isLoading}
              emptyMessage="Aucun voyage trouvé."
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
                itemLabel="voyages"
              />
            </div>
          </div>
        }
        detailPanel={
          selectedTrip ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedTrip.title}
              subtitle={`${selectedTrip.formattedId || `#T${selectedTrip.id}`} • ${selectedTrip.city}`}
              statusBadge={<StatusPill status={selectedTrip.status} />}
              actions={
                <button
                  onClick={() => router.push(`/trips/${selectedTrip.id}`)}
                  className="p-1 text-[#2E3A2F]/60 hover:text-[#2E3A2F] rounded"
                  title="Plein écran"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedTrip.status === "approved" || selectedTrip.status === "published") ? (
                      <button
                        onClick={() => setConfirmAction({ type: "suspend", trip: selectedTrip })}
                        className="px-3 py-1.5 text-xs font-medium text-[#8C682E] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                      >
                        {locale === "ar" ? "تعليق" : locale === "en" ? "Suspend" : "Suspendre"}
                      </button>
                    ) : (selectedTrip.status === "pending_review" || selectedTrip.status === "pending") ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await approveListing(selectedTrip.id, { id: "usr_superadmin", name: "Super Admin", role: "super_admin" });
                              addToast({
                                title: locale === "ar" ? "تمت الموافقة" : locale === "en" ? "Trip approved" : "Voyage approuvé",
                                description: locale === "ar" ? "تمت الموافقة على هذا الرحلة مباشرة" : locale === "en" ? "This trip has been approved directly" : "Ce voyage a été approuvé directement.",
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
                      </>
                    ) : (selectedTrip.status === "suspended" || selectedTrip.status === "rejected" || selectedTrip.status === "refused") ? (
                      <button
                        onClick={async () => {
                          try {
                            await restoreListing(selectedTrip.id, { id: "usr_superadmin", name: "Super Admin", role: "super_admin" });
                            addToast({
                              title: locale === "ar" ? "تم إلغاء التعليق" : locale === "en" ? "Suspension lifted" : "Suspension annulée",
                              description: locale === "ar" ? "تمت إعادة تفعيل هذه الرحلة بنجاح" : locale === "en" ? "This trip has been reactivated" : "Le voyage a été réactivé avec succès.",
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
                      onClick={() => setConfirmAction({ type: "delete", trip: selectedTrip })}
                      className="px-3 py-1.5 text-xs font-medium text-[#C96F4F] border border-[#C96F4F]/40 rounded-lg hover:bg-[#C96F4F]/10"
                    >
                      {locale === "ar" ? "حذف" : locale === "en" ? "Delete" : "Supprimer"}
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/trips/${selectedTrip.id}`)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
                  >
                    Modifier le voyage
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <ImageCarousel
                  images={selectedTrip.imageSrc?.length ? selectedTrip.imageSrc : ["/placeholder-trip.jpg"]}
                  alt={selectedTrip.title}
                />

                <div className="flex items-center justify-between text-xs text-[#2E3A2F] border-b border-[#D9C9B2]/40 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold">{selectedTrip.rating.toFixed(1)}</span>
                    <span className="text-[#2E3A2F]/60">({selectedTrip.reviewsCount} avis)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#6B7F5B] font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedTrip.city}, {selectedTrip.wilayaCode}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "details", label: "Détails" },
                    { id: "programme", label: "Programme" },
                    { id: "photos", label: "Photos" },
                    { id: "bookings", label: "Réservations" },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "details" && (
                  <div className="space-y-4">
                    {/* About This Trip */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-2">
                        {locale === "ar" ? "حول الرحلة الاستكشافية (About)" : locale === "en" ? "About This Trip" : "À propos du circuit"}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={locale === "ar" ? "تاريخ الانطلاق" : locale === "en" ? "Departure Date" : "Date de départ"} value="15 nov. 2024" />
                        <InfoTile label={locale === "ar" ? "المدة" : locale === "en" ? "Duration" : "Durée"} value="5 jours / 4 nuits" />
                        <InfoTile label={locale === "ar" ? "السعة القصوى" : locale === "en" ? "Max Group" : "Taille max"} value="Max 12 pers." />
                        <InfoTile label={locale === "ar" ? "المستوى" : locale === "en" ? "Difficulty" : "Niveau"} value="Modéré" />
                      </div>
                    </div>

                    {/* Price & Discounts Section (Price & Disc) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2.5">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center justify-between">
                        <span>{locale === "ar" ? "الأسعار والخصومات (Price & Disc)" : locale === "en" ? "Pricing & Discounts" : "Tarification & Remises"}</span>
                        <span className="font-bold text-[#2E3A2F] text-sm font-mono">{selectedTrip.price.toLocaleString("fr-FR")} DZD <span className="text-[10px] text-[#2E3A2F]/60">/ {locale === "ar" ? "فرد" : locale === "en" ? "person" : "pers."}</span></span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#D9C9B2]/40">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "خصم الحجز المبكر" : locale === "en" ? "Early Bird Disc." : "Remise Early Bird"}</span>
                          <span className="font-medium text-[#6B7F5B]">-10% ({Math.round(selectedTrip.price * 0.9).toLocaleString("fr-FR")} DZD)</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "عمولة المنصة" : locale === "en" ? "Commission" : "Commission DARNA"}</span>
                          <span className="font-medium text-[#6B7F5B]">12% ({locale === "ar" ? "مشمولة" : locale === "en" ? "included" : "incluse"})</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "الدفعة الأولى المطلوبة" : locale === "en" ? "Deposit Required" : "Acompte à la réservation"}</span>
                          <span className="font-medium text-[#2E3A2F]">30% à la commande</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "سياسة الإلغاء" : locale === "en" ? "Cancellation" : "Politique d'annulation"}</span>
                          <span className="font-medium text-[#2E3A2F]">Remboursement à 7 j</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Schedule Section (Time) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#6B7F5B]" />
                        <span>{locale === "ar" ? "الجدول الزمني ومواعيد التجمع (Time)" : locale === "en" ? "Times & Schedule" : "Horaires & Rendez-vous"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "التجمع والانطلاق" : locale === "en" ? "Gathering / Departure" : "Rassemblement"}</span>
                          <span className="font-medium text-[#2E3A2F]">07h30 (Jour 1)</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "موعد العودة التقريبي" : locale === "en" ? "Return Time" : "Retour estimé"}</span>
                          <span className="font-medium text-[#2E3A2F]">18h00 (Dernier jour)</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "مدة المسير اليومي" : locale === "en" ? "Daily Walk Duration" : "Marche quotidienne"}</span>
                          <span className="font-medium text-[#2E3A2F]">3 à 4 heures / jour</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "نقطة الالتقاء" : locale === "en" ? "Meeting Point" : "Point de rencontre"}</span>
                          <span className="font-medium text-[#6B7F5B]">{selectedTrip.city} Centre</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50">
                      <div className="text-xs font-semibold text-[#2E3A2F] mb-1">
                        {locale === "ar" ? "الوكالة المنظمة" : locale === "en" ? "Organizing Agency" : "Agence organisatrice"}
                      </div>
                      <div className="text-sm font-medium text-[#2E3A2F]">{selectedTrip.hostName}</div>
                      <div className="text-xs text-[#6B7F5B] flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" /> {locale === "ar" ? "وكالة سياحية معتمدة" : locale === "en" ? "Licensed Tourism Agency" : "Agence de voyages agréée"}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">
                        {locale === "ar" ? "أبرز مميزات الرحلة" : locale === "en" ? "Trip Highlights" : "Points forts"}
                      </h4>
                      <div className="space-y-1.5 text-xs text-[#2E3A2F]">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#6B7F5B]" />
                          <span>{locale === "ar" ? "مبيت وإقامة تحت نجوم صحراء الطاسيلي" : "Bivouac étoilé dans le désert du Tassili"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#6B7F5B]" />
                          <span>{locale === "ar" ? "إطعام كامل مع مرشدين محليين متخصصين" : "Pension complète & guides touaregs locaux"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#6B7F5B]" />
                          <span>{locale === "ar" ? "تنقل بسيارات رباعية الدفع مريحة ومجهزة" : "Transport 4x4 tout confort inclus"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description Section (Disc) */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">
                        {locale === "ar" ? "الوصف الكامل للرحلة (Description)" : locale === "en" ? "Full Trip Description" : "Description détaillée du circuit"}
                      </h4>
                      <p className="text-xs text-[#2E3A2F]/80 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                        {selectedTrip.description || (locale === "ar" ? "لا يوجد وصف متوفر" : "Aucune description fournie pour ce voyage.")}
                      </p>
                    </div>
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
          title={confirmAction.type === "delete" ? "Supprimer ce voyage ?" : "Suspendre ce voyage ?"}
          description={`Vous allez modifier le statut du voyage "${confirmAction.trip.title}".`}
          variant={confirmAction.type === "delete" ? "danger" : "primary"}
          onConfirm={async () => {
            if (confirmAction.type === "delete") {
              addToast({ title: "Voyage supprimé", variant: "warning" });
            } else {
              await suspendListing(confirmAction.trip.id, "Suspension administrative", {
                id: "usr_admin",
                name: "Admin",
                role: "super_admin",
              });
              addToast({ title: "Voyage suspendu", variant: "info" });
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
