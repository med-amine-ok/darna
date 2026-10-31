"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
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
  MapPin,
  RotateCcw,
} from "lucide-react";
import { getApprovalsInbox } from "@/lib/actions/approvals";
import { approveHost, rejectHost } from "@/lib/actions/hosts";
import { approveListing, rejectListing } from "@/lib/actions/listings";
import { hideReview, dismissFlag } from "@/lib/actions/reviews";
import { resolveDispute } from "@/lib/actions/bookings";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { ModerationCase, HostType, ListingVertical, Permission, Booking, DisputeOutcome } from "@/lib/types";
import { DisputeDialog } from "@/components/features/bookings/BookingMoneyDialogs";
import { WILAYAS, getWilayaLabel, getWilayaName } from "@/lib/utils/wilayas";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate, formatNumber } from "@/lib/utils/format";
import { m } from "framer-motion";
import { slideIn } from "@/lib/motion";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  initialTab?: string;
  locale: string;
}

// Keys under approvals.reject.templates (translated at render time).
const REJECTION_TEMPLATES = [
  "registration",
  "photos",
  "pricing",
  "idExpired",
  "address",
  "hateSpeech",
  "other",
] as const;
type RejectionTemplate = (typeof REJECTION_TEMPLATES)[number];

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const TABS_PANEL_ID = "approvals-queue-panel";

