"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Inbox,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  Home,
  Star,
  DollarSign,
  ChevronRight,
  Eye,
  Filter,
  RefreshCw,
  Search,
  CheckCheck,
  X,
  Keyboard,
  ExternalLink,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { getApprovalsInbox } from "@/lib/data/approvals";
import { approveHost, rejectHost } from "@/lib/data/hosts";
import { approveListing, rejectListing } from "@/lib/data/listings";
import { hideReview, restoreReview, dismissFlag } from "@/lib/data/reviews";
import { resolveDispute } from "@/lib/data/bookings";
import { ModerationCase, HostType } from "@/lib/types";
import { WILAYAS, getWilayaName } from "@/lib/utils/wilayas";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Drawer } from "@/components/ui/Drawer";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate } from "@/lib/utils/format";

interface Props {
  initialTab?: string;
  locale: string;
}

const REJECTION_TEMPLATES = [
  "Incomplete commercial or tax registration document",
  "Listing photos contain promotional watermarks or low resolution",
  "Pricing does not adhere to regional fair market guidelines",
  "Government ID expired or unclear photo",
  "Property address cannot be verified via cadastral records",
  "Review contains prohibited hate speech or abusive language",
  "Other regulatory non-compliance",
];

export default function ApprovalsClient({ initialTab = "hosts", locale }: Props) {
  const t = useTranslations("approvals");
  const tCommon = useTranslations("common");
  const tHostTypes = useTranslations("hostTypes");
  const tVerticals = useTranslations("verticals");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [counts, setCounts] = useState({
    hosts: 0,
    listings: 0,
    documents: 0,
    reviews: 0,
    disputes: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedCase, setSelectedCase] = useState<ModerationCase | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters for Host & Listing categories, Wilaya, and SLA/urgency
  const [hostCategoryFilter, setHostCategoryFilter] = useState<string>("all");
  const [listingVerticalFilter, setListingVerticalFilter] = useState<string>("all");
  const [wilayaFilter, setWilayaFilter] = useState<string>("all");
  const [slaFilter, setSlaFilter] = useState<string>("all");

  // Reject Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReasonTemplate, setRejectReasonTemplate] = useState(REJECTION_TEMPLATES[0]);
  const [rejectCustomNote, setRejectCustomNote] = useState("");
  const [caseToReject, setCaseToReject] = useState<ModerationCase | null>(null);

  const { success, error, info } = useToast();

  const loadInbox = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      const data = await getApprovalsInbox(tab);
      setCases(data.items);
      setCounts(data.counts);
      setSelectedIndex(-1);
      setSelectedCase(null);
      setSelectedIds([]);
    } catch (err: any) {
      error("Failed to load moderation queue", err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadInbox(activeTab);
  }, [activeTab, loadInbox]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const itemWilayaName = c.wilayaCode
          ? getWilayaName(c.wilayaCode, locale as any).toLowerCase()
          : "";
        const matchesQuery =
          c.title?.toLowerCase().includes(q) ||
          c.subtitle?.toLowerCase().includes(q) ||
          c.entityId?.toLowerCase().includes(q) ||
          c.wilayaCode?.includes(q) ||
          itemWilayaName.includes(q) ||
          c.details?.city?.toLowerCase()?.includes(q) ||
          c.details?.businessName?.toLowerCase()?.includes(q) ||
          c.details?.ownerName?.toLowerCase()?.includes(q) ||
          c.details?.hostName?.toLowerCase()?.includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Category filter (hosts vs listings)
      if (activeTab === "hosts") {
        if (hostCategoryFilter !== "all") {
          const type = c.hostType || c.details?.hostType;
          if (type !== hostCategoryFilter) return false;
        }
      } else if (activeTab === "listings") {
        if (listingVerticalFilter !== "all") {
          const vertical = c.vertical || c.details?.category;
          if (vertical !== listingVerticalFilter) return false;
        }
      }

      // 3. Wilaya filter
      if (wilayaFilter !== "all") {
        const itemWilaya = c.wilayaCode || c.details?.wilayaCode;
        if (itemWilaya !== wilayaFilter) return false;
      }

      // 4. SLA / Waiting time filter
      if (slaFilter === "urgent") {
        const threshold = activeTab === "listings" ? 4 : 3;
        if (c.waitingDays < threshold && c.priority !== "high") return false;
      } else if (slaFilter === "normal") {
        const threshold = activeTab === "listings" ? 4 : 3;
        if (c.waitingDays >= threshold || c.priority === "high") return false;
      }

      return true;
    });
  }, [
    cases,
    searchQuery,
    activeTab,
    hostCategoryFilter,
    listingVerticalFilter,
    wilayaFilter,
    slaFilter,
    locale,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (activeTab === "hosts" && hostCategoryFilter !== "all") count++;
    if (activeTab === "listings" && listingVerticalFilter !== "all") count++;
    if (wilayaFilter !== "all") count++;
    if (slaFilter !== "all") count++;
    return count;
  }, [searchQuery, activeTab, hostCategoryFilter, listingVerticalFilter, wilayaFilter, slaFilter]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setHostCategoryFilter("all");
    setListingVerticalFilter("all");
    setWilayaFilter("all");
    setSlaFilter("all");
  };

  // Keyboard navigation & shortcuts: J / K (next / prev), A (approve), R (reject)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(filteredCases.length - 1, prev + 1);
          setSelectedCase(filteredCases[next] || null);
          return next;
        });
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          setSelectedCase(filteredCases[next] || null);
          return next;
        });
      } else if (e.key === "a" || e.key === "A") {
        if (selectedCase) {
          e.preventDefault();
          handleApprove(selectedCase);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (selectedCase) {
          e.preventDefault();
          openRejectDialog(selectedCase);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCases, selectedCase]);

  // Perform single approval
  const handleApprove = async (item: ModerationCase) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      if (item.type === "host") {
        await approveHost(item.entityId, actor);
      } else if (item.type === "listing") {
        await approveListing(item.entityId, actor);
      } else if (item.type === "review") {
        await dismissFlag(item.entityId, actor);
      } else if (item.type === "dispute") {
        await resolveDispute(item.entityId, "Dispute approved in favor of standard terms", actor);
      } else if (item.type === "document") {
        // Document approve
        await approveHost(item.details?.host?.id || item.entityId, actor);
      }

      success(
        `Approved: ${item.title}`,
        "Action committed to ledger and logged to audit trail",
        () => info("Undo requested", "Approval reversed back to review queue")
      );

      // Remove from active list
      setCases((prev) => prev.filter((c) => c.id !== item.id));
      setSelectedCase(null);
    } catch (err: any) {
      error("Approval failed", err.message);
    }
  };

  // Open Reject Dialog
  const openRejectDialog = (item: ModerationCase) => {
    setCaseToReject(item);
    setRejectReasonTemplate(REJECTION_TEMPLATES[0]);
    setRejectCustomNote("");
    setRejectDialogOpen(true);
  };

  // Submit Rejection with mandatory reason
  const submitRejection = async () => {
    if (!caseToReject) return;
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    const fullReason = rejectCustomNote.trim()
      ? `${rejectReasonTemplate} — Note: ${rejectCustomNote.trim()}`
      : rejectReasonTemplate;

    try {
      if (caseToReject.type === "host") {
        await rejectHost(caseToReject.entityId, fullReason, actor);
      } else if (caseToReject.type === "listing") {
        await rejectListing(caseToReject.entityId, fullReason, actor);
      } else if (caseToReject.type === "review") {
        await hideReview(caseToReject.entityId, actor);
      } else if (caseToReject.type === "dispute") {
        await resolveDispute(caseToReject.entityId, `Declined dispute: ${fullReason}`, actor);
      }

      success(
        `Rejected: ${caseToReject.title}`,
        `Reason sent to user in their language: "${fullReason}"`
      );

      setCases((prev) => prev.filter((c) => c.id !== caseToReject.id));
      setRejectDialogOpen(false);
      setCaseToReject(null);
      setSelectedCase(null);
    } catch (err: any) {
      error("Rejection failed", err.message);
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    const itemsToApprove = cases.filter((c) => selectedIds.includes(c.id));
    try {
      for (const item of itemsToApprove) {
        if (item.type === "host") await approveHost(item.entityId, actor);
        else if (item.type === "listing") await approveListing(item.entityId, actor);
        else if (item.type === "review") await dismissFlag(item.entityId, actor);
      }
      success(
        `Bulk Approved ${itemsToApprove.length} items`,
        "All verified entities updated and notifications queued."
      );
      setCases((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    } catch (err: any) {
      error("Bulk approve encountered an issue", err.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCases.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCases.map((c) => c.id));
    }
  };

  const tabs = [
    { key: "hosts", label: t("tabHosts"), count: counts.hosts, icon: Building },
    { key: "listings", label: t("tabListings"), count: counts.listings, icon: Home },
   
    { key: "reviews", label: t("tabReviews"), count: counts.reviews, icon: Star },
    { key: "disputes", label: t("tabDisputes"), count: counts.disputes, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title & Keyboard Shortcuts Tip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              {t("title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/15 text-accent border border-accent/25">
              {counts.total} {t("pendingSla")}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* Keyboard Helper Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-tertiary/70 shadow-2xs text-[11px] text-neutral-500">
          <Keyboard className="w-3.5 h-3.5 text-secondary" />
          <span>Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-primary font-mono font-bold">J</kbd>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-primary font-mono font-bold">K</kbd>
          <span>navigate</span>
          <span className="text-neutral-300">|</span>
          <kbd className="px-1.5 py-0.5 bg-secondary/15 rounded text-secondary font-mono font-bold">A</kbd>
          <span>approve</span>
          <kbd className="px-1.5 py-0.5 bg-accent/15 rounded text-accent font-mono font-bold">R</kbd>
          <span>reject</span>
        </div>
      </div>

      {/* Tabs with Live Counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-tertiary/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-primary text-primary bg-white shadow-2xs"
                  : "border-transparent text-neutral-500 hover:text-primary hover:bg-white/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-secondary" : "text-neutral-400"}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-primary text-white"
                    : tab.count > 0
                    ? "bg-accent/15 text-accent"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar with Category, Wilaya, and SLA controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "hosts"
                  ? "Search by host, business, ID, city..."
                  : activeTab === "listings"
                  ? "Search by listing title, host, city, ID..."
                  : "Search pending items..."
              }
              className="w-full ps-9 pe-8 py-2 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary focus:outline-none focus:border-secondary transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-primary rounded-full hover:bg-neutral-100 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter for Hosts */}
            {activeTab === "hosts" && (
              <div className="relative">
                <select
                  value={hostCategoryFilter}
                  onChange={(e) => setHostCategoryFilter(e.target.value)}
                  className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary font-medium focus:outline-none focus:border-secondary transition cursor-pointer"
                  aria-label={t("filterCategory")}
                >
                  <option value="all">{t("allCategories")}</option>
                  <option value="individual">{tHostTypes("individual")}</option>
                  <option value="agency">{tHostTypes("agency")}</option>
                  <option value="hotel">{tHostTypes("hotel")}</option>
                  <option value="hostel">{tHostTypes("hostel")}</option>
                </select>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Vertical Filter for Listings */}
            {activeTab === "listings" && (
              <div className="relative">
                <select
                  value={listingVerticalFilter}
                  onChange={(e) => setListingVerticalFilter(e.target.value)}
                  className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary font-medium focus:outline-none focus:border-secondary transition cursor-pointer"
                  aria-label={t("filterVertical")}
                >
                  <option value="all">{t("allVerticals")}</option>
                  <option value="home">{tVerticals("home")}</option>
                  <option value="hotel">{tVerticals("hotel")}</option>
                  <option value="trip">{tVerticals("trip")}</option>
                  <option value="vehicle">{tVerticals("vehicle")}</option>
                  <option value="experience">{tVerticals("experience")}</option>
                </select>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Wilaya Filter (Hosts & Listings) */}
            <div className="relative">
              <select
                value={wilayaFilter}
                onChange={(e) => setWilayaFilter(e.target.value)}
                className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary font-medium focus:outline-none focus:border-secondary transition cursor-pointer max-w-[190px]"
                aria-label={t("filterWilaya")}
              >
                <option value="all">{t("allWilayas")}</option>
                {WILAYAS.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} - {locale === "ar" ? w.nameAr : locale === "fr" ? w.nameFr : w.nameEn}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* SLA / Waiting Time Filter */}
            <div className="relative">
              <select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary font-medium focus:outline-none focus:border-secondary transition cursor-pointer"
                aria-label={t("filterSla")}
              >
                <option value="all">{t("allWaitingTimes")}</option>
                <option value="urgent">{t("urgentWaiting")}</option>
                <option value="normal">{t("normalWaiting")}</option>
              </select>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset Filters Button */}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-neutral-600 hover:text-accent hover:border-accent/40"
              >
                <RotateCcw className="w-3.5 h-3.5 me-1" />
                {t("resetFilters")}
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadInbox(activeTab)}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${loading ? "animate-spin" : ""}`} />
              {tCommon("refresh")}
            </Button>
          </div>
        </div>

        {/* Active Filter Chips & Feedback */}
        {activeFiltersCount > 0 && (
          <div className="pt-2.5 border-t border-tertiary/40 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-neutral-500 text-[11px] font-semibold">{tCommon("filters")}:</span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-700 text-[11px] font-medium border border-neutral-200">
                  <span>&quot;{searchQuery}&quot;</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:text-accent cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeTab === "hosts" && hostCategoryFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary/15 text-secondary text-[11px] font-medium border border-secondary/30">
                  <span>{t("filterCategory")}: {tHostTypes(hostCategoryFilter as any)}</span>
                  <button
                    type="button"
                    onClick={() => setHostCategoryFilter("all")}
                    className="hover:text-accent cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeTab === "listings" && listingVerticalFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary/15 text-secondary text-[11px] font-medium border border-secondary/30">
                  <span>{t("filterVertical")}: {tVerticals(listingVerticalFilter as any)}</span>
                  <button
                    type="button"
                    onClick={() => setListingVerticalFilter("all")}
                    className="hover:text-accent cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {wilayaFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-800 text-[11px] font-medium border border-neutral-200">
                  <MapPin className="w-3 h-3 text-neutral-400" />
                  <span>{t("filterWilaya")}: {getWilayaName(wilayaFilter, locale as any)}</span>
                  <button
                    type="button"
                    onClick={() => setWilayaFilter("all")}
                    className="hover:text-accent cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {slaFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[11px] font-medium border border-accent/25">
                  <Clock className="w-3 h-3" />
                  <span>{slaFilter === "urgent" ? t("urgentWaiting") : t("normalWaiting")}</span>
                  <button
                    type="button"
                    onClick={() => setSlaFilter("all")}
                    className="hover:text-accent cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-neutral-500 hover:text-accent underline ps-1 cursor-pointer"
              >
                {tCommon("clearAll")}
              </button>
            </div>

            <span className="text-[11px] text-neutral-500 font-medium">
              {t("showingResults", { shown: filteredCases.length, total: cases.length })}
            </span>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 flex items-center justify-between p-3.5 bg-primary text-white rounded-2xl shadow-darna-modal border border-primary-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold">
              {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-tertiary hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkApprove}
              className="bg-secondary text-white border-secondary hover:bg-secondary/90 text-xs font-bold"
            >
              <CheckCheck className="w-3.5 h-3.5 me-1.5" />
              Bulk Approve ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Main Split View: Queue List on Left, Detail Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cases List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={
                  filteredCases.length > 0 && selectedIds.length === filteredCases.length
                }
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-secondary border-tertiary focus:ring-secondary cursor-pointer"
              />
              <span>Select all {filteredCases.length}</span>
            </label>
            <span className="text-[11px]">
              {activeFiltersCount > 0
                ? t("showingResults", { shown: filteredCases.length, total: cases.length })
                : "Sorted by: Oldest submitted first (SLA priority)"}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-white rounded-2xl border border-tertiary/60 animate-pulse"
                />
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            cases.length > 0 ? (
              <div className="bg-white rounded-2xl border border-tertiary/70 p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto">
                  <Filter className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">{t("noMatchesTitle")}</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    {t("noMatchesSubtitle")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                  {t("resetFilters")}
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-tertiary/70 p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-primary">All caught up!</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  No items pending moderation in this queue. Great job keeping the marketplace safe and verified.
                </p>
              </div>
            )
          ) : (
            filteredCases.map((item, idx) => {
              const isSelected = selectedCase?.id === item.id;
              const isChecked = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedCase(item);
                    setSelectedIndex(idx);
                  }}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer bg-white text-start ${
                    isSelected
                      ? "border-secondary ring-2 ring-secondary/20 shadow-darna-card"
                      : "border-tertiary/70 hover:border-secondary/50 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) =>
                          isChecked ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      className="mt-1 w-4 h-4 rounded text-secondary border-tertiary focus:ring-secondary cursor-pointer"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-primary truncate">
                          {item.title}
                        </span>
                        <StatusPill status={item.status as any} size="sm" />
                        {item.waitingDays > 2 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                            <Clock className="w-3 h-3" />
                            waiting {item.waitingDays}d
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{item.subtitle}</p>

                      {/* Badges for Category, Wilaya, and Submission Date */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap text-[11px]">
                        {/* Host Category badge */}
                        {item.type === "host" && (item.hostType || item.details?.hostType) && (
                          <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary font-medium">
                            {tHostTypes((item.hostType || item.details?.hostType) as any)}
                          </span>
                        )}

                        {/* Listing Vertical badge */}
                        {item.type === "listing" && (item.vertical || item.details?.category) && (
                          <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary font-medium">
                            {tVerticals((item.vertical || item.details?.category) as any)}
                          </span>
                        )}

                        {/* Wilaya badge */}
                        {(item.wilayaCode || item.details?.wilayaCode) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            {getWilayaName(item.wilayaCode || item.details?.wilayaCode, locale as any)}
                          </span>
                        )}

                        <span className="text-neutral-300">·</span>
                        <span className="text-neutral-400">
                          Submitted: {formatDate(item.submittedAt, locale)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Row Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(item);
                        }}
                        title="Approve (A)"
                        className="p-1.5 rounded-xl bg-secondary/15 text-secondary hover:bg-secondary hover:text-white transition cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRejectDialog(item);
                        }}
                        title="Reject (R)"
                        className="p-1.5 rounded-xl bg-accent/15 text-accent hover:bg-accent hover:text-white transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Inspection Drawer / Sidebar */}
        <div className="lg:col-span-5 sticky top-6">
          {selectedCase ? (
            <div className="bg-white rounded-2xl border border-tertiary/80 shadow-darna-card p-5 space-y-5 text-start">
              <div className="flex items-start justify-between gap-3 border-b border-tertiary/40 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold capitalize text-secondary">
                      {selectedCase.type} review
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
                      {selectedCase.entityId}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-primary mt-1">{selectedCase.title}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{selectedCase.subtitle}</p>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Entity Specific Information Cards */}
              <div className="space-y-3 text-xs">
                {selectedCase.type === "host" && (
                  <div className="space-y-2 p-3 rounded-xl bg-darnaBg/50 border border-tertiary/60">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Business / Owner:</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.businessName || selectedCase.details?.ownerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Category:</span>
                      <span className="font-semibold text-primary capitalize">
                        {selectedCase.details?.hostType
                          ? tHostTypes(selectedCase.details.hostType as any)
                          : selectedCase.details?.hostType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Wilaya:</span>
                      <span className="font-semibold text-primary">
                        {getWilayaName(
                          selectedCase.wilayaCode || selectedCase.details?.wilayaCode,
                          locale as any
                        )}
                        {selectedCase.details?.city ? ` (${selectedCase.details.city})` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Phone:</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.phone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Commercial Reg / NIF:</span>
                      <span className="font-mono font-semibold text-primary">
                        {selectedCase.details?.nifNumber || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                {selectedCase.type === "listing" && (
                  <div className="space-y-2 p-3 rounded-xl bg-darnaBg/50 border border-tertiary/60">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Host:</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.hostName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Category / Vertical:</span>
                      <span className="font-semibold text-primary capitalize">
                        {selectedCase.vertical || selectedCase.details?.category
                          ? tVerticals(
                              (selectedCase.vertical || selectedCase.details?.category) as any
                            )
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Nightly Price:</span>
                      <span className="font-bold text-secondary">
                        {formatDzd(selectedCase.details?.price || 0, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">City & Wilaya:</span>
                      <span className="font-semibold text-primary">
                        {getWilayaName(
                          selectedCase.wilayaCode || selectedCase.details?.wilayaCode,
                          locale as any
                        )}
                        {selectedCase.details?.city ? ` (${selectedCase.details.city})` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Approval Mode:</span>
                      <span className="font-semibold text-primary capitalize">
                        {selectedCase.details?.approvalMode || "instant"}
                      </span>
                    </div>
                  </div>
                )}

                {selectedCase.type === "review" && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="flex items-center gap-1.5 text-accent font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Reported Content</span>
                    </div>
                    <p className="text-xs italic text-primary leading-relaxed bg-white p-2.5 rounded-lg border border-accent/15">
                      &quot;{selectedCase.details?.comment}&quot;
                    </p>
                    <div className="text-[11px] text-neutral-500 flex justify-between">
                      <span>Flagged by community</span>
                      <span className="font-bold text-accent">
                        Reason: {selectedCase.details?.flagReason || "Offensive language"}
                      </span>
                    </div>
                  </div>
                )}

                {selectedCase.type === "dispute" && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                      <DollarSign className="w-4 h-4" />
                      <span>Disputed Booking</span>
                    </div>
                    <p className="text-xs text-neutral-700">
                      Booking Reference: <strong>{selectedCase.details?.reference}</strong>
                    </p>
                    <p className="text-xs text-neutral-700">
                      Dispute Amount:{" "}
                      <strong>
                        {formatDzd(selectedCase.details?.totalAmountDzd || 0, locale)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons inside Drawer */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="primary"
                  className="flex-1 text-xs font-bold"
                  onClick={() => handleApprove(selectedCase)}
                >
                  <CheckCircle className="w-4 h-4 me-1.5" />
                  {t("approveAction")} (A)
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs font-bold"
                  onClick={() => openRejectDialog(selectedCase)}
                >
                  <XCircle className="w-4 h-4 me-1.5" />
                  {t("rejectAction")} (R)
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-tertiary/70 p-8 text-center text-neutral-400">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">
                Select an item from the list or press <kbd className="font-mono bg-neutral-100 px-1 rounded text-primary">J</kbd> to inspect details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Dialog (Mandatory Reason per Section 7) */}
      <Dialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        title={`Reject ${caseToReject?.type || "Item"}: ${caseToReject?.title}`}
        size="md"
      >
        <div className="space-y-4 text-start">
          <p className="text-xs text-neutral-600">
            A formal rejection reason is mandatory. The applicant will receive a translated notification with this explanation.
          </p>

          <div>
            <label className="block text-xs font-bold text-primary mb-1.5">
              Standard Reason Template
            </label>
            <select
              value={rejectReasonTemplate}
              onChange={(e) => setRejectReasonTemplate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary focus:outline-none focus:border-accent"
            >
              {REJECTION_TEMPLATES.map((tmpl, i) => (
                <option key={i} value={tmpl}>
                  {tmpl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1.5">
              Additional Details / Note to Host (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectCustomNote}
              onChange={(e) => setRejectCustomNote(e.target.value)}
              placeholder="e.g. Please re-upload commercial register with valid 2026 stamp."
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={submitRejection}
              className="font-bold text-xs"
            >
              {t("rejectAction")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
