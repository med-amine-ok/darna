"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Star,
  Search,
  Filter,
  EyeOff,
  Trash2,
  RotateCcw,
  Flag,
  CheckCircle,
  AlertTriangle,
  Building,
  User,
  Home,
  MessageSquare,
} from "lucide-react";
import {
  listReviews,
  hideReview,
  restoreReview,
  deleteReview,
  dismissFlag,
  ReviewFilterParams,
} from "@/lib/data/reviews";
import { ReviewItem, ReviewStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";
import { WILAYAS } from "@/lib/utils/wilayas";

interface Props {
  locale: string;
}

export default function ReviewsClient({ locale }: Props) {
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common");
  const tVerticals = useTranslations("verticals");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [wilayaFilter, setWilayaFilter] = useState("all");

  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});

  // Confirmation dialog state for deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);

  const { success, error, info } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listReviews({
        status: activeTab === "all" ? undefined : activeTab,
        vertical: verticalFilter === "all" ? undefined : verticalFilter,
        rating: ratingFilter > 0 ? ratingFilter : undefined,
        wilayaCode: wilayaFilter === "all" ? undefined : wilayaFilter,
        search,
        page,
        pageSize,
      });

      setReviews(res.rows);
      setTotal(res.total);
      if (res.facets) setFacets(res.facets);
    } catch (err: any) {
      error("Failed to load reviews", err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, verticalFilter, ratingFilter, wilayaFilter, search, page, pageSize, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleHide = async (r: ReviewItem) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await hideReview(r.id, actor);
      success("Review Hidden", "The review has been removed from public marketplace visibility.", () => {
        handleRestore(r);
      });
      loadData();
    } catch (err: any) {
      error("Failed to hide review", err.message);
    }
  };

  const handleRestore = async (r: ReviewItem) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await restoreReview(r.id, actor);
      success("Review Restored", "The review is now published on the listing page.");
      loadData();
    } catch (err: any) {
      error("Failed to restore review", err.message);
    }
  };

  const handleDismissFlag = async (r: ReviewItem) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await dismissFlag(r.id, actor);
      success("Flag Dismissed", "The review is confirmed safe and kept published.");
      loadData();
    } catch (err: any) {
      error("Failed to dismiss flag", err.message);
    }
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await deleteReview(reviewToDelete.id, actor);
      success("Review Deleted", "Soft-deleted. Can be restored from the Deleted tab.", () => {
        handleRestore(reviewToDelete);
      });
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      loadData();
    } catch (err: any) {
      error("Delete failed", err.message);
    }
  };

  const tabs = [
    { key: "all", label: t("allTab"), count: facets.status?.all || total },
    { key: "published", label: t("publishedTab"), count: facets.status?.published || 0 },
    { key: "flagged", label: t("flaggedTab"), count: facets.status?.flagged || 0 },
    { key: "hidden", label: t("hiddenTab"), count: facets.status?.hidden || 0 },
    { key: "deleted", label: tCommon("delete"), count: facets.status?.deleted || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-tertiary/60">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-primary text-primary bg-white shadow-2xs font-bold"
                  : "border-transparent text-neutral-500 hover:text-primary hover:bg-white/50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-primary text-white"
                    : tab.key === "flagged" && tab.count > 0
                    ? "bg-accent text-white"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary focus:outline-none focus:border-secondary"
            />
          </div>

          <div>
            <select
              value={verticalFilter}
              onChange={(e) => {
                setVerticalFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
            >
              <option value="all">{tCommon("all")}</option>
              <option value="home">{tVerticals("home")}</option>
              <option value="hotel">{tVerticals("hotel")}</option>
              <option value="trip">{tVerticals("trip")}</option>
              <option value="vehicle">{tVerticals("vehicle")}</option>
              <option value="experience">{tVerticals("experience")}</option>
            </select>
          </div>

          <div>
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(Number(e.target.value));
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
            >
              <option value={0}>All Ratings (1 - 5 ★)</option>
              <option value={5}>5 Stars only</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star (Critical)</option>
            </select>
          </div>

          <div>
            <select
              value={wilayaFilter}
              onChange={(e) => {
                setWilayaFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
            >
              <option value="all">All Wilayas</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-tertiary/70 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-tertiary/70 p-12 text-center">
          <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-primary">No reviews found</h3>
          <p className="text-xs text-neutral-500 mt-1">Try clearing filters or search terms.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-tertiary/70 p-5 shadow-2xs hover:border-secondary/50 transition-all text-start"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Review Core Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < r.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-neutral-300"
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-amber-900 ms-1">{r.rating}.0</span>
                    </div>

                    <StatusPill status={r.status as any} size="sm" />
                    <span className="text-xs font-semibold text-neutral-500">
                      {formatDate(r.createdAt, locale)}
                    </span>
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-primary leading-relaxed bg-darnaBg/30 p-3 rounded-xl border border-tertiary/40">
                    &quot;{r.comment}&quot;
                  </p>

                  {/* Flag Reason if present */}
                  {r.flagReason && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs">
                      <Flag className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Report Reason: <strong>{r.flagReason}</strong>
                      </span>
                    </div>
                  )}

                  {/* Listing & Host Context */}
                  <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap pt-1">
                    <span className="flex items-center gap-1.5 font-medium text-primary">
                      <Home className="w-3.5 h-3.5 text-secondary" />
                      {r.listingTitle}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      Guest: <strong>{r.guestName}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-neutral-400" />
                      Host: <strong>{r.hostName}</strong>
                    </span>
                    <span>Wilaya {r.wilayaCode}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col items-center gap-2 shrink-0">
                  {r.status === "flagged" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismissFlag(r)}
                      className="text-xs font-bold text-secondary border-secondary/40 hover:bg-secondary/10"
                    >
                      <CheckCircle className="w-3.5 h-3.5 me-1.5" />
                      {t("dismiss")}
                    </Button>
                  )}

                  {r.status !== "hidden" && r.status !== "deleted" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHide(r)}
                      className="text-xs font-bold text-neutral-600 border-neutral-300 hover:bg-neutral-100"
                    >
                      <EyeOff className="w-3.5 h-3.5 me-1.5" />
                      {t("hide")}
                    </Button>
                  ) : r.status === "hidden" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(r)}
                      className="text-xs font-bold text-secondary border-secondary/40 hover:bg-secondary/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                      {t("restore")}
                    </Button>
                  ) : null}

                  {r.status !== "deleted" ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setReviewToDelete(r);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5 me-1.5" />
                      {t("delete")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(r)}
                      className="text-xs font-bold text-secondary border-secondary/40 hover:bg-secondary/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                      {t("restore")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / pageSize)}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Confirm Soft-Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        confirmLabel={t("delete")}
        variant="danger"
      />
    </div>
  );
}
