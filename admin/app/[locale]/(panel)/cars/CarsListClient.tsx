"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Car,
  CheckCircle,
  Clock,
  XCircle,
  Wrench,
  Download,
  Plus,
  Eye,
  ExternalLink,
  MapPin,
  Calendar,
  Users,
  Star,
  Tag,
  Fuel,
  Gauge,
  SlidersHorizontal,
  Maximize2,
  Building2,
  PauseCircle,
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
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { useLocale } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listListings, approveListing, suspendListing, restoreListing, updateListingStatus } from "@/lib/data/listings";
import { Listing } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

const CAR_CATEGORIES = ["SUV & 4x4", "Citadine", "Berline", "Compacte", "Utilitaire"];

export default function CarsListClient() {
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
    if (lower === "published" || lower === "approved") return "approved";
    if (lower === "refused" || lower === "rejected") return "rejected";
    return lower;
  };
  const normalizedStatus = normalizeStatusKey(currentStatus);
  const selectedCarIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  const [data, setData] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGearbox, setSelectedGearbox] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(selectedCarIdFromUrl);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("details");

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "maintenance";
    car: Listing;
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
        vertical: "vehicle",
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
  }, [currentStatus, selectedWilaya, selectedCategory, selectedGearbox, page, pageSize, searchQuery]);

  const selectedCar = data.find((c) => c.id === selectedCarId) || null;

  const handleSelectCar = (car: Listing) => {
    setSelectedCarId(car.id);
    updateUrl({ selected: car.id });
  };

  const handleClosePanel = () => {
    setSelectedCarId(null);
    updateUrl({ selected: null });
  };

  // KPI Strip (Mockup 09: 1,024 Véhicules · 542 Disponibles · 186 Réservées · 42 En maintenance · 32 Indisponibles · 86 Agences)
  const statusFacets = facets["status"] || {};
  const totalCount = Object.values(statusFacets).reduce((a, b) => a + b, 0) || total;

  const kpis: KpiCardItem[] = [
    {
      id: "all",
      label: "Total des véhicules",
      value: totalCount || 1024,
      icon: <Car className="w-5 h-5" />,
      colorVariant: "neutral",
    },
    {
      id: "approved",
      label: "Disponibles",
      value: statusFacets["approved"] ?? 542,
      icon: <CheckCircle className="w-5 h-5" />,
      colorVariant: "success",
    },
    {
      id: "booked",
      label: "Réservées",
      value: 186,
      icon: <Calendar className="w-5 h-5" />,
      colorVariant: "primary",
    },
    {
      id: "maintenance",
      label: "En maintenance",
      value: 42,
      icon: <Wrench className="w-5 h-5" />,
      colorVariant: "warning",
    },
    {
      id: "rejected",
      label: "Indisponibles",
      value: statusFacets["rejected"] ?? 32,
      icon: <XCircle className="w-5 h-5" />,
      colorVariant: "danger",
    },
    {
      id: "owners",
      label: "Agences & Loueurs",
      value: 86,
      icon: <Building2 className="w-5 h-5" />,
      colorVariant: "neutral",
    },
  ];

  // Table columns (Mockup 09: #, Véhicule, Catégorie, Ville, Prix / jour, Statut, Actions)
  const columns: Column<Listing>[] = [
    {
      key: "id",
      header: "#",
      className: "w-20",
      render: (row) => (
        <span className="font-mono text-xs text-[#2E3A2F]/70 font-semibold">
          {row.formattedId || `#V${row.id.replace("lst_", "").padStart(4, "0")}`}
        </span>
      ),
    },
    {
      key: "vehicle",
      header: "Véhicule",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#E5DFD3] shrink-0 border border-[#D9C9B2]/40">
            <Image
              src={row.imageSrc?.[0] || "/placeholder-car.jpg"}
              alt={row.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div
              className="font-medium text-[#2E3A2F] truncate text-sm hover:underline cursor-pointer"
              onClick={() => handleSelectCar(row)}
            >
              {row.title}
            </div>
            <div className="text-xs text-[#2E3A2F]/60 mt-0.5">
              2023 • Diesel • Boîte auto
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Catégorie",
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAE5D9] text-[#2E3A2F] border border-[#D9C9B2]/50">
          <Car className="w-3 h-3 text-[#6B7F5B]" />
          <span>{row.propertyType || "SUV & 4x4"}</span>
        </span>
      ),
    },
    {
      key: "location",
      header: "Ville",
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-[#2E3A2F]">
          <MapPin className="w-3.5 h-3.5 text-[#6B7F5B] shrink-0" />
          <span className="truncate">{row.city}, {row.wilayaCode}</span>
        </div>
      ),
    },
    {
      key: "price",
      header: "Prix / jour",
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
            onClick={() => handleSelectCar(row)}
            className="p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors"
            title={locale === "ar" ? "معاينة سريعة" : locale === "en" ? "Quick preview" : "Aperçu rapide"}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/cars/${row.id}`)}
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
                onClick: () => handleSelectCar(row),
              },
              {
                label: locale === "ar" ? "موافقة ونشر (Approved)" : locale === "en" ? "Approve / Publish" : "Approuver / Publier",
                icon: <CheckCircle className="w-3.5 h-3.5 text-secondary" />,
                disabled: row.status === "approved" || row.status === "published",
                onClick: async () => {
                  await updateListingStatus(row.id, "approved");
                  addToast({
                    title: locale === "ar" ? "تمت الموافقة على المركبة" : locale === "en" ? "Vehicle approved" : "Véhicule approuvé",
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
                    title: locale === "ar" ? "تم وضع المركبة قيد المراجعة" : locale === "en" ? "Vehicle marked pending" : "Véhicule mis en attente",
                    variant: "info",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "تعليق المركبة (Suspend)" : locale === "en" ? "Suspend Vehicle" : "Suspendre le véhicule",
                icon: <PauseCircle className="w-3.5 h-3.5 text-amber-700" />,
                disabled: row.status === "suspended",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "suspended");
                  addToast({
                    title: locale === "ar" ? "تم تعليق المركبة" : locale === "en" ? "Vehicle suspended" : "Véhicule suspendu",
                    variant: "warning",
                  });
                  fetchData();
                },
              },
              {
                label: locale === "ar" ? "وضع في الصيانة" : locale === "en" ? "Maintenance mode" : "En maintenance",
                icon: <Wrench className="w-3.5 h-3.5 text-amber-600" />,
                onClick: () => setConfirmAction({ type: "maintenance", car: row }),
              },
              {
                label: locale === "ar" ? "رفض المركبة (Reject)" : locale === "en" ? "Reject Vehicle" : "Refuser le véhicule",
                icon: <XCircle className="w-3.5 h-3.5 text-accent" />,
                disabled: row.status === "rejected" || row.status === "refused",
                variant: "danger",
                onClick: async () => {
                  await updateListingStatus(row.id, "rejected");
                  addToast({
                    title: locale === "ar" ? "تم رفض المركبة" : locale === "en" ? "Vehicle rejected" : "Véhicule refusé",
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
      {/* 1. Page Header (Mockup 09) */}
      <PageHeader
        title="Location de voitures"
        subtitle="Gérez le parc automobile disponible à la location, les tarifs et les agences partenaires."
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
              onClick={() => router.push("/cars/categories")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE] transition-colors shadow-sm"
            >
              <Tag className="w-4 h-4" />
              <span>Catégories</span>
            </button>
            <button
              onClick={() => router.push("/cars/new")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une voiture</span>
            </button>
          </div>
        }
      />

      {/* 2. KPI Strip (Mockup 09: 6 cards) */}
      <KpiStrip
        cards={kpis}
        activeCardId={currentStatus}
        onCardClick={(id) => {
          updateUrl({ status: id === "all" ? null : id, page: "1" });
        }}
      />

      {/* 3. Filter Bar (Mockup 09) */}
      <FilterBar
        searchPlaceholder="Rechercher par marque, modèle, agence..."
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "category",
            label: "Catégorie",
            value: selectedCategory,
            options: [
              { value: "all", label: "Toutes les catégories" },
              ...CAR_CATEGORIES.map((c) => ({ value: c.toLowerCase(), label: c })),
            ],
            onChange: (val) => {
              setSelectedCategory(val);
              setPage(1);
            },
          },
          {
            id: "wilaya",
            label: "Ville / Wilaya",
            value: selectedWilaya,
            options: [
              { value: "all", label: "Toutes les villes" },
              ...WILAYAS.map((w) => ({ value: w.code, label: `${w.code} - ${getWilayaLabel(w, locale)}` })),
            ],
            onChange: (val) => {
              setSelectedWilaya(val);
              setPage(1);
            },
          },
          {
            id: "gearbox",
            label: "Boîte de vitesse",
            value: selectedGearbox,
            options: [
              { value: "all", label: "Toutes" },
              { value: "auto", label: "Automatique" },
              { value: "manual", label: "Manuelle" },
            ],
            onChange: (val) => {
              setSelectedGearbox(val);
              setPage(1);
            },
          },
          {
            id: "status",
            label: "Statut",
            value: normalizedStatus,
            options: [
              { value: "all", label: "Tous les statuts" },
              { value: "approved", label: "Disponible" },
              { value: "pending", label: "En attente" },
              { value: "maintenance", label: "En maintenance" },
              { value: "rejected", label: "Indisponible" },
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
          setSelectedGearbox("all");
          updateUrl({ status: null, page: "1" });
        }}
      />

      {/* 4. Split View: Table + Detail Panel (Mockup 09) */}
      <SplitView
        isPanelOpen={!!selectedCar}
        mainContent={
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(c) => c.id}
              selectedRowId={selectedCarId || undefined}
              onRowClick={handleSelectCar}
              isLoading={isLoading}
              emptyMessage="Aucun véhicule trouvé."
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
                itemLabel="véhicules"
              />
            </div>
          </div>
        }
        detailPanel={
          selectedCar ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedCar.title}
              subtitle={`${selectedCar.formattedId || `#V${selectedCar.id}`} • ${selectedCar.city}`}
              statusBadge={<StatusPill status={selectedCar.status} />}
              actions={
                <button
                  onClick={() => router.push(`/cars/${selectedCar.id}`)}
                  className="p-1 text-[#2E3A2F]/60 hover:text-[#2E3A2F] rounded"
                  title="Plein écran"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedCar.status === "pending" || selectedCar.status === "pending_review") && (
                      <button
                        onClick={async () => {
                          await approveListing(selectedCar.id, { id: "usr_admin", name: "Admin", role: "super_admin" });
                          addToast({
                            title: locale === "ar" ? "تمت الموافقة على السيارة" : locale === "en" ? "Vehicle approved directly" : "Véhicule approuvé directement",
                            variant: "success",
                          });
                          fetchData();
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#6B7F5B] rounded-lg hover:bg-[#58694a] transition-colors"
                      >
                        {locale === "ar" ? "موافقة مباشرة" : locale === "en" ? "Approve directly" : "Approuver directement"}
                      </button>
                    )}
                    {(selectedCar.status === "suspended" || selectedCar.status === "rejected" || selectedCar.status === "refused" || (selectedCar.status as any) === "maintenance") && (
                      <button
                        onClick={async () => {
                          await restoreListing(selectedCar.id, { id: "usr_admin", name: "Admin", role: "super_admin" });
                          addToast({
                            title: locale === "ar" ? "تم إلغاء التعليق وإعادة التفعيل" : locale === "en" ? "Vehicle restored" : "Véhicule réactivé",
                            variant: "success",
                          });
                          fetchData();
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-[#2E3A2F] border border-[#6B7F5B] bg-[#6B7F5B]/10 rounded-lg hover:bg-[#6B7F5B]/20 transition-colors"
                      >
                        {locale === "ar" ? "إلغاء التعليق / تفعيل" : locale === "en" ? "Cancel suspension / Reactivate" : "Annuler la suspension / Réactiver"}
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmAction({ type: "maintenance", car: selectedCar })}
                      className="px-3 py-1.5 text-xs font-medium text-[#8C682E] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                    >
                      En maintenance
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "delete", car: selectedCar })}
                      className="px-3 py-1.5 text-xs font-medium text-[#C96F4F] border border-[#C96F4F]/40 rounded-lg hover:bg-[#C96F4F]/10"
                    >
                      Supprimer
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/cars/${selectedCar.id}`)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
                  >
                    Modifier le véhicule
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <ImageCarousel
                  images={selectedCar.imageSrc?.length ? selectedCar.imageSrc : ["/placeholder-car.jpg"]}
                  alt={selectedCar.title}
                />

                <div className="flex items-center justify-between text-xs text-[#2E3A2F] border-b border-[#D9C9B2]/40 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold">{selectedCar.rating.toFixed(1)}</span>
                    <span className="text-[#2E3A2F]/60">({selectedCar.reviewsCount} avis)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#6B7F5B] font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedCar.city}, {selectedCar.wilayaCode}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "details", label: "Détails" },
                    { id: "pricing", label: "Tarifs" },
                    { id: "photos", label: "Photos" },
                    { id: "amenities", label: "Équipements" },
                    { id: "bookings", label: "Réservations" },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "details" && (
                  <div className="space-y-4">
                    {/* About This Vehicle */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-2">
                        {locale === "ar" ? "حول المركبة والمواصفات (About)" : locale === "en" ? "About This Vehicle" : "À propos du véhicule"}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoTile label={locale === "ar" ? "الفئة" : locale === "en" ? "Category" : "Catégorie"} value={selectedCar.propertyType || "SUV & 4x4"} />
                        <InfoTile label={locale === "ar" ? "سنة الصنع" : locale === "en" ? "Year" : "Année"} value="2023" />
                        <InfoTile label={locale === "ar" ? "نوع الوقود" : locale === "en" ? "Fuel" : "Carburant"} value="Diesel" />
                        <InfoTile label={locale === "ar" ? "ناقل الحركة" : locale === "en" ? "Transmission" : "Transmission"} value="Automatique" />
                        <InfoTile label={locale === "ar" ? "عدد الركاب" : locale === "en" ? "Capacity" : "Capacité"} value="5 places" />
                        <InfoTile label={locale === "ar" ? "التكييف" : locale === "en" ? "Air Conditioning" : "Climatisation"} value="Oui" />
                      </div>
                    </div>

                    {/* Price & Discounts Section (Price & Disc) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2.5">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center justify-between">
                        <span>{locale === "ar" ? "الأسعار والخصومات (Price & Disc)" : locale === "en" ? "Pricing & Discounts" : "Tarification & Remises"}</span>
                        <span className="font-bold text-[#2E3A2F] text-sm font-mono">{selectedCar.price.toLocaleString("fr-FR")} DZD <span className="text-[10px] text-[#2E3A2F]/60">/ {locale === "ar" ? "يوم" : locale === "en" ? "day" : "jour"}</span></span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#D9C9B2]/40">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "خصم أسبوعي" : locale === "en" ? "Weekly Discount" : "Remise semaine (-10%)"}</span>
                          <span className="font-medium text-[#6B7F5B]">{Math.round(selectedCar.price * 0.9).toLocaleString("fr-FR")} DZD / j</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "خصم شهري" : locale === "en" ? "Monthly Discount" : "Remise mensuelle (-25%)"}</span>
                          <span className="font-medium text-[#6B7F5B]">{Math.round(selectedCar.price * 0.75).toLocaleString("fr-FR")} DZD / j</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "التأمين المسترد" : locale === "en" ? "Security Deposit" : "Caution remboursable"}</span>
                          <span className="font-medium text-[#2E3A2F]">50 000 DZD</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "المسافة المسموحة" : locale === "en" ? "Mileage" : "Kilométrage"}</span>
                          <span className="font-medium text-[#6B7F5B]">Illimité (+3 jours)</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Schedule Section (Time) */}
                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-2">
                      <div className="text-xs font-semibold text-[#2E3A2F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#6B7F5B]" />
                        <span>{locale === "ar" ? "المواعيد وشروط الإيجار (Time)" : locale === "en" ? "Rental Times & Duration" : "Horaires & Conditions de location"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "استلام السيارة" : locale === "en" ? "Pick-up Time" : "Heure de prise"}</span>
                          <span className="font-medium text-[#2E3A2F]">À partir de 08h30</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "إرجاع السيارة" : locale === "en" ? "Return Time" : "Heure de retour"}</span>
                          <span className="font-medium text-[#2E3A2F]">Avant 19h00</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "الحد الأدنى للإيجار" : locale === "en" ? "Min Rental Duration" : "Durée minimale"}</span>
                          <span className="font-medium text-[#2E3A2F]">2 jours minimum</span>
                        </div>
                        <div>
                          <span className="text-[#2E3A2F]/60 block">{locale === "ar" ? "سياسة الوقود" : locale === "en" ? "Fuel Policy" : "Politique carburant"}</span>
                          <span className="font-medium text-[#6B7F5B]">Plein à plein (Same-to-same)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50">
                      <div className="text-xs font-semibold text-[#2E3A2F] mb-1">
                        {locale === "ar" ? "وكالة الإيجار المالكة" : locale === "en" ? "Owner Rental Agency" : "Agence propriétaire"}
                      </div>
                      <div className="text-sm font-medium text-[#2E3A2F]">{selectedCar.hostName}</div>
                      <div className="text-xs text-[#2E3A2F]/60">{locale === "ar" ? "وكالة كراء سيارات معتمدة" : "Agence de location agréée"}</div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">
                        {locale === "ar" ? "الوصف الكامل للمركبة (Description)" : locale === "en" ? "Vehicle Description" : "Description"}
                      </h4>
                      <p className="text-xs text-[#2E3A2F]/80 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                        {selectedCar.description || (locale === "ar" ? "لا يوجد وصف متوفر" : "Aucune description fournie pour ce véhicule.")}
                      </p>
                    </div>
                  </div>
                )}

                {panelTab === "pricing" && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 flex justify-between">
                      <span className="text-[#2E3A2F]/70">1 à 3 jours</span>
                      <span className="font-semibold text-[#2E3A2F]">{selectedCar.price.toLocaleString("fr-FR")} DZD / j</span>
                    </div>
                    <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 flex justify-between">
                      <span className="text-[#2E3A2F]/70">4 à 7 jours</span>
                      <span className="font-semibold text-secondary">{Math.round(selectedCar.price * 0.9).toLocaleString("fr-FR")} DZD / j (-10%)</span>
                    </div>
                    <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 flex justify-between">
                      <span className="text-[#2E3A2F]/70">8 à 14 jours</span>
                      <span className="font-semibold text-secondary">{Math.round(selectedCar.price * 0.85).toLocaleString("fr-FR")} DZD / j (-15%)</span>
                    </div>
                    <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 flex justify-between">
                      <span className="text-[#2E3A2F]/70">+15 jours</span>
                      <span className="font-semibold text-secondary">{Math.round(selectedCar.price * 0.75).toLocaleString("fr-FR")} DZD / j (-25%)</span>
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
          title={
            confirmAction.type === "delete"
              ? "Supprimer ce véhicule ?"
              : "Mettre ce véhicule en maintenance ?"
          }
          description={`Vous allez modifier le statut du véhicule "${confirmAction.car.title}".`}
          variant={confirmAction.type === "delete" ? "danger" : "primary"}
          onConfirm={async () => {
            if (confirmAction.type === "delete") {
              addToast({ title: "Véhicule supprimé", variant: "warning" });
            } else {
              addToast({ title: "Véhicule placé en maintenance", variant: "info" });
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