export default function ApprovalsClient({ initialTab = "hosts", locale }: Props) {
  const t = useTranslations("approvals");
  const tOps = useTranslations("bookingOps");
  const [disputeCase, setDisputeCase] = useState<ModerationCase | null>(null);
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
  const [rejectReasonTemplate, setRejectReasonTemplate] = useState<RejectionTemplate>(REJECTION_TEMPLATES[0]);
  const [rejectCustomNote, setRejectCustomNote] = useState("");
  const [caseToReject, setCaseToReject] = useState<ModerationCase | null>(null);

  const { success, error, info } = useToast();
  const can = useCan();

  // Permission the server action enforces for approve / reject of each case type
  const APPROVE_PERMISSION: Record<ModerationCase["type"], Permission> = {
    host: "hosts.approve",
    document: "hosts.approve",
    listing: "listings.approve",
    review: "reviews.moderate",
    dispute: "bookings.dispute",
  };
  const REJECT_PERMISSION: Record<ModerationCase["type"], Permission> = {
    host: "hosts.reject",
    document: "hosts.reject",
    listing: "listings.reject",
    review: "reviews.moderate",
    dispute: "bookings.dispute",
  };
  const canApprove = (item: ModerationCase) => can(APPROVE_PERMISSION[item.type]);
  const canReject = (item: ModerationCase) => item.type !== "document" && can(REJECT_PERMISSION[item.type]);

  const loadInbox = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      const data = unwrap(await getApprovalsInbox(tab));
      setCases(data.items);
      setCounts(data.counts);
      setSelectedIndex(-1);
      setSelectedCase(null);
      setSelectedIds([]);
    } catch (err) {
      error(t("toast.loadFailed"), errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [error, t]);

  useEffect(() => {
    loadInbox(activeTab);
  }, [activeTab, loadInbox]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const itemWilayaName = c.wilayaCode
          ? getWilayaName(c.wilayaCode, locale).toLowerCase()
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

  // Latest approve / reject handlers, read by the keyboard shortcut listener.
  const shortcutHandlers = useRef<{
    approve: (item: ModerationCase) => void;
    reject: (item: ModerationCase) => void;
  }>({ approve: () => {}, reject: () => {} });

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
          shortcutHandlers.current.approve(selectedCase);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (selectedCase) {
          e.preventDefault();
          shortcutHandlers.current.reject(selectedCase);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCases, selectedCase]);

  // Perform single approval
  const handleApprove = async (item: ModerationCase) => {
    if (!canApprove(item)) return;
    try {
      if (item.type === "host") {
        unwrap(await approveHost(item.entityId));
      } else if (item.type === "listing") {
        unwrap(await approveListing(item.entityId));
      } else if (item.type === "review") {
        unwrap(await dismissFlag(item.entityId));
      } else if (item.type === "dispute") {
        // Disputes need an explicit outcome (full / partial refund or decline) and a note.
        setDisputeCase(item);
        return;
      } else if (item.type === "document") {
        // Document approve
        unwrap(await approveHost(item.details?.host?.id || item.entityId));
      }

      success(
        t("toast.approved", { title: item.title }),
        t("toast.approvedDesc"),
        () => info(t("toast.undoRequested"), t("toast.undoDesc"))
      );

      // Remove from active list
      setCases((prev) => prev.filter((c) => c.id !== item.id));
      setSelectedCase(null);
    } catch (err) {
      error(t("toast.approveFailed"), errMsg(err));
    }
  };

  // Open Reject Dialog
  const openRejectDialog = (item: ModerationCase) => {
    if (!canReject(item)) return;
    setCaseToReject(item);
    setRejectReasonTemplate(REJECTION_TEMPLATES[0]);
    setRejectCustomNote("");
    setRejectDialogOpen(true);
  };

  // Submit Rejection with mandatory reason
  const submitRejection = async () => {
    if (!caseToReject) return;
    const templateText = t(`reject.templates.${rejectReasonTemplate}`);
    const fullReason = rejectCustomNote.trim()
      ? t("reject.withNote", { template: templateText, note: rejectCustomNote.trim() })
      : templateText;

    try {
      if (caseToReject.type === "host") {
        unwrap(await rejectHost(caseToReject.entityId, fullReason));
      } else if (caseToReject.type === "listing") {
        unwrap(await rejectListing(caseToReject.entityId, fullReason));
      } else if (caseToReject.type === "review") {
        unwrap(await hideReview(caseToReject.entityId));
      } else if (caseToReject.type === "dispute") {
        unwrap(await resolveDispute(caseToReject.entityId, "declined", fullReason));
      }

      success(
        t("toast.rejected", { title: caseToReject.title }),
        t("toast.rejectedDesc", { reason: fullReason })
      );

      setCases((prev) => prev.filter((c) => c.id !== caseToReject.id));
      setRejectDialogOpen(false);
      setCaseToReject(null);
      setSelectedCase(null);
    } catch (err) {
      error(t("toast.rejectFailed"), errMsg(err));
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    const itemsToApprove = cases.filter((c) => selectedIds.includes(c.id) && canApprove(c));
    try {
      for (const item of itemsToApprove) {
        if (item.type === "host") unwrap(await approveHost(item.entityId));
        else if (item.type === "listing") unwrap(await approveListing(item.entityId));
        else if (item.type === "review") unwrap(await dismissFlag(item.entityId));
      }
      success(
        t("toast.bulkApproved", { count: itemsToApprove.length }),
        t("toast.bulkApprovedDesc")
      );
      setCases((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    } catch (err) {
      error(t("toast.bulkFailed"), errMsg(err));
    }
  };

  shortcutHandlers.current = { approve: handleApprove, reject: openRejectDialog };

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-serif text-heading text-primary-900">
              {t("title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-accent-100 text-accent-800 ring-1 ring-inset ring-accent-200">
              {t("pendingBadge", { count: formatNumber(counts.total, locale) })}
            </span>
          </div>
          <p className="text-meta text-primary-600 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* Keyboard Helper Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-xl bg-white shadow-e1 text-xs text-primary-600">
          <Keyboard className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
          <span>{t("shortcuts.title")}</span>
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-darnaBg-300 rounded-md text-primary-800 text-[11px] font-semibold">J</kbd>
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-darnaBg-300 rounded-md text-primary-800 text-[11px] font-semibold">K</kbd>
          <span>{t("shortcuts.navigate")}</span>
          <span className="w-px h-4 bg-primary/10" aria-hidden="true" />
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-secondary-100 rounded-md text-secondary-800 text-[11px] font-semibold">A</kbd>
          <span>{t("shortcuts.approve")}</span>
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-accent-100 rounded-md text-accent-800 text-[11px] font-semibold">R</kbd>
          <span>{t("shortcuts.reject")}</span>
        </div>
      </div>

      {/* Tabs with Live Counts */}
      <div
        role="tablist"
        aria-label={t("tabsLabel")}
        className="flex items-center gap-5 overflow-x-auto scrollbar-none border-b border-primary/[0.08]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`approvals-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={TABS_PANEL_ID}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-0.5 pt-1 pb-2.5 min-h-[44px] sm:min-h-[38px] text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors duration-fast ease-standard ${FOCUS_RING} ${
                isActive ? "text-primary-900" : "text-primary-600 hover:text-primary-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-secondary-700" : "text-primary-500"}`} aria-hidden="true" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 leading-4 rounded-full text-[11px] font-semibold tabular-nums ${
                  isActive
                    ? "bg-primary-800 text-white"
                    : tab.count > 0
                    ? "bg-accent-100 text-accent-800"
                    : "bg-primary/[0.07] text-primary-700"
                }`}
              >
                {formatNumber(tab.count, locale)}
              </span>
              {isActive && (
                <m.span
                  layoutId="approvals-tab-indicator"
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-600"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar with Category, Wilaya, and SLA controls */}
      <div className="bg-white p-3.5 rounded-2xl shadow-e1 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="approvals-search" className="sr-only">{t("search.label")}</label>
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-primary-600" aria-hidden="true" />
            <input
              id="approvals-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "hosts"
                  ? t("search.hosts")
                  : activeTab === "listings"
                  ? t("search.listings")
                  : t("search.default")
              }
              className="w-full ps-9 pe-8 py-2 text-xs rounded-xl border border-primary/[0.12] bg-white shadow-2xs hover:border-primary/25 text-primary focus:outline-none focus:border-primary-600 focus-visible:ring-2 focus-visible:ring-accent-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={`absolute end-2.5 top-1/2 -translate-y-1/2 p-0.5 text-primary-600 hover:text-primary rounded-full hover:bg-primary/[0.05] transition cursor-pointer ${FOCUS_RING}`}
                title={t("search.clear")}
                aria-label={t("search.clear")}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
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
                  className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-primary/[0.12] bg-white shadow-2xs hover:border-primary/25 text-primary font-medium focus:outline-none focus:border-primary-600 focus-visible:ring-2 focus-visible:ring-accent-600 transition cursor-pointer"
                  aria-label={t("filterCategory")}
                >
                  <option value="all">{t("allCategories")}</option>
                  <option value="individual">{tHostTypes("individual")}</option>
                  <option value="agency">{tHostTypes("agency")}</option>
                  <option value="hotel">{tHostTypes("hotel")}</option>
                  <option value="hostel">{tHostTypes("hostel")}</option>
                </select>
                <ChevronRight className="w-3.5 h-3.5 text-primary-600 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            )}

            {/* Vertical Filter for Listings */}
            {activeTab === "listings" && (
              <div className="relative">
                <select
                  value={listingVerticalFilter}
                  onChange={(e) => setListingVerticalFilter(e.target.value)}
                  className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-primary/[0.12] bg-white shadow-2xs hover:border-primary/25 text-primary font-medium focus:outline-none focus:border-primary-600 focus-visible:ring-2 focus-visible:ring-accent-600 transition cursor-pointer"
                  aria-label={t("filterVertical")}
                >
                  <option value="all">{t("allVerticals")}</option>
                  <option value="home">{tVerticals("home")}</option>
                  <option value="hotel">{tVerticals("hotel")}</option>
                  <option value="trip">{tVerticals("trip")}</option>
                  <option value="vehicle">{tVerticals("vehicle")}</option>
                  <option value="experience">{tVerticals("experience")}</option>
                </select>
                <ChevronRight className="w-3.5 h-3.5 text-primary-600 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            )}

            {/* Wilaya Filter (Hosts & Listings) */}
            <div className="relative">
              <select
                value={wilayaFilter}
                onChange={(e) => setWilayaFilter(e.target.value)}
                className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-primary/[0.12] bg-white shadow-2xs hover:border-primary/25 text-primary font-medium focus:outline-none focus:border-primary-600 focus-visible:ring-2 focus-visible:ring-accent-600 transition cursor-pointer max-w-[190px]"
                aria-label={t("filterWilaya")}
              >
                <option value="all">{t("allWilayas")}</option>
                {WILAYAS.map((w) => (
                  <option key={w.code} value={w.code}>
                    {getWilayaLabel(w, locale)}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-3.5 h-3.5 text-primary-600 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* SLA / Waiting Time Filter */}
            <div className="relative">
              <select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                className="appearance-none ps-3 pe-8 py-2 text-xs rounded-xl border border-primary/[0.12] bg-white shadow-2xs hover:border-primary/25 text-primary font-medium focus:outline-none focus:border-primary-600 focus-visible:ring-2 focus-visible:ring-accent-600 transition cursor-pointer"
                aria-label={t("filterSla")}
              >
                <option value="all">{t("allWaitingTimes")}</option>
                <option value="urgent">{t("urgentWaiting")}</option>
                <option value="normal">{t("normalWaiting")}</option>
              </select>
              <ChevronRight className="w-3.5 h-3.5 text-primary-600 rotate-90 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Reset Filters Button */}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-primary-600 hover:text-accent-700 hover:border-accent/40"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                {t("resetFilters")}
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadInbox(activeTab)}
              className="text-xs"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />}
            >
              {tCommon("refresh")}
            </Button>
          </div>
        </div>

        {/* Active Filter Chips & Feedback */}
        {activeFiltersCount > 0 && (
          <div className="pt-2.5 border-t border-primary/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-primary-600 text-[11px] font-semibold">{tCommon("filters")}:</span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-darnaBg-300 text-primary-700 text-[11px] font-medium">
                  <span>{t("quoted", { text: searchQuery })}</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t("removeFilter", { label: t("quoted", { text: searchQuery }) })}
                    className={`hover:text-accent-700 cursor-pointer rounded ${FOCUS_RING}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              )}

              {activeTab === "hosts" && hostCategoryFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary-100 text-secondary-800 text-[11px] font-medium">
                  <span>{t("filterChip", { label: t("filterCategory"), value: tHostTypes(hostCategoryFilter as HostType) })}</span>
                  <button
                    type="button"
                    onClick={() => setHostCategoryFilter("all")}
                    aria-label={t("removeFilter", { label: t("filterCategory") })}
                    className={`hover:text-accent-700 cursor-pointer rounded ${FOCUS_RING}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              )}

              {activeTab === "listings" && listingVerticalFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary-100 text-secondary-800 text-[11px] font-medium">
                  <span>{t("filterChip", { label: t("filterVertical"), value: tVerticals(listingVerticalFilter as ListingVertical) })}</span>
                  <button
                    type="button"
                    onClick={() => setListingVerticalFilter("all")}
                    aria-label={t("removeFilter", { label: t("filterVertical") })}
                    className={`hover:text-accent-700 cursor-pointer rounded ${FOCUS_RING}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              )}

              {wilayaFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-darnaBg-300 text-primary-800 text-[11px] font-medium">
                  <MapPin className="w-3 h-3 text-primary-600" aria-hidden="true" />
                  <span>{t("filterChip", { label: t("filterWilaya"), value: getWilayaName(wilayaFilter, locale) })}</span>
                  <button
                    type="button"
                    onClick={() => setWilayaFilter("all")}
                    aria-label={t("removeFilter", { label: t("filterWilaya") })}
                    className={`hover:text-accent-700 cursor-pointer rounded ${FOCUS_RING}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              )}

              {slaFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent-100 text-accent-800 text-[11px] font-medium">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{slaFilter === "urgent" ? t("urgentWaiting") : t("normalWaiting")}</span>
                  <button
                    type="button"
                    onClick={() => setSlaFilter("all")}
                    aria-label={t("removeFilter", { label: t("filterSla") })}
                    className={`hover:text-accent-900 cursor-pointer rounded ${FOCUS_RING}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className={`text-[11px] text-primary-600 hover:text-accent-700 underline ps-1 cursor-pointer rounded ${FOCUS_RING}`}
              >
                {tCommon("clearAll")}
              </button>
            </div>

            <span className="text-[11px] text-primary-600 font-medium" aria-live="polite">
              {t("showingResults", { shown: filteredCases.length, total: cases.length })}
            </span>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div
          role="region"
          aria-label={t("bulk.selected", { count: selectedIds.length })}
          className="sticky top-[76px] z-20 flex items-center justify-between p-3 ps-4 bg-primary-900 text-white rounded-2xl shadow-e4 ring-1 ring-white/10 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold" aria-live="polite">
              {t("bulk.selected", { count: selectedIds.length })}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-tertiary hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("bulk.clear")}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkApprove}
              disabled={!cases.some((c) => selectedIds.includes(c.id) && canApprove(c))}
              className="text-xs font-semibold"
              leftIcon={<CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              {t("bulk.approve", { count: selectedIds.length })}
            </Button>
          </div>
        </div>
      )}

      {/* Main Split View: Queue List on Left, Detail Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cases List */}
        <div
          id={TABS_PANEL_ID}
          role="tabpanel"
          aria-labelledby={`approvals-tab-${activeTab}`}
          className="lg:col-span-7 space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-primary-600 px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={
                  filteredCases.length > 0 && selectedIds.length === filteredCases.length
                }
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-secondary border-primary/[0.12] focus:ring-secondary cursor-pointer"
              />
              <span>{t("selectAll", { count: filteredCases.length })}</span>
            </label>
            <span className="text-[11px]">
              {activeFiltersCount > 0
                ? t("showingResults", { shown: filteredCases.length, total: cases.length })
                : t("sortedBy")}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl skeleton"
                />
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            cases.length > 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center space-y-3 shadow-e1">
                <div className="w-12 h-12 rounded-2xl bg-darnaBg-300 text-primary-600 flex items-center justify-center mx-auto">
                  <Filter className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary-900">{t("noMatchesTitle")}</h3>
                  <p className="text-xs text-primary-600 mt-1 max-w-sm mx-auto">
                    {t("noMatchesSubtitle")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  {t("resetFilters")}
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-e1">
                <EmptyState title={t("caughtUpTitle")} description={t("caughtUpDesc")} />
              </div>
            )
          ) : (
            filteredCases.map((item, idx) => {
              const isSelected = selectedCase?.id === item.id;
              const isChecked = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`group relative p-4 rounded-2xl bg-white text-start transition-[box-shadow,background-color] duration-fast ease-standard ${
                    isSelected
                      ? "shadow-e2 ring-2 ring-primary-800"
                      : isChecked
                      ? "shadow-e1 ring-1 ring-secondary-600/50 bg-secondary-50"
                      : "shadow-e1 hover:shadow-e2"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      aria-label={t("selectItem", { title: item.title })}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) =>
                          isChecked ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      className="mt-1 w-4 h-4 rounded text-secondary border-primary/[0.12] focus:ring-secondary cursor-pointer"
                    />

                    {/* Content (selects the case) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCase(item);
                        setSelectedIndex(idx);
                      }}
                      aria-pressed={isSelected}
                      aria-label={t("inspectItem", { title: item.title })}
                      className={`flex-1 min-w-0 text-start cursor-pointer rounded-lg ${FOCUS_RING}`}
                    >
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary-900 truncate">
                          {item.title}
                        </span>
                        <StatusPill status={item.status} size="sm" />
                        {item.waitingDays > 2 && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-accent-100 text-accent-800 ring-1 ring-inset ring-accent-200">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            {t("waitingDays", { count: item.waitingDays })}
                          </span>
                        )}
                      </span>

                      <span className="block text-xs text-primary-600 mt-1 line-clamp-1">{item.subtitle}</span>

                      {/* Badges for Category, Wilaya, and Submission Date */}
                      <span className="flex items-center gap-2 mt-2.5 flex-wrap text-[11px]">
                        {/* Host Category badge */}
                        {item.type === "host" && (item.hostType || item.details?.hostType) && (
                          <span className="px-2 py-0.5 rounded-md bg-secondary-50 text-secondary-800 font-medium">
                            {tHostTypes((item.hostType || item.details?.hostType) as HostType)}
                          </span>
                        )}

                        {/* Listing Vertical badge */}
                        {item.type === "listing" && (item.vertical || item.details?.category) && (
                          <span className="px-2 py-0.5 rounded-md bg-secondary-50 text-secondary-800 font-medium">
                            {tVerticals((item.vertical || item.details?.category) as ListingVertical)}
                          </span>
                        )}

                        {/* Wilaya badge */}
                        {(item.wilayaCode || item.details?.wilayaCode) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-darnaBg-100 text-primary-700 font-medium">
                            <MapPin className="w-3 h-3 text-primary-500" aria-hidden="true" />
                            {getWilayaName(item.wilayaCode || item.details?.wilayaCode, locale)}
                          </span>
                        )}

                        <span className="text-primary-300" aria-hidden="true">·</span>
                        <span className="text-primary-600">
                          {t("submitted", { date: formatDate(item.submittedAt, locale) })}
                        </span>
                      </span>
                    </button>

                    {/* Quick Row Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-90 group-hover:opacity-100">
                      {canApprove(item) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(item);
                        }}
                        title={t("approveItem", { title: item.title })}
                        aria-label={t("approveItem", { title: item.title })}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl bg-secondary-100 text-secondary-800 hover:bg-secondary-700 hover:text-white transition-colors duration-fast cursor-pointer ${FOCUS_RING}`}
                      >
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                      </button>
                      )}
                      {canReject(item) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRejectDialog(item);
                        }}
                        title={t("rejectItem", { title: item.title })}
                        aria-label={t("rejectItem", { title: item.title })}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl bg-accent-100 text-accent-800 hover:bg-accent-600 hover:text-white transition-colors duration-fast cursor-pointer ${FOCUS_RING}`}
                      >
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                      </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Inspection Drawer / Sidebar */}
        <div className="lg:col-span-5 lg:sticky lg:top-[88px]">
          {selectedCase ? (
            <m.section
              key={selectedCase.id}
              variants={slideIn("end", locale === "ar", 16)}
              initial="hidden"
              animate="show"
              aria-labelledby="approvals-detail-title"
              className="bg-white rounded-2xl shadow-e2 p-5 space-y-5 text-start lg:max-h-[calc(100dvh-112px)] lg:overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-primary/[0.06] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-secondary-800">
                      {t(`typeLabel.${selectedCase.type}`)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-darnaBg-300 text-primary-700 tabular-nums">
                      {selectedCase.entityId}
                    </span>
                  </div>
                  <h3 id="approvals-detail-title" className="text-title font-semibold text-primary-900 mt-1">{selectedCase.title}</h3>
                  <p className="text-xs text-primary-600 mt-0.5">{selectedCase.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  aria-label={t("closeDetail")}
                  title={t("closeDetail")}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl hover:bg-primary/[0.06] text-primary-500 hover:text-primary-900 transition-colors duration-fast ${FOCUS_RING}`}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Entity Specific Information Cards */}
              <div className="space-y-3 text-xs">
                {selectedCase.type === "host" && (
                  <div className="space-y-2 p-3 rounded-xl bg-darnaBg-100">
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.businessOwner")}</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.businessName || selectedCase.details?.ownerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.category")}</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.hostType
                          ? tHostTypes(selectedCase.details.hostType as HostType)
                          : t("detail.na")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.wilaya")}</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.city
                          ? t("detail.wilayaCity", {
                              wilaya: getWilayaName(selectedCase.wilayaCode || selectedCase.details?.wilayaCode, locale),
                              city: selectedCase.details.city,
                            })
                          : getWilayaName(selectedCase.wilayaCode || selectedCase.details?.wilayaCode, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.phone")}</span>
                      <span className="font-semibold text-primary" dir="ltr">
                        {selectedCase.details?.phone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.nif")}</span>
                      <span className="font-mono font-semibold text-primary">
                        {selectedCase.details?.nifNumber || t("detail.na")}
                      </span>
                    </div>
                  </div>
                )}

                {selectedCase.type === "listing" && (
                  <div className="space-y-2 p-3 rounded-xl bg-darnaBg-100">
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.host")}</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.hostName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.vertical")}</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.vertical || selectedCase.details?.category
                          ? tVerticals(
                              (selectedCase.vertical || selectedCase.details?.category) as ListingVertical
                            )
                          : t("detail.na")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.nightlyPrice")}</span>
                      <span className="font-semibold text-secondary-800">
                        {formatDzd(selectedCase.details?.price || 0, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.cityWilaya")}</span>
                      <span className="font-semibold text-primary">
                        {selectedCase.details?.city
                          ? t("detail.wilayaCity", {
                              wilaya: getWilayaName(selectedCase.wilayaCode || selectedCase.details?.wilayaCode, locale),
                              city: selectedCase.details.city,
                            })
                          : getWilayaName(selectedCase.wilayaCode || selectedCase.details?.wilayaCode, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">{t("detail.approvalMode")}</span>
                      <span className="font-semibold text-primary">
                        {t(
                          selectedCase.details?.approvalMode === "request"
                            ? "detail.approvalModes.request"
                            : "detail.approvalModes.instant"
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {selectedCase.type === "review" && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-accent-50 ring-1 ring-inset ring-accent-200">
                    <div className="flex items-center gap-1.5 text-accent-700 font-semibold">
                      <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                      <span>{t("detail.reportedContent")}</span>
                    </div>
                    <p className="text-xs italic text-primary-800 leading-relaxed bg-white p-2.5 rounded-lg shadow-2xs">
                      {t("quoted", { text: selectedCase.details?.comment ?? "" })}
                    </p>
                    <div className="text-[11px] text-primary-600 flex justify-between gap-2">
                      <span>{t("detail.flaggedByCommunity")}</span>
                      <span className="font-semibold text-accent-700">
                        {t("detail.reason", {
                          reason: selectedCase.details?.flagReason || t("detail.offensiveDefault"),
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {selectedCase.type === "dispute" && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200">
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                      <DollarSign className="w-4 h-4" aria-hidden="true" />
                      <span>{t("detail.disputedBooking")}</span>
                    </div>
                    <p className="text-xs text-primary-700">
                      {t("detail.bookingRef")}{" "}<strong dir="ltr">{selectedCase.details?.reference}</strong>
                    </p>
                    <p className="text-xs text-primary-700">
                      {t("detail.disputeAmount")}{" "}
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
                  className="flex-1 text-xs font-semibold"
                  disabled={!canApprove(selectedCase)}
                  onClick={() => handleApprove(selectedCase)}
                  leftIcon={<CheckCircle className="w-4 h-4" aria-hidden="true" />}
                  rightIcon={<kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-white/15 text-[11px] font-semibold" aria-hidden="true">A</kbd>}
                >
                  {t("approveAction")}
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs font-semibold"
                  disabled={!canReject(selectedCase)}
                  onClick={() => openRejectDialog(selectedCase)}
                  leftIcon={<XCircle className="w-4 h-4" aria-hidden="true" />}
                  rightIcon={<kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-white/15 text-[11px] font-semibold" aria-hidden="true">R</kbd>}
                >
                  {t("rejectAction")}
                </Button>
              </div>
            </m.section>
          ) : (
            <div className="bg-white rounded-2xl px-8 py-10 text-center text-primary-600 shadow-e1">
              <Eye className="w-7 h-7 mx-auto mb-3 text-primary-400" aria-hidden="true" />
              <p className="text-meta">
                {t.rich("emptyDetail", {
                  kbd: (chunks) => (
                    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-darnaBg-300 rounded-md text-primary-800 text-[11px] font-semibold">{chunks}</kbd>
                  ),
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Dialog (Mandatory Reason per Section 7) */}
      <Dialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        title={
          caseToReject
            ? t("reject.title", { type: t(`typeName.${caseToReject.type}`), title: caseToReject.title })
            : undefined
        }
        description={t("reject.intro")}
        size="md"
      >
        <div className="space-y-4 text-start">
          <div>
            <label htmlFor="approvals-reject-template" className="block text-xs font-semibold text-primary-900 mb-1.5">
              {t("reject.templateLabel")}
            </label>
            <select
              id="approvals-reject-template"
              value={rejectReasonTemplate}
              onChange={(e) => setRejectReasonTemplate(e.target.value as RejectionTemplate)}
              className="w-full p-2.5 rounded-xl border border-primary/[0.12] text-xs bg-white text-primary focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              {REJECTION_TEMPLATES.map((tmpl) => (
                <option key={tmpl} value={tmpl}>
                  {t(`reject.templates.${tmpl}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="approvals-reject-note" className="block text-xs font-semibold text-primary-900 mb-1.5">
              {t("reject.noteLabel")}
            </label>
            <textarea
              id="approvals-reject-note"
              rows={3}
              value={rejectCustomNote}
              onChange={(e) => setRejectCustomNote(e.target.value)}
              placeholder={t("reject.notePlaceholder")}
              className="w-full p-2.5 rounded-xl border border-primary/[0.12] text-xs bg-white text-primary focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent-600"
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
              className="font-semibold text-xs"
            >
              {t("rejectAction")}
            </Button>
          </div>
        </div>
      </Dialog>
      <DisputeDialog
        booking={disputeCase ? (disputeCase.details as Booking) : null}
        canRefund={can("bookings.refund")}
        onCancel={() => setDisputeCase(null)}
        onConfirm={async (outcome: DisputeOutcome, note: string, amount?: number) => {
          if (!disputeCase) return;
          try {
            unwrap(await resolveDispute(disputeCase.entityId, outcome, note, amount));
            success(tOps("disputeResolved"), disputeCase.title);
            setCases((prev) => prev.filter((c) => c.id !== disputeCase.id));
            setSelectedCase(null);
            setDisputeCase(null);
          } catch (err) {
            error(t("toast.disputeFailed"), errMsg(err));
          }
        }}
      />
    </div>
  );
}
