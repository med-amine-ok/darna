"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Clock,
  CheckCircle,
  FileText,
  XCircle,
  Settings,
  MoreHorizontal,
  MapPin,
  ExternalLink,
  MessageSquare,
  Eye,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Phone,
  Mail,
  Home,
  Building2,
  Bed,
  Plane,
  Compass,
  Car,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip, KpiCardItem } from "@/components/ui/KpiStrip";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { DocumentTile } from "@/components/ui/DocumentTile";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "next-intl";
import { listHosts, approveHost, rejectHost, unsuspendHost } from "@/lib/data/hosts";
import { Host, ProviderCategory, HostStatus } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

export default function ProvidersValidationClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // URL state
  const isModeration = pathname.includes("/moderation");
  const currentCategory = searchParams.get("category") || "all";
  const currentStatus = searchParams.get("status") || (isModeration ? "under_review" : "all");
  const selectedHostIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  // Local state
  const [data, setData] = useState<Host[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(selectedHostIdFromUrl);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isValidationRulesOpen, setIsValidationRulesOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedDocToView, setSelectedDocToView] = useState<any | null>(null);

  // Rejection / Changes modal
  const [decisionModal, setDecisionModal] = useState<"reject" | "changes" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");

  // Panel active tab
  const [panelTab, setPanelTab] = useState("informations");

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await listHosts({
        category: currentCategory !== "all" ? currentCategory : undefined,
        status: currentStatus !== "all" ? currentStatus : undefined,
        hostType: selectedType !== "all" ? selectedType : undefined,
        wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
        search: searchQuery,
        page,
        pageSize,
      });

      setData(res.rows);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (res.facets) setFacets(res.facets);

      // Select first item if none selected and data exists
      if (!selectedHostId && res.rows.length > 0) {
        setSelectedHostId(res.rows[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentCategory, currentStatus, selectedType, selectedWilaya, page, pageSize]);

  // Sync selectedHostId with URL
  const handleSelectHost = (id: string) => {
    setSelectedHostId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleClosePanel = () => {
    setSelectedHostId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Quick KPI status filter
  const handleKpiClick = (statusKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", statusKey);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Category tab change
  const handleCategoryChange = (catKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (catKey === "all") params.delete("category");
    else params.set("category", catKey);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedHost = data.find((h) => h.id === selectedHostId) || (data.length > 0 ? data[0] : null);

  // KPI Items
  const kpiItems: KpiCardItem[] = [
    {
      id: "under_review",
      value: facets.status?.under_review ?? 0,
      label: locale === "ar" ? "قيد المراجعة" : locale === "en" ? "Pending validation" : "En attente de validation",
      icon: <Clock className="w-5 h-5 text-amber-700" />,
      iconBg: "tertiary",
      isActive: currentStatus === "under_review",
      onClick: () => handleKpiClick("under_review"),
    },
    {
      id: "approved",
      value: facets.status?.approved ?? 0,
      label: locale === "ar" ? "شركاء معتمدون" : locale === "en" ? "Approved providers" : "Prestataires validés",
      icon: <CheckCircle className="w-5 h-5 text-secondary-800" />,
      iconBg: "secondary",
      isActive: currentStatus === "approved",
      onClick: () => handleKpiClick("approved"),
    },
    {
      id: "applied",
      value: facets.status?.applied ?? 0,
      label: locale === "ar" ? "ملفات غير مكتملة" : locale === "en" ? "To complete" : "À compléter",
      icon: <FileText className="w-5 h-5 text-primary-800" />,
      iconBg: "primary",
      isActive: currentStatus === "applied",
      onClick: () => handleKpiClick("applied"),
    },
    {
      id: "rejected",
      value: facets.status?.rejected ?? 0,
      label: locale === "ar" ? "مرفوضة" : locale === "en" ? "Rejected" : "Refusés",
      icon: <XCircle className="w-5 h-5 text-accent-800" />,
      iconBg: "accent",
      isActive: currentStatus === "rejected",
      onClick: () => handleKpiClick("rejected"),
    },
  ];

  // Category Tabs
  const categoryTabs: TabItem[] = [
    {
      id: "all",
      label: locale === "ar" ? "الكل" : locale === "en" ? "All" : "Tous",
      count: facets.category?.all ?? total,
      icon: <Sparkles className="w-4 h-4 text-primary" />,
    },
    {
      id: "host",
      label: locale === "ar" ? "المضيفون" : locale === "en" ? "Hosts" : "Hôtes",
      count: facets.category?.host ?? 0,
      icon: <Home className="w-4 h-4 text-primary-600" />,
    },
    {
      id: "hotel_hostel",
      label: locale === "ar" ? "فنادق ونزل" : locale === "en" ? "Hotels & Hostels" : "Hôtels & Hostels",
      count: facets.category?.hotel_hostel ?? 0,
      icon: <Building2 className="w-4 h-4 text-secondary-600" />,
    },
    {
      id: "travel_agency",
      label: locale === "ar" ? "وكالات سياحية" : locale === "en" ? "Travel agencies" : "Agences de voyages",
      count: facets.category?.travel_agency ?? 0,
      icon: <Plane className="w-4 h-4 text-amber-600" />,
    },
    {
      id: "experience_company",
      label: locale === "ar" ? "تجارب وأنشطة" : locale === "en" ? "Experiences" : "Expériences",
      count: facets.category?.experience_company ?? 0,
      icon: <Compass className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: "rental_agency",
      label: locale === "ar" ? "وكالات كراء السيارات" : locale === "en" ? "Rental agencies" : "Agences de location",
      count: facets.category?.rental_agency ?? 0,
      icon: <Car className="w-4 h-4 text-sky-600" />,
    },
  ];

  // Table Columns
  const columns: Column<Host>[] = [
    {
      key: "ownerName",
      header: "Prestataire",
      sortable: true,
      render: (h) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 border border-tertiary-200 shrink-0 relative">
            <Image
              src="/assets/template.jpeg"
              alt={h.ownerName}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-primary truncate leading-tight">
              {h.businessName || h.ownerName}
            </span>
            <span className="text-[11px] text-neutral-400 truncate mt-0.5">
              {h.businessName ? h.ownerName : "Particulier"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "providerCategory",
      header: "Type",
      render: (h) => <TypePill type={(h as any).providerCategory || h.hostType} size="sm" />,
    },
    {
      key: "wilayaCode",
      header: "Localisation",
      render: (h) => {
        const w = WILAYAS.find((item) => item.code === h.wilayaCode);
        return (
          <span className="inline-flex items-center gap-1 text-neutral-600">
            <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span className="truncate">{w ? w.nameFr : h.city}</span>
          </span>
        );
      },
    },
    {
      key: "joinedAt",
      header: "Date de demande",
      sortable: true,
      render: (h) => (
        <span className="text-neutral-600 tabular-nums">
          {new Date(h.joinedAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (h) => <StatusPill status={h.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (h) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectHost(h.id);
          }}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-primary transition"
          title="Consulter"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // Decision actions
  const handleApprove = async () => {
    if (!selectedHost) return;
    try {
      await approveHost(selectedHost.id, { id: "usr_admin", name: "Admin", role: "super_admin" });
      addToast({
        title: locale === "ar" ? "تم قبول الشريك ونشره" : locale === "en" ? "Provider approved and published" : "Prestataire validé et publié",
        description: `${selectedHost.businessName || selectedHost.ownerName} ${locale === "ar" ? "أصبح نشطاً الآن على دارنا" : locale === "en" ? "is now active on DARNA." : "est maintenant actif sur DARNA."}`,
        variant: "success",
      });
      fetchData();
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const handleUnsuspend = async () => {
    if (!selectedHost) return;
    try {
      await unsuspendHost(selectedHost.id, { id: "usr_admin", name: "Admin", role: "super_admin" });
      addToast({
        title: locale === "ar" ? "تم إلغاء التعليق وإعادة التفعيل" : locale === "en" ? "Suspension canceled / Restored" : "Suspension annulée / Prestataire réactivé",
        description: `${selectedHost.businessName || selectedHost.ownerName} ${locale === "ar" ? "تمت إعادته إلى الحالة النشطة" : locale === "en" ? "has been restored to active status." : "a été réactivé avec succès."}`,
        variant: "success",
      });
      fetchData();
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const handleConfirmDecision = async () => {
    if (!selectedHost) return;
    try {
      if (decisionModal === "reject") {
        await rejectHost(selectedHost.id, decisionReason || "Dossier non conforme", { id: "usr_admin", name: "Admin", role: "super_admin" });
        addToast({
          title: "Dossier refusé",
          description: `Notification envoyée à ${selectedHost.email}.`,
          variant: "warning",
        });
      } else {
        addToast({
          title: "Demande de compléments envoyée",
          description: `Message transmis au prestataire.`,
          variant: "info",
        });
      }
      setDecisionModal(null);
      setDecisionReason("");
      fetchData();
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const filterSelects: FilterSelect[] = [
    {
      id: "type",
      label: "Type de prestataire",
      value: selectedType,
      options: [
        { value: "all", label: "Tous" },
        { value: "individual", label: "Particulier (Hôte)" },
        { value: "agency", label: "Agence de voyage / location" },
        { value: "hotel", label: "Hôtel" },
        { value: "hostel", label: "Auberge de jeunesse" },
      ],
      onChange: (v) => {
        setSelectedType(v);
        setPage(1);
      },
    },
    {
      id: "wilaya",
      label: "Région / Wilaya",
      value: selectedWilaya,
      options: [
        { value: "all", label: locale === "ar" ? "كل الولايات" : locale === "en" ? "All wilayas" : "Toutes les wilayas" },
        ...WILAYAS.map((w) => ({ value: w.code, label: `${w.code} - ${getWilayaLabel(w, locale)}` })),
      ],
      onChange: (v) => {
        setSelectedWilaya(v);
        setPage(1);
      },
    },
    {
      id: "status",
      label: "Statut",
      value: currentStatus,
      options: [
        { value: "all", label: "Tous les statuts" },
        { value: "under_review", label: "En attente" },
        { value: "approved", label: "Validé" },
        { value: "applied", label: "À compléter" },
        { value: "rejected", label: "Refusé" },
      ],
      onChange: (v) => {
        handleKpiClick(v);
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Validation des prestataires"
        subtitle="Vérifiez et validez tous les prestataires avant leur publication sur la plateforme."
        actions={[
          {
            label: "Paramètres de validation",
            icon: <Settings className="w-4 h-4 text-neutral-500" />,
            onClick: () => setIsValidationRulesOpen(true),
            variant: "outline",
          },
        ]}
      />

      {/* KPI Cards Strip */}
      <KpiStrip items={kpiItems} />

      {/* Category Horizontal Tabs with Counts */}
      <div className="mb-2">
        <Tabs
          tabs={categoryTabs}
          activeTab={currentCategory}
          onChange={handleCategoryChange}
          variant="pill"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Rechercher un prestataire..."
        selects={filterSelects}
        onOpenDrawer={() => setIsFilterDrawerOpen(true)}
        drawerButtonLabel="Plus de filtres"
        hasActiveFilters={
          searchQuery !== "" || selectedType !== "all" || selectedWilaya !== "all" || currentStatus !== "under_review"
        }
        onReset={() => {
          setSearchQuery("");
          setSelectedType("all");
          setSelectedWilaya("all");
          handleKpiClick("under_review");
        }}
      />

      {/* Split-View: Data Table + Right Detail Panel */}
      <SplitView
        isPanelOpen={Boolean(selectedHostId && selectedHost)}
        tableContent={
          <div className="space-y-3">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(h) => h.id}
              selectedIds={selectedHostId ? [selectedHostId] : []}
              onRowClick={(h) => handleSelectHost(h.id)}
              isLoading={isLoading}
            />

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              entityName="prestataires"
            />
          </div>
        }
        panelContent={
          selectedHost ? (
            <DetailPanel
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedHost.status === "under_review" || selectedHost.status === "applied") && (
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        {locale === "ar" ? "موافقة مباشرة" : locale === "en" ? "Approve directly" : "Approuver directement"}
                      </button>
                    )}
                    {(selectedHost.status === "suspended" || selectedHost.status === "banned" || selectedHost.status === "rejected") && (
                      <button
                        type="button"
                        onClick={handleUnsuspend}
                        className="px-3.5 py-2 rounded-xl border border-secondary text-secondary bg-secondary/10 hover:bg-secondary/20 text-xs font-semibold transition cursor-pointer"
                      >
                        {locale === "ar" ? "إلغاء التعليق / تفعيل" : locale === "en" ? "Cancel suspension / Reactivate" : "Annuler la suspension / Réactiver"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDecisionModal("reject")}
                      className="px-3.5 py-2 rounded-xl border border-accent/40 text-accent hover:bg-accent/10 text-xs font-semibold transition cursor-pointer"
                    >
                      {locale === "ar" ? "رفض" : locale === "en" ? "Reject" : "Refuser"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionModal("changes")}
                      className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100 text-xs font-semibold transition cursor-pointer"
                    >
                      {locale === "ar" ? "طلب استكمال" : locale === "en" ? "Request changes" : "Demander des compléments"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleApprove}
                    className="px-4 py-2 rounded-xl bg-[#2E3A2F] hover:bg-[#242e25] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {locale === "ar" ? "اعتماد ونشر" : locale === "en" ? "Validate & publish" : "Valider et publier"}
                  </button>
                </div>
              }
            >
              {/* Hero Image Carousel */}
              <ImageCarousel
                images={["/assets/template.jpeg"]}
                statusBadge={<StatusPill status={selectedHost.status} size="sm" />}
                onClose={handleClosePanel}
                alt={selectedHost.businessName || selectedHost.ownerName}
              />

              {/* Title & Metadata Badges */}
              <div className="px-4 pt-1 space-y-2">
                <div>
                  <h3 className="text-base font-bold text-primary leading-tight">
                    {selectedHost.businessName || selectedHost.ownerName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-800 border border-primary-200 text-[10px] font-semibold">
                      {selectedHost.businessName ? "Professionnel" : "Particulier"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[10px] font-medium">
                      <MapPin className="w-3 h-3 text-secondary" />
                      <span>{selectedHost.city}</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      Demandé le {new Date(selectedHost.joinedAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>

                {/* Detail Tabs */}
                <div className="border-b border-neutral-100 pt-1">
                  <div className="flex items-center gap-3 overflow-x-auto text-xs font-semibold text-neutral-500 py-1">
                    {[
                      { id: "informations", label: "Informations" },
                      { id: "photos", label: "Photos" },
                      { id: "documents", label: "Documents" },
                      { id: "avis", label: "Avis" },
                      { id: "activites", label: "Activités" },
                      { id: "historique", label: "Historique" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPanelTab(tab.id)}
                        className={`pb-1.5 whitespace-nowrap transition cursor-pointer ${
                          panelTab === tab.id
                            ? "text-primary border-b-2 border-primary"
                            : "hover:text-primary"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Panel Tab Content */}
                {panelTab === "informations" && (
                  <div className="space-y-3.5 pt-1">
                    {/* Informations générales Card */}
                    <div className="p-3.5 rounded-xl border border-tertiary-200/80 bg-neutral-50/60 space-y-3">
                      <h4 className="text-xs font-bold text-primary">Informations générales</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">
                            Contact
                          </span>
                          <p className="font-semibold text-primary">{selectedHost.ownerName}</p>
                          <p className="text-neutral-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span>{selectedHost.phone}</span>
                          </p>
                          <p className="text-neutral-600 flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-neutral-400" />
                            <span className="truncate">{selectedHost.email}</span>
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">
                            Spécifications
                          </span>
                          <p className="text-neutral-600">
                            Type: <strong className="text-primary capitalize">{selectedHost.hostType}</strong>
                          </p>
                          <p className="text-neutral-600">
                            Wilaya: <strong className="text-primary">{selectedHost.city}</strong>
                          </p>
                          <p className="text-neutral-600">
                            Annonces: <strong className="text-primary">{selectedHost.listingsCount}</strong>
                          </p>
                        </div>
                      </div>

                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          selectedHost.address || selectedHost.city
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline pt-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Voir sur la carte</span>
                      </a>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-primary">Description</h4>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Prestataire enregistré sur DARNA proposant des prestations touristiques
                        vérifiées dans la région de {selectedHost.city}. Dossier de conformité soumis
                        pour approbation administrative.
                      </p>
                    </div>

                    {/* Documents fournis 4/4 Checklist */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-primary">Documents fournis (4/4)</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-800 text-[10px] font-bold">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Tous les documents sont fournis</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <DocumentTile
                          id="doc_cin"
                          title="Carte d'identité"
                          type="Image"
                          fileSize="2.4 Mo"
                          status="valid"
                          onView={() => setSelectedDocToView({ title: "Carte d'identité nationale", url: "/assets/template.jpeg" })}
                        />
                        <DocumentTile
                          id="doc_prop"
                          title="Titre de propriété"
                          type="PDF"
                          fileSize="1.1 Mo"
                          status="valid"
                          onView={() => setSelectedDocToView({ title: "Titre de propriété ou bail", url: "/assets/template.jpeg" })}
                        />
                        <DocumentTile
                          id="doc_photos"
                          title="Photos du lieu"
                          type="12 fichiers"
                          fileSize="18 Mo"
                          status="valid"
                          onView={() => setSelectedDocToView({ title: "Galerie de photos", url: "/assets/template.jpeg" })}
                        />
                        <DocumentTile
                          id="doc_reglement"
                          title="Règlement intérieur"
                          type="PDF"
                          fileSize="540 Ko"
                          status="valid"
                          onView={() => setSelectedDocToView({ title: "Règlement intérieur", url: "/assets/template.jpeg" })}
                        />
                      </div>
                    </div>

                    {/* Quick profile actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`http://localhost:3000/hosts/${selectedHost.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-tertiary-300 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Voir le profil public</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsContactModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-tertiary-300 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Contacter</span>
                      </button>
                    </div>
                  </div>
                )}

                {panelTab !== "informations" && (
                  <div className="py-8 text-center text-xs text-neutral-400 space-y-1">
                    <p>Contenu de l'onglet {panelTab} chargé.</p>
                    <p className="text-[11px] text-neutral-400">Toutes les pièces sont synchronisées avec le dossier.</p>
                  </div>
                )}
              </div>
            </DetailPanel>
          ) : null
        }
      />

      {/* Filter Drawer for Advanced Filters */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filtres avancés des prestataires"
        hasActiveFilters={selectedType !== "all" || selectedWilaya !== "all"}
        onReset={() => {
          setSelectedType("all");
          setSelectedWilaya("all");
          fetchData();
        }}
        onApply={fetchData}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              Complétude des documents
            </label>
            <select className="w-full p-2.5 rounded-xl border border-tertiary-200">
              <option value="all">Tous les niveaux</option>
              <option value="complete">100% complets (4/4)</option>
              <option value="partial">Documents partiels</option>
              <option value="missing">Pièces manquantes</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              Mode de réservation
            </label>
            <select className="w-full p-2.5 rounded-xl border border-tertiary-200">
              <option value="all">Tous les modes</option>
              <option value="instant">Réservation instantanée</option>
              <option value="request">Sur demande</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-neutral-700 block mb-1">
              Note minimale
            </label>
            <select className="w-full p-2.5 rounded-xl border border-tertiary-200">
              <option value="0">Toutes les notes</option>
              <option value="4.5">★ 4.5 et plus</option>
              <option value="4.0">★ 4.0 et plus</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* Validation Rules Settings Modal */}
      {isValidationRulesOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-tertiary-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-secondary" />
                <h3 className="font-bold text-sm text-primary">Paramètres de validation des prestataires</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsValidationRulesOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <p>
                Configurez les exigences réglementaires et les délais de traitement des dossiers de prestataires.
              </p>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="font-bold text-primary block">Documents requis par catégorie:</span>
                <ul className="list-disc ps-4 space-y-1 text-neutral-600">
                  <li>Hôtes: Carte d'identité + Titre de propriété / bail</li>
                  <li>Hôtels & Hostels: Registre de commerce CNRC + Agrément touristique</li>
                  <li>Agences de voyages: Licence Ministère du Tourisme (Catégorie A/B)</li>
                  <li>Expériences: Diplôme/Carte de guide professionnel + Assurance RC</li>
                </ul>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">
                  SLA de modération maximale (délai de réponse)
                </label>
                <input
                  type="text"
                  defaultValue="48 heures"
                  className="w-full p-2 rounded-xl border border-tertiary-200 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsValidationRulesOpen(false)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
              >
                Enregistrer les paramètres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Provider Modal */}
      {isContactModalOpen && selectedHost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-tertiary-200 max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-primary">
              Contacter {selectedHost.ownerName}
            </h3>
            <p className="text-xs text-neutral-500">
              Envoyer un message direct ou une notification concernant le dossier de validation.
            </p>
            <textarea
              rows={4}
              placeholder="Écrivez votre message ici..."
              className="w-full p-3 rounded-xl border border-tertiary-200 text-xs focus:outline-none focus:border-primary resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  addToast({ title: "Message envoyé", description: "Le prestataire a reçu votre communication.", variant: "success" });
                  setIsContactModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Envoyer le message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Reason Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-tertiary-200 max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-primary">
              {decisionModal === "changes"
                ? "Demander des compléments au prestataire"
                : "Motif de refus du prestataire"}
            </h3>
            <p className="text-xs text-neutral-500">
              {decisionModal === "changes"
                ? "Indiquez les pièces ou précisions requises. Un email et une notification seront envoyés."
                : "Spécifiez la raison légale ou réglementaire du rejet du dossier."}
            </p>
            <textarea
              rows={4}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Précisez les motifs..."
              className="w-full p-3 rounded-xl border border-tertiary-200 text-xs focus:outline-none focus:border-primary resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={!decisionReason.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition ${
                  decisionModal === "changes" ? "bg-amber-600" : "bg-accent"
                } ${!decisionReason.trim() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {decisionModal === "changes" ? "Envoyer la demande" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Lightbox / Viewer Modal */}
      {selectedDocToView && (
        <div
          onClick={() => setSelectedDocToView(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-primary">{selectedDocToView.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedDocToView(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <div className="relative h-80 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
              <Image
                src={selectedDocToView.url}
                alt={selectedDocToView.title}
                fill
                className="object-contain"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDocToView(null)}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
