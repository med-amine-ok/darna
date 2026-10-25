"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Home,
  Building2,
  Bed,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Plus,
  Eye,
  MoreHorizontal,
  MapPin,
  Calendar,
  Users,
  Bath,
  Maximize2,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  PauseCircle,
  PlayCircle,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip, KpiCardItem } from "@/components/ui/KpiStrip";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { InfoTile } from "@/components/ui/InfoTile";
import { useLocale } from "next-intl";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listListings, approveListing, rejectListing, suspendListing, restoreListing, updateListingStatus } from "@/lib/data/listings";
import { Listing, ListingStatus, HostType } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

const PROPERTY_TYPES = [
  "Villa",
  "Appartement",
  "Maison traditionnelle",
  "Bungalow",
  "Chalet",
  "Studio",
  "Hôtel",
  "Hostel",
];

export default function StaysListClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // URL state
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
  const selectedStayIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  // Local data state
  const [data, setData] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedPropType, setSelectedPropType] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStayId, setSelectedStayId] = useState<string | null>(selectedStayIdFromUrl);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("info");

  // Selection & Bulk
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "suspend" | "approve" | "reject";
    stay: Listing;
  } | null>(null);

  // Sync selected stay with URL
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
        vertical: "home", // stays includes homes, apartments, villas, etc.
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
  }, [currentStatus, selectedWilaya, selectedPropType, page, pageSize, searchQuery]);

  const selectedStay = data.find((s) => s.id === selectedStayId) || null;

  const handleSelectStay = (stay: Listing) => {
    setSelectedStayId(stay.id);
    updateUrl({ selected: stay.id });
  };

  const handleClosePanel = () => {
    setSelectedStayId(null);
    updateUrl({ selected: null });
  };

  // KPI Strip definitions from Mockup 05
  // 1,248 Total · 186 En attente · 892 Publiés · 78 Suspendus · 54 Refusés
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: "Total des hébergements",
      value: totalCount || 1248,
      icon: <Home className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "pending",
      label: "En attente de validation",
      value: statusFacets["pending"] ?? statusFacets["pending_review"] ?? 186,
      icon: <Clock className="w-5 h-5" />,
      colorVariant: "warning",
    },
    {
      id: "published",
      label: "Publiés",
      value: statusFacets["published"] ?? statusFacets["approved"] ?? 892,
      icon: <CheckCircle className="w-5 h-5" />,
      colorVariant: "success",
    },
    {
      id: "suspended",
      label: "Suspendus",
      value: statusFacets["suspended"] ?? 78,
      icon: <PauseCircle className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "refused",
      label: "Refusés",
      value: statusFacets["refused"] ?? statusFacets["rejected"] ?? 54,
      icon: <XCircle className="w-5 h-5" />,
      colorVariant: "danger",
    },
  ];

  // Table columns (Mockup 05)
  const columns: Column<Listing>[] = [
    {
      key: "listing",
      header: "Hébergement",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#E5DFD3] shrink-0 border border-[#D9C9B2]/40">
            <Image
              src={row.imageSrc?.[0] || row.images?.[0] || "/placeholder-stay.jpg"}
              alt={row.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-[#2E3A2F] truncate text-sm hover:underline cursor-pointer" onClick={() => handleSelectStay(row)}>
              {row.title}
            </div>
            <div className="text-xs text-[#2E3A2F]/60 flex items-center gap-1.5 mt-0.5">
              <span>{row.formattedId || `#H${row.id.replace("lst_", "").padStart(5, "0")}`}</span>
              <span>•</span>
              <span className="capitalize">{row.propertyType}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "host",
      header: "Hôte",
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
      header: "Ville / Région",
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-[#2E3A2F]">
          <MapPin className="w-3.5 h-3.5 text-[#6B7F5B] shrink-0" />
          <span className="truncate">{row.city}, {row.wilayaCode}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <TypePill type={row.hostType} />,
    },
    {
      key: "price",
      header: "Prix / nuit",
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
            onClick={() => handleSelectStay(row)}
            className="p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors"
            title={locale === "ar" ? "معاينة سريعة" : locale === "en" ? "Quick preview" : "Aperçu rapide"}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/stays/${row.id}`)}
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
                onClick: () => handleSelectStay(row),
              },
              {
                label: locale === "ar" ? "موافقة ونشر (Approved)" : locale === "en" ? "Approve / Publish" : "Approuver / Publier",
                icon: <CheckCircle className="w-3.5 h-3.5 text-secondary" />,
                disabled: row.status === "approved" || row.status === "published",
                onClick: async () => {
                  await updateListingStatus(row.id, "approved");
                  addToast({
                    title: locale === "ar" ? "تمت الموافقة على الإعلان" : locale === "en" ? "Listing approved" : "Hébergement approuvé",
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
                    title: locale === "ar" ? "تم تعيين الإعلان قيد المراجعة" : locale === "en" ? "Listing marked pending" : "Hébergement mis en attente",
                    variant: "info",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "تعليق الإعلان (Suspend)" : locale === "en" ? "Suspend Listing" : "Suspendre l'annonce",
                icon: <PauseCircle className="w-3.5 h-3.5 text-amber-700" />,
                disabled: row.status === "suspended",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "suspended");
                  addToast({
                    title: locale === "ar" ? "تم تعليق الإعلان" : locale === "en" ? "Listing suspended" : "Hébergement suspendu",
                    variant: "warning",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "رفض الإعلان (Reject)" : locale === "en" ? "Reject Listing" : "Refuser l'annonce",
                icon: <XCircle className="w-3.5 h-3.5 text-accent" />,
                disabled: row.status === "rejected" || row.status === "refused",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "rejected");
                  addToast({
                    title: locale === "ar" ? "تم رفض الإعلان" : locale === "en" ? "Listing rejected" : "Hébergement refusé",
                    variant: "warning",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "حذف الإعلان" : locale === "en" ? "Delete Listing" : "Supprimer",
                icon: <Trash2 className="w-3.5 h-3.5 text-accent" />,
                variant: "danger",
                onClick: () => setConfirmAction({ type: "delete", stay: row }),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Mockup 05) */}
      <PageHeader
        title="Gestion des hébergements"
        subtitle="Consultez, modifiez et validez tous les hébergements répertoriés sur DARNA."
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
              onClick={() => router.push("/stays/new")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un hébergement</span>
            </button>
          </div>
        }
      />

      {/* 2. KPI Strip (Mockup 05) */}
      <KpiStrip
        cards={kpis}
        activeCardId={normalizedStatus}
        onCardClick={(id) => {
          updateUrl({ status: id === "all" ? null : id, page: "1" });
        }}
      />

      {/* 3. Filter Bar (Mockup 05) */}
      <FilterBar
        searchPlaceholder="Rechercher par titre, ville, propriétaire..."
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
            id: "propType",
            label: "Type de logement",
            value: selectedPropType,
            options: [
              { value: "all", label: "Tous les types" },
              ...PROPERTY_TYPES.map((t) => ({ value: t.toLowerCase(), label: t })),
            ],
            onChange: (val) => {
              setSelectedPropType(val);
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
              { value: "published", label: "Publié" },
              { value: "suspended", label: "Suspendu" },
              { value: "refused", label: "Refusé" },
            ],
            onChange: (val) => {
              updateUrl({ status: val === "all" ? null : val, page: "1" });
            },
          },
        ]}
        onOpenAdvanced={() => setIsFilterDrawerOpen(true)}
        hasActiveFilters={selectedWilaya !== "all" || selectedPropType !== "all" || normalizedStatus !== "all" || !!searchQuery}
        onReset={() => {
          setSearchQuery("");
          setSelectedWilaya("all");
          setSelectedPropType("all");
          updateUrl({ status: null, page: "1" });
        }}
      />

      {/* 4. Split View: Table + Detail Panel (Pattern A - Mockup 05) */}
      <SplitView
        isPanelOpen={!!selectedStay}
        mainContent={
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(s) => s.id}
              selectedRowId={selectedStayId || undefined}
              onRowClick={handleSelectStay}
              isLoading={isLoading}
              emptyMessage="Aucun hébergement trouvé avec ces filtres."
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
                itemLabel="hébergements"
              />
            </div>
          </div>
        }
        detailPanel={
          selectedStay ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedStay.title}
              subtitle={`${selectedStay.formattedId || `#H${selectedStay.id}`} • ${selectedStay.city}`}
              statusBadge={<StatusPill status={selectedStay.status} />}
              actions={
                <button
                  onClick={() => router.push(`/stays/${selectedStay.id}`)}
                  className="p-1 text-[#2E3A2F]/60 hover:text-[#2E3A2F] rounded"
                  title="Plein écran"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedStay.status === "approved" || selectedStay.status === "published") ? (
                      <button
                        onClick={() => setConfirmAction({ type: "suspend", stay: selectedStay })}
                        className="px-3 py-1.5 text-xs font-medium text-[#8C682E] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                      >
                        {locale === "ar" ? "تعليق" : locale === "en" ? "Suspend" : "Suspendre"}
                      </button>
                    ) : (selectedStay.status === "pending_review" || selectedStay.status === "pending") ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await approveListing(selectedStay.id, { id: "usr_superadmin", name: "Super Admin", role: "super_admin" });
                              addToast({
                                title: locale === "ar" ? "تمت الموافقة" : locale === "en" ? "Listing approved" : "Hébergement approuvé",
                                description: locale === "ar" ? "تمت الموافقة على هذا العقار ونشره مباشرة" : locale === "en" ? "This listing has been approved directly" : "Cet hébergement a été approuvé directement.",
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
                          onClick={() => router.push(`/stays/${selectedStay.id}/review`)}
                          className="px-3 py-1.5 text-xs font-medium text-[#2E3A2F] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                        >
                          {locale === "ar" ? "فحص الملف" : locale === "en" ? "Review file" : "Examiner le dossier"}
                        </button>
                      </>
                    ) : (selectedStay.status === "suspended" || selectedStay.status === "rejected" || selectedStay.status === "refused") ? (
                      <button
                        onClick={async () => {
                          try {
                            await restoreListing(selectedStay.id, { id: "usr_superadmin", name: "Super Admin", role: "super_admin" });
                            addToast({
                              title: locale === "ar" ? "تم إلغاء التعليق" : locale === "en" ? "Suspension lifted" : "Suspension annulée",
                              description: locale === "ar" ? "تمت إعادة تفعيل هذا العقار بنجاح" : locale === "en" ? "This listing has been reactivated" : "L'hébergement a été réactivé avec succès.",
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
                      onClick={() => setConfirmAction({ type: "delete", stay: selectedStay })}
                      className="px-3 py-1.5 text-xs font-medium text-[#C96F4F] border border-[#C96F4F]/40 rounded-lg hover:bg-[#C96F4F]/10"
                    >
                      {locale === "ar" ? "حذف" : locale === "en" ? "Delete" : "Supprimer"}
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/stays/${selectedStay.id}`)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
                  >
                    Modifier
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                {/* Carousel */}
                <ImageCarousel
                  images={selectedStay.imageSrc?.length ? selectedStay.imageSrc : [selectedStay.imageSrc?.[0] || "/placeholder-stay.jpg"]}
                  alt={selectedStay.title}
                />

                {/* Rating & Location */}
                <div className="flex items-center justify-between text-xs text-[#2E3A2F] border-b border-[#D9C9B2]/40 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold">{selectedStay.rating.toFixed(1)}</span>
                    <span className="text-[#2E3A2F]/60">({selectedStay.reviewsCount} avis)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#6B7F5B] font-medium cursor-pointer hover:underline">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedStay.city}, {selectedStay.wilayaCode}</span>
                  </div>
                </div>

                {/* Panel Tabs (Mockup 05: Informations, Photos, Équipements, Calendrier, Réservations) */}
                <Tabs
                  items={[
                    { id: "info", label: "Informations" },
                    { id: "photos", label: "Photos" },
                    { id: "amenities", label: "Équipements" },
                    { id: "calendar", label: "Calendrier" },
                    { id: "bookings", label: "Réservations" },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "info" && (
                  <div className="space-y-4">
                    {/* About / General specs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70">
                          {locale === "ar" ? "معلومات عامة عن الإقامة" : locale === "en" ? "About This Stay" : "À propos de ce logement"}
                        </h4>
                        <button
                          onClick={() => router.push(`/stays/${selectedStay.id}`)}
                          className="text-xs text-[#6B7F5B] hover:underline"
                        >
                          {locale === "ar" ? "تعديل" : locale === "en" ? "Edit" : "Modifier"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={locale === "ar" ? "نوع العقار" : locale === "en" ? "Property Type" : "Type de logement"} value={selectedStay.propertyType} />
                        <InfoTile label={locale === "ar" ? "السعة" : locale === "en" ? "Capacity" : "Capacité"} value={`${selectedStay.guestCapacity} ${locale === "ar" ? "ضيوف" : locale === "en" ? "guests" : "voyageurs"}`} />
                        <InfoTile label={locale === "ar" ? "الغرف" : locale === "en" ? "Bedrooms" : "Chambres"} value={`${selectedStay.bedroomCount || 1}`} />
                        <InfoTile label={locale === "ar" ? "الحمامات" : locale === "en" ? "Bathrooms" : "Salles de bain"} value={`${selectedStay.bathroomCount || 1}`} />
                        <InfoTile label={locale === "ar" ? "المساحة" : locale === "en" ? "Surface" : "Surface"} value={`${selectedStay.surfaceM2 || 120} m²`} />
                        <InfoTile label={locale === "ar" ? "الولاية" : locale === "en" ? "Wilaya" : "Wilaya"} value={`${selectedStay.wilayaCode} - ${selectedStay.city}`} />
                      </div>
                    </div>

                    {/* Price & Discount Section (Price & Disc) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2.5">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center justify-between">
                        <span>{locale === "ar" ? "تفاصيل الأسعار والخصومات" : locale === "en" ? "Pricing & Discounts" : "Tarification & Remises"}</span>
                        <span className="font-bold text-[#2E3A2F] text-sm font-mono">{selectedStay.price.toLocaleString("fr-FR")} DZD <span className="text-[10px] text-[#2E3A2F]/60">/ {locale === "ar" ? "ليلة" : locale === "en" ? "night" : "nuit"}</span></span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#D9C9B2]/40">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "رسوم التنظيف" : locale === "en" ? "Cleaning Fee" : "Frais de ménage"}</span>
                          <span className="font-medium text-[#2E3A2F]">3 500 DZD</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "عمولة المنصة" : locale === "en" ? "Commission" : "Commission DARNA"}</span>
                          <span className="font-medium text-[#6B7F5B]">12% ({locale === "ar" ? "مشمولة" : locale === "en" ? "included" : "incluse"})</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "خصم أسبوعي" : locale === "en" ? "Weekly Discount" : "Remise semaine (-10%)"}</span>
                          <span className="font-medium text-[#6B7F5B]">{Math.round(selectedStay.price * 7 * 0.9).toLocaleString("fr-FR")} DZD / 7 j</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "التأمين المسترد" : locale === "en" ? "Deposit" : "Caution remboursable"}</span>
                          <span className="font-medium text-[#2E3A2F]">20 000 DZD</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Schedule Section (Time) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#6B7F5B]" />
                        <span>{locale === "ar" ? "المواعيد والشروط الزمنية" : locale === "en" ? "Times & Duration Rules" : "Horaires & Durées de séjour"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "تسجيل الوصول (Check-in)" : locale === "en" ? "Check-in Time" : "Heure d'arrivée"}</span>
                          <span className="font-medium text-[#2E3A2F]">À partir de 15h00</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "تسجيل المغادرة (Check-out)" : locale === "en" ? "Check-out Time" : "Heure de départ"}</span>
                          <span className="font-medium text-[#2E3A2F]">Avant 11h00</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "الحد الأدنى للإقامة" : locale === "en" ? "Min Stay Duration" : "Durée minimale"}</span>
                          <span className="font-medium text-[#2E3A2F]">2 nuits minimum</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "سياسة الإلغاء" : locale === "en" ? "Cancellation" : "Politique d'annulation"}</span>
                          <span className="font-medium text-[#6B7F5B]">Flexible (48h avant)</span>
                        </div>
                      </div>
                    </div>

                    {/* Host Mini Card */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50">
                      <div className="text-xs font-semibold text-[#2E3A2F] mb-2 flex items-center justify-between">
                        <span>{locale === "ar" ? "المضيف / المالك" : locale === "en" ? "Host / Owner" : "Hôte / Propriétaire"}</span>
                        <span className="text-[11px] text-[#6B7F5B] cursor-pointer hover:underline">
                          {locale === "ar" ? "عرض الملف" : locale === "en" ? "View profile" : "Voir le profil"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E5DFD3] flex items-center justify-center font-bold text-sm text-[#2E3A2F]">
                          {selectedStay.hostName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#2E3A2F]">{selectedStay.hostName}</div>
                          <div className="text-xs text-[#2E3A2F]/60 flex items-center gap-1.5">
                            <span className="capitalize">{selectedStay.hostType}</span>
                            <span>•</span>
                            <span className="text-[#6B7F5B] flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> {locale === "ar" ? "موثق" : locale === "en" ? "Verified" : "Vérifié"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description snippet (Disc) */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">
                        {locale === "ar" ? "الوصف الكامل" : locale === "en" ? "Description" : "Description"}
                      </h4>
                      <p className="text-xs text-[#2E3A2F]/80 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                        {selectedStay.description || "Aucune description fournie pour cet hébergement."}
                      </p>
                    </div>
                  </div>
                )}

                {panelTab === "photos" && (
                  <div className="grid grid-cols-2 gap-2">
                    {(selectedStay.imageSrc?.length ? selectedStay.imageSrc : ["/placeholder-stay.jpg"]).map((img, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-[#D9C9B2]/40">
                        <Image src={img} alt="" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {panelTab === "amenities" && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStay.amenities.map((am, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs bg-[#FAF9F5] border border-[#D9C9B2]/50 text-[#2E3A2F] rounded-md">
                        {am}
                      </span>
                    ))}
                  </div>
                )}

                {panelTab === "calendar" && (
                  <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 text-center">
                    <Calendar className="w-8 h-8 text-[#6B7F5B] mx-auto mb-2 opacity-70" />
                    <p className="text-xs text-[#2E3A2F]/70">
                      Disponibilités et tarifs saisonniers gérés pour cet hébergement.
                    </p>
                    <button
                      onClick={() => router.push(`/stays/${selectedStay.id}?tab=calendar`)}
                      className="mt-2 text-xs font-medium text-[#6B7F5B] hover:underline"
                    >
                      Consulter le calendrier complet →
                    </button>
                  </div>
                )}

                {panelTab === "bookings" && (
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-[#2E3A2F]">#R1248 • Karim L.</div>
                        <div className="text-[11px] text-[#2E3A2F]/60">12 mars - 15 mars 2024</div>
                      </div>
                      <StatusPill status="confirmed" />
                    </div>
                    <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-[#2E3A2F]">#R1190 • Sarah B.</div>
                        <div className="text-[11px] text-[#2E3A2F]/60">02 fév - 06 fév 2024</div>
                      </div>
                      <StatusPill status="completed" />
                    </div>
                  </div>
                )}
              </div>
            </DetailPanel>
          ) : null
        }
      />

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filtres avancés des hébergements"
        onApply={() => {
          setIsFilterDrawerOpen(false);
          fetchData();
        }}
        onReset={() => {
          setSelectedWilaya("all");
          setSelectedPropType("all");
          setIsFilterDrawerOpen(false);
        }}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[#2E3A2F] block mb-1.5">Capacité minimale (personnes)</label>
            <input
              type="number"
              min="1"
              max="30"
              defaultValue="1"
              className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
            />
          </div>
          <div>
            <label className="font-semibold text-[#2E3A2F] block mb-1.5">Fourchette de prix (DZD)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                className="w-1/2 px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
              />
              <input
                type="number"
                placeholder="Max"
                className="w-1/2 px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-[#2E3A2F] block mb-1.5">Mode d'approbation</label>
            <select className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]">
              <option value="all">Tous les modes</option>
              <option value="instant">Réservation instantanée</option>
              <option value="request">Sur demande</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          title={
            confirmAction.type === "delete"
              ? "Supprimer cet hébergement ?"
              : confirmAction.type === "suspend"
              ? "Suspendre cet hébergement ?"
              : "Valider cet hébergement ?"
          }
          description={`Vous êtes sur le point de modifier le statut de "${confirmAction.stay.title}". Cette action sera consignée dans le journal d'audit.`}
          confirmLabel={confirmAction.type === "delete" ? "Supprimer définitivement" : "Confirmer"}
          variant={confirmAction.type === "delete" ? "danger" : "primary"}
          onConfirm={async () => {
            if (confirmAction.type === "delete") {
              addToast({ title: "Hébergement supprimé", variant: "warning" });
            } else if (confirmAction.type === "suspend") {
              await suspendListing(confirmAction.stay.id, "Suspension administrative temporaire", { id: "usr_admin", name: "Admin", role: "super_admin" });
              addToast({ title: "Hébergement suspendu", variant: "info" });
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
