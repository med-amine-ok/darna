"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Check,
  Sparkles,
  Phone,
  Mail,
  Home,
  Building2,
  Plane,
  Compass,
  Car,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip, KpiCardItem } from "@/components/ui/KpiStrip";
import { placeholderFor } from "@/lib/placeholders";
import { m } from "framer-motion";
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
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useTranslations } from "next-intl";
import { listHosts, approveHost, rejectHost, unsuspendHost } from "@/lib/actions/hosts";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Host } from "@/lib/types";
import { WILAYAS, getWilayaLabel, type Wilaya } from "@/lib/utils/wilayas";
import { canHostAction, MIN_REASON_LENGTH } from "@/lib/domain/transitions";
import { formatDate, formatNumber, intlLocale } from "@/lib/utils/format";

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const PANEL_TABS = ["informations", "photos", "documents", "avis", "activites", "historique"] as const;

function wilayaName(w: Wilaya, locale: string) {
  return locale === "ar" ? w.nameAr : locale === "en" ? w.nameEn : w.nameFr || w.name;
}

// Public guest/host site (the frontend app), for "view public profile" links.
const FRONTEND_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function ProvidersValidationClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const can = useCan();
  const t = useTranslations("providers");
  const tActions = useTranslations("actions");
  const tCommon = useTranslations("common");
  const tHostTypes = useTranslations("hostTypes");

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
  const [selectedDocToView, setSelectedDocToView] = useState<{ title: string; url: string } | null>(null);

  // Rejection / Changes modal
  const [decisionModal, setDecisionModal] = useState<"reject" | "changes" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");

  // Panel active tab
  const [panelTab, setPanelTab] = useState<(typeof PANEL_TABS)[number]>("informations");

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = unwrap(await listHosts({
        category: currentCategory !== "all" ? currentCategory : undefined,
        status: currentStatus !== "all" ? currentStatus : undefined,
        hostType: selectedType !== "all" ? selectedType : undefined,
        wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
        search: searchQuery,
        page,
        pageSize,
      }));

      setData(res.rows);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (res.facets) setFacets(res.facets);

      // Select first item if none selected and data exists
      if (res.rows.length > 0) {
        setSelectedHostId((prev) => prev ?? res.rows[0].id);
      }
    } catch (err) {
      addToast({ title: t("toast.loadFailed"), description: errMsg(err), variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, [currentCategory, currentStatus, selectedType, selectedWilaya, searchQuery, page, pageSize, addToast, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  const hostDisplayName = (h: Host) => h.businessName || h.ownerName;

  // KPI Items
  const kpiItems: KpiCardItem[] = [
    {
      id: "under_review",
      value: facets.status?.under_review ?? 0,
      label: t("kpi.underReview"),
      icon: <Clock className="w-5 h-5 text-amber-700" aria-hidden="true" />,
      iconBg: "tertiary",
      isActive: currentStatus === "under_review",
      onClick: () => handleKpiClick("under_review"),
    },
    {
      id: "approved",
      value: facets.status?.approved ?? 0,
      label: t("kpi.approved"),
      icon: <CheckCircle className="w-5 h-5 text-secondary-800" aria-hidden="true" />,
      iconBg: "secondary",
      isActive: currentStatus === "approved",
      onClick: () => handleKpiClick("approved"),
    },
    {
      id: "applied",
      value: facets.status?.applied ?? 0,
      label: t("kpi.applied"),
      icon: <FileText className="w-5 h-5 text-primary-800" aria-hidden="true" />,
      iconBg: "primary",
      isActive: currentStatus === "applied",
      onClick: () => handleKpiClick("applied"),
    },
    {
      id: "rejected",
      value: facets.status?.rejected ?? 0,
      label: t("kpi.rejected"),
      icon: <XCircle className="w-5 h-5 text-accent-800" aria-hidden="true" />,
      iconBg: "accent",
      isActive: currentStatus === "rejected",
      onClick: () => handleKpiClick("rejected"),
    },
  ];

  // Category Tabs
  const categoryTabs: TabItem[] = [
    {
      id: "all",
      label: t("categories.all"),
      count: facets.category?.all ?? total,
      icon: <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />,
    },
    {
      id: "host",
      label: t("categories.host"),
      count: facets.category?.host ?? 0,
      icon: <Home className="w-4 h-4 text-primary-600" aria-hidden="true" />,
    },
    {
      id: "hotel_hostel",
      label: t("categories.hotel_hostel"),
      count: facets.category?.hotel_hostel ?? 0,
      icon: <Building2 className="w-4 h-4 text-secondary-600" aria-hidden="true" />,
    },
    {
      id: "travel_agency",
      label: t("categories.travel_agency"),
      count: facets.category?.travel_agency ?? 0,
      icon: <Plane className="w-4 h-4 text-amber-600 rtl:-scale-x-100" aria-hidden="true" />,
    },
    {
      id: "experience_company",
      label: t("categories.experience_company"),
      count: facets.category?.experience_company ?? 0,
      icon: <Compass className="w-4 h-4 text-emerald-600" aria-hidden="true" />,
    },
    {
      id: "rental_agency",
      label: t("categories.rental_agency"),
      count: facets.category?.rental_agency ?? 0,
      icon: <Car className="w-4 h-4 text-sky-600" aria-hidden="true" />,
    },
  ];

  // Table Columns
  const columns: Column<Host>[] = [
    {
      key: "ownerName",
      header: t("cols.provider"),
      sortable: true,
      render: (h) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-tertiary-100 ring-1 ring-inset ring-primary/[0.06] shrink-0 relative">
            <Image
              src={placeholderFor("stay")}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-primary truncate leading-tight">
              {hostDisplayName(h)}
            </span>
            <span className="text-[11px] text-primary-600 truncate mt-0.5">
              {h.businessName ? h.ownerName : t("individual")}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "providerCategory",
      header: t("cols.type"),
      render: (h) => (
        <TypePill type={(h as Host & { providerCategory?: string }).providerCategory || h.hostType} size="sm" />
      ),
    },
    {
      key: "wilayaCode",
      header: t("cols.location"),
      render: (h) => {
        const w = WILAYAS.find((item) => item.code === h.wilayaCode);
        return (
          <span className="inline-flex items-center gap-1 text-primary-600">
            <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" aria-hidden="true" />
            <span className="truncate">{w ? wilayaName(w, locale) : h.city}</span>
          </span>
        );
      },
    },
    {
      key: "joinedAt",
      header: t("cols.requestedAt"),
      sortable: true,
      render: (h) => (
        <span className="text-primary-600 tabular-nums">
          {formatDate(h.joinedAt, locale)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("cols.status"),
      render: (h) => <StatusPill status={h.status} size="sm" />,
    },
    {
      key: "actions",
      header: t("cols.actions"),
      align: "right",
      render: (h) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectHost(h.id);
          }}
          className={`p-1.5 rounded-lg hover:bg-primary/[0.05] text-primary-600 hover:text-primary transition ${FOCUS_RING}`}
          title={t("view", { name: hostDisplayName(h) })}
          aria-label={t("view", { name: hostDisplayName(h) })}
        >
          <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
        </button>
      ),
    },
  ];

  // Decision actions
  const handleApprove = async () => {
    if (!selectedHost) return;
    try {
      unwrap(await approveHost(selectedHost.id));
      addToast({
        title: t("toast.approved"),
        description: t("toast.approvedDesc", { name: hostDisplayName(selectedHost) }),
        variant: "success",
      });
      fetchData();
    } catch (err) {
      addToast({ title: t("toast.error"), description: errMsg(err), variant: "danger" });
    }
  };

  const handleUnsuspend = async () => {
    if (!selectedHost) return;
    try {
      unwrap(await unsuspendHost(selectedHost.id));
      addToast({
        title: t("toast.unsuspended"),
        description: t("toast.unsuspendedDesc", { name: hostDisplayName(selectedHost) }),
        variant: "success",
      });
      fetchData();
    } catch (err) {
      addToast({ title: t("toast.error"), description: errMsg(err), variant: "danger" });
    }
  };

  const handleConfirmDecision = async () => {
    if (!selectedHost) return;
    try {
      if (decisionModal === "reject") {
        unwrap(await rejectHost(selectedHost.id, decisionReason.trim()));
        addToast({
          title: t("toast.rejected"),
          description: t("toast.rejectedDesc", { email: selectedHost.email }),
          variant: "warning",
        });
      } else {
        addToast({
          title: t("toast.changesSent"),
          description: t("toast.changesSentDesc"),
          variant: "info",
        });
      }
      setDecisionModal(null);
      setDecisionReason("");
      fetchData();
    } catch (err) {
      addToast({ title: t("toast.error"), description: errMsg(err), variant: "danger" });
    }
  };

  const filterSelects: FilterSelect[] = [
    {
      id: "type",
      label: t("filters.type"),
      value: selectedType,
      options: [
        { value: "all", label: t("filters.allTypes") },
        { value: "individual", label: t("filters.typeIndividual") },
        { value: "agency", label: t("filters.typeAgency") },
        { value: "hotel", label: t("filters.typeHotel") },
        { value: "hostel", label: t("filters.typeHostel") },
      ],
      onChange: (v) => {
        setSelectedType(v);
        setPage(1);
      },
    },
    {
      id: "wilaya",
      label: t("filters.wilaya"),
      value: selectedWilaya,
      options: [
        { value: "all", label: t("filters.allWilayas") },
        ...WILAYAS.map((w) => ({ value: w.code, label: getWilayaLabel(w, locale) })),
      ],
      onChange: (v) => {
        setSelectedWilaya(v);
        setPage(1);
      },
    },
    {
      id: "status",
      label: t("filters.status"),
      value: currentStatus,
      options: [
        { value: "all", label: t("filters.allStatuses") },
        { value: "under_review", label: t("filters.underReview") },
        { value: "approved", label: t("filters.approved") },
        { value: "applied", label: t("filters.applied") },
        { value: "rejected", label: t("filters.rejected") },
      ],
      onChange: (v) => {
        handleKpiClick(v);
      },
    },
  ];

  const reasonTooShort = decisionReason.trim().length < MIN_REASON_LENGTH;
  const showReasonHint = decisionReason.length > 0 && reasonTooShort;

  const onPanelTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = document.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backward = document.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    let next = -1;
    if (e.key === forward) next = (index + 1) % PANEL_TABS.length;
    else if (e.key === backward) next = (index - 1 + PANEL_TABS.length) % PANEL_TABS.length;
    if (next < 0) return;
    e.preventDefault();
    setPanelTab(PANEL_TABS[next]);
    document.getElementById(`provider-tab-${PANEL_TABS[next]}`)?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          {
            label: t("settings"),
            icon: <Settings className="w-4 h-4 text-primary-600" aria-hidden="true" />,
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
        searchPlaceholder={t("filters.search")}
        selects={filterSelects}
        onOpenDrawer={() => setIsFilterDrawerOpen(true)}
        drawerButtonLabel={t("filters.more")}
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

      {/* Split-View: Data Table + Detail Panel */}
      <SplitView
        isPanelOpen={Boolean(selectedHostId && selectedHost)}
        tableContent={
          <div className="space-y-3">
            <DataTable
              columns={
                selectedHostId && selectedHost
                  ? columns.filter((c) => !["providerCategory", "joinedAt", "actions"].includes(c.key))
                  : columns
              }
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
              entityName={t("entity")}
            />
          </div>
        }
        panelContent={
          selectedHost ? (
            <DetailPanel
              footer={
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {canHostAction(selectedHost.status, "approve") && can("hosts.approve") && (
                      <button
                        type="button"
                        onClick={handleApprove}
                        className={`px-3.5 min-h-[38px] rounded-xl bg-secondary-700 hover:bg-secondary-800 text-white text-xs font-semibold transition-colors duration-fast shadow-e1 cursor-pointer ${FOCUS_RING}`}
                      >
                        {t("actions.approveDirectly")}
                      </button>
                    )}
                    {canHostAction(selectedHost.status, "unsuspend") && can("hosts.suspend") && (
                      <button
                        type="button"
                        onClick={handleUnsuspend}
                        className={`px-3.5 min-h-[38px] rounded-xl ring-1 ring-inset ring-secondary-300 text-secondary-800 bg-white hover:bg-secondary-50 text-xs font-semibold transition-colors duration-fast cursor-pointer ${FOCUS_RING}`}
                      >
                        {t("actions.unsuspend")}
                      </button>
                    )}
                    {can("hosts.reject") && canHostAction(selectedHost.status, "reject") && (
                    <button
                      type="button"
                      onClick={() => setDecisionModal("reject")}
                      className={`px-3.5 min-h-[38px] rounded-xl ring-1 ring-inset ring-accent/40 bg-white text-accent-700 hover:bg-accent-50 text-xs font-semibold transition-colors duration-fast cursor-pointer ${FOCUS_RING}`}
                    >
                      {t("actions.reject")}
                    </button>
                    )}

                    {can("hosts.reject") && (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={tActions("unavailableHint")}
                      className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/40 text-amber-900/50 text-xs font-semibold cursor-not-allowed"
                    >
                      {t("actions.requestChanges")}
                    </button>
                    )}
                  </div>

                  {can("hosts.approve") && canHostAction(selectedHost.status, "approve") && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    className={`px-4 min-h-[38px] rounded-xl bg-primary-800 hover:bg-primary-900 text-white text-xs font-semibold transition-colors duration-fast shadow-e1 cursor-pointer ${FOCUS_RING}`}
                  >
                    {t("actions.validatePublish")}
                  </button>
                  )}
                </div>
              }
            >
              {/* Hero Image Carousel */}
              <ImageCarousel
                images={[placeholderFor("stay")]}
                statusBadge={<StatusPill status={selectedHost.status} size="sm" />}
                onClose={handleClosePanel}
                alt={hostDisplayName(selectedHost)}
              />

              {/* Title & Metadata Badges */}
              <div className="px-4 pt-1 space-y-2">
                <div>
                  <h3 className="text-title font-semibold text-primary-900 leading-tight">
                    {hostDisplayName(selectedHost)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-primary-100 text-primary-800 text-[11px] font-semibold">
                      {selectedHost.businessName ? t("professional") : t("individual")}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-darnaBg-300 text-primary-600 text-[11px] font-medium">
                      <MapPin className="w-3 h-3 text-secondary" aria-hidden="true" />
                      <span>{selectedHost.city}</span>
                    </span>
                    <span className="text-[11px] text-primary-600 font-medium">
                      {t("panel.requestedOn", { date: formatDate(selectedHost.joinedAt, locale) })}
                    </span>
                  </div>
                </div>

                {/* Detail Tabs */}
                <div className="border-b border-primary/[0.06] pt-1">
                  <div
                    role="tablist"
                    aria-label={t("panel.tabsLabel")}
                    className="flex items-center gap-4 overflow-x-auto scrollbar-none text-xs font-semibold text-primary-600 pt-1"
                  >
                    {PANEL_TABS.map((tabId, index) => (
                      <button
                        key={tabId}
                        id={`provider-tab-${tabId}`}
                        type="button"
                        role="tab"
                        aria-selected={panelTab === tabId}
                        aria-controls="provider-tabpanel"
                        tabIndex={panelTab === tabId ? 0 : -1}
                        onClick={() => setPanelTab(tabId)}
                        onKeyDown={(e) => onPanelTabKeyDown(e, index)}
                        className={`relative pb-2 whitespace-nowrap transition-colors duration-fast ease-standard cursor-pointer rounded-t ${FOCUS_RING} ${
                          panelTab === tabId ? "text-primary-900" : "hover:text-primary-900"
                        }`}
                      >
                        {t(`panel.tabs.${tabId}`)}
                        {panelTab === tabId && (
                          <m.span
                            layoutId="provider-panel-tab"
                            aria-hidden="true"
                            className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-600"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Panel Tab Content */}
                <div id="provider-tabpanel" role="tabpanel" aria-labelledby={`provider-tab-${panelTab}`}>
                {panelTab === "informations" && (
                  <div className="space-y-3.5 pt-1">
                    {/* General information card */}
                    <div className="p-3.5 rounded-xl bg-darnaBg-100 space-y-3">
                      <h4 className="text-xs font-semibold text-primary">{t("panel.general")}</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-primary-600 font-semibold uppercase tracking-[0.06em]">
                            {t("panel.contact")}
                          </span>
                          <p className="font-semibold text-primary">{selectedHost.ownerName}</p>
                          <p className="text-primary-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-primary-600" aria-hidden="true" />
                            <span dir="ltr">{selectedHost.phone}</span>
                          </p>
                          <p className="text-primary-600 flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-primary-600" aria-hidden="true" />
                            <span className="truncate" dir="ltr">{selectedHost.email}</span>
                          </p>
                        </div>

                        <dl className="space-y-1.5">
                          <span className="text-[11px] text-primary-600 font-semibold uppercase tracking-[0.06em] block">
                            {t("panel.specs")}
                          </span>
                          <div className="text-primary-600 flex gap-1">
                            <dt>{t("panel.type")}:</dt>
                            <dd className="font-semibold text-primary">{tHostTypes(selectedHost.hostType)}</dd>
                          </div>
                          <div className="text-primary-600 flex gap-1">
                            <dt>{t("panel.wilaya")}:</dt>
                            <dd className="font-semibold text-primary">{selectedHost.city}</dd>
                          </div>
                          <div className="text-primary-600 flex gap-1">
                            <dt>{t("panel.listings")}:</dt>
                            <dd className="font-semibold text-primary">{formatNumber(selectedHost.listingsCount, locale)}</dd>
                          </div>
                        </dl>
                      </div>

                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          selectedHost.address || selectedHost.city
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-800 hover:underline pt-1 rounded ${FOCUS_RING}`}
                      >
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("panel.viewOnMap")}</span>
                        <span className="sr-only">{t("panel.newTab")}</span>
                      </a>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-primary">{t("panel.description")}</h4>
                      <p className="text-xs text-primary-600 leading-relaxed">
                        {t("panel.descriptionText", { city: selectedHost.city })}
                      </p>
                    </div>

                    {/* Documents checklist */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-primary">
                          {t("panel.documentsProvided", { count: 4, total: 4 })}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-800 text-[11px] font-semibold">
                          <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                          <span>{t("panel.allDocumentsProvided")}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <DocumentTile
                          id="doc_cin"
                          title={t("docs.idCard")}
                          type={t("docs.typeImage")}
                          fileSize={t("docs.sizeMb", { size: formatNumber(2.4, locale) })}
                          status="valid"
                          onView={() => setSelectedDocToView({ title: t("docs.idCardFull"), url: "/assets/template.jpeg" })}
                        />
                        <DocumentTile
                          id="doc_prop"
                          title={t("docs.property")}
                          type={t("docs.typePdf")}
                          fileSize={t("docs.sizeMb", { size: formatNumber(1.1, locale) })}
                          status="valid"
                          onView={() => setSelectedDocToView({ title: t("docs.propertyFull"), url: "/assets/template.jpeg" })}
                        />
                        <DocumentTile
                          id="doc_photos"
                          title={t("docs.photos")}
                          type={t("docs.files", { count: 12 })}
                          fileSize={t("docs.sizeMb", { size: formatNumber(18, locale) })}
                          status="valid"
                          onView={() => setSelectedDocToView({ title: t("docs.photosFull"), url: "/assets/template.jpeg" })}
                        />
                        <DocumentTile
                          id="doc_reglement"
                          title={t("docs.rules")}
                          type={t("docs.typePdf")}
                          fileSize={t("docs.sizeKb", { size: formatNumber(540, locale) })}
                          status="valid"
                          onView={() => setSelectedDocToView({ title: t("docs.rules"), url: "/assets/template.jpeg" })}
                        />
                      </div>
                    </div>

                    {/* Quick profile actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`${FRONTEND_URL}/${locale}/users/${selectedHost.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-center gap-2 px-3 min-h-[38px] rounded-xl bg-white shadow-e1 hover:shadow-e2 text-xs font-semibold text-primary-800 transition duration-fast ${FOCUS_RING}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-primary-600 rtl:-scale-x-100" aria-hidden="true" />
                        <span>{t("panel.publicProfile")}</span>
                        <span className="sr-only">{t("panel.newTab")}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsContactModalOpen(true)}
                        className={`inline-flex items-center justify-center gap-2 px-3 min-h-[38px] rounded-xl bg-white shadow-e1 hover:shadow-e2 text-xs font-semibold text-primary-800 transition duration-fast ${FOCUS_RING}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" />
                        <span>{t("panel.contactAction")}</span>
                      </button>
                    </div>
                  </div>
                )}

                {panelTab !== "informations" && (
                  <div className="py-8 text-center text-xs text-primary-600 space-y-1">
                    <p>{t("panel.tabLoaded", { tab: t(`panel.tabs.${panelTab}`) })}</p>
                    <p className="text-[11px] text-primary-600">{t("panel.tabSynced")}</p>
                  </div>
                )}
                </div>
              </div>
            </DetailPanel>
          ) : null
        }
      />

      {/* Filter Drawer for Advanced Filters */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title={t("drawer.title")}
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
            <label htmlFor="providers-completeness" className="font-semibold text-primary-700 block mb-1">
              {t("drawer.completeness")}
            </label>
            <select id="providers-completeness" className="w-full p-2.5 rounded-xl border border-primary/[0.12] bg-white">
              <option value="all">{t("drawer.completenessAll")}</option>
              <option value="complete">{t("drawer.completenessFull")}</option>
              <option value="partial">{t("drawer.completenessPartial")}</option>
              <option value="missing">{t("drawer.completenessMissing")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="providers-booking-mode" className="font-semibold text-primary-700 block mb-1">
              {t("drawer.bookingMode")}
            </label>
            <select id="providers-booking-mode" className="w-full p-2.5 rounded-xl border border-primary/[0.12] bg-white">
              <option value="all">{t("drawer.bookingModeAll")}</option>
              <option value="instant">{t("drawer.bookingModeInstant")}</option>
              <option value="request">{t("drawer.bookingModeRequest")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="providers-min-rating" className="font-semibold text-primary-700 block mb-1">
              {t("drawer.minRating")}
            </label>
            <select id="providers-min-rating" className="w-full p-2.5 rounded-xl border border-primary/[0.12] bg-white">
              <option value="0">{t("drawer.minRatingAll")}</option>
              <option value="4.5">
                {t("drawer.minRatingValue", { rating: formatNumber(4.5, locale) })}
              </option>
              <option value="4.0">
                {t("drawer.minRatingValue", {
                  rating: new Intl.NumberFormat(intlLocale(locale), {
                    minimumFractionDigits: 1,
                  }).format(4),
                })}
              </option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* Validation Rules Settings Modal */}
      <Dialog
        isOpen={isValidationRulesOpen}
        onClose={() => setIsValidationRulesOpen(false)}
        title={t("rules.title")}
        description={t("rules.intro")}
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setIsValidationRulesOpen(false)}
            className={`px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold ${FOCUS_RING}`}
          >
            {t("rules.save")}
          </button>
        }
      >
        <div className="space-y-3 text-xs text-primary-600">
          <div className="p-3 rounded-xl bg-darnaBg-100 space-y-2">
            <span className="font-semibold text-primary block">{t("rules.requiredDocs")}</span>
            <ul className="list-disc ps-4 space-y-1 text-primary-600">
              <li>{t("rules.hosts")}</li>
              <li>{t("rules.hotels")}</li>
              <li>{t("rules.agencies")}</li>
              <li>{t("rules.experiences")}</li>
            </ul>
          </div>

          <div>
            <label htmlFor="providers-sla" className="font-semibold text-primary-700 block mb-1">
              {t("rules.sla")}
            </label>
            <input
              id="providers-sla"
              type="text"
              defaultValue={t("rules.slaDefault")}
              className="w-full p-2 rounded-xl border border-primary/[0.08] text-xs"
            />
          </div>
        </div>
      </Dialog>

      {/* Contact Provider Modal */}
      <Dialog
        isOpen={isContactModalOpen && !!selectedHost}
        onClose={() => setIsContactModalOpen(false)}
        title={selectedHost ? t("contactModal.title", { name: selectedHost.ownerName }) : undefined}
        description={t("contactModal.description")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsContactModalOpen(false)}
              className={`px-4 py-2 rounded-xl border border-primary/[0.12] text-xs font-semibold text-primary-600 ${FOCUS_RING}`}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title={tActions("unavailableHint")}
              className="px-4 py-2 rounded-xl bg-primary/40 text-white text-xs font-semibold cursor-not-allowed"
            >
              {t("contactModal.send")}
            </button>
          </>
        }
      >
        <label htmlFor="providers-contact-message" className="sr-only">
          {t("contactModal.messageLabel")}
        </label>
        <textarea
          id="providers-contact-message"
          rows={4}
          placeholder={t("contactModal.placeholder")}
          className="w-full p-3 rounded-xl border border-primary/[0.08] text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 resize-none"
        />
      </Dialog>

      {/* Decision Reason Modal */}
      <Dialog
        isOpen={!!decisionModal}
        onClose={() => setDecisionModal(null)}
        title={decisionModal === "changes" ? t("decision.changesTitle") : t("decision.rejectTitle")}
        description={decisionModal === "changes" ? t("decision.changesDesc") : t("decision.rejectDesc")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDecisionModal(null)}
              className={`px-4 py-2 rounded-xl border border-primary/[0.12] text-xs font-semibold text-primary-600 ${FOCUS_RING}`}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirmDecision}
              disabled={reasonTooShort}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition ${FOCUS_RING} ${
                decisionModal === "changes" ? "bg-amber-700 hover:bg-amber-800" : "bg-accent-600 hover:bg-accent-700"
              } ${reasonTooShort ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {decisionModal === "changes" ? t("decision.sendRequest") : t("decision.confirmReject")}
            </button>
          </>
        }
      >
        <div>
          <label htmlFor="providers-decision-reason" className="block text-xs font-semibold text-primary-700 mb-1">
            {tActions("reasonLabel")}
          </label>
          <textarea
            id="providers-decision-reason"
            rows={4}
            required
            aria-required="true"
            aria-invalid={showReasonHint || undefined}
            aria-describedby="providers-decision-reason-hint"
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            placeholder={t("decision.placeholder")}
            className="w-full p-3 rounded-xl border border-primary/[0.08] text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 resize-none"
          />
          <p
            id="providers-decision-reason-hint"
            className={`mt-1 text-[11px] ${showReasonHint ? "text-accent-700" : "text-primary-600"}`}
            aria-live="polite"
          >
            {tActions("reasonTooShort", { min: MIN_REASON_LENGTH })}
          </p>
        </div>
      </Dialog>

      {/* Document Viewer Modal */}
      <Dialog
        isOpen={!!selectedDocToView}
        onClose={() => setSelectedDocToView(null)}
        title={selectedDocToView?.title}
        size="xl"
        footer={
          <button
            type="button"
            onClick={() => setSelectedDocToView(null)}
            className={`px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold ${FOCUS_RING}`}
          >
            {tCommon("close")}
          </button>
        }
      >
        {selectedDocToView && (
          <div className="relative h-80 rounded-xl overflow-hidden bg-darnaBg-300 border border-primary/[0.12]">
            <Image
              src={selectedDocToView.url}
              alt={selectedDocToView.title}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-contain"
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}
