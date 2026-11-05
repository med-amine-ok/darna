"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Star,
  Search,
  EyeOff,
  Trash2,
  RotateCcw,
  Flag,
  CheckCircle,
  AlertTriangle,
  Download,
  ShieldAlert,
  Eye,
} from "lucide-react";
import {
  listReviews,
  hideReview,
  restoreReview,
  deleteReview,
  dismissFlag,
} from "@/lib/actions/reviews";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { ReviewItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate, intlLocale } from "@/lib/utils/format";
import { WILAYAS, getWilayaLabel, getWilayaName } from "@/lib/utils/wilayas";

export interface ReviewsClientProps {
  locale: string;
  initialTab?: string;
}

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const SELECT =
  "w-full px-3 py-1.5 text-xs rounded-xl border border-primary/[0.12] bg-white text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] cursor-pointer shadow-2xs hover:border-primary/25";
const VERTICAL_OPTIONS = ["home", "hotel", "trip", "vehicle", "experience"] as const;
// Mock date shown for the provider flag (no flag timestamp in the data yet).
const MOCK_FLAG_DATE = "2024-03-14";

export default function ReviewsClient({
  locale,
  initialTab = "all",
}: ReviewsClientProps) {
  const t = useTranslations("reviews");
  const tVerticals = useTranslations("verticals");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [wilayaFilter, setWilayaFilter] = useState("all");

  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});

  // Confirmation dialog state for deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);

  const { success, error } = useToast();
  const can = useCan();

  const ratingFormatter = new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const fmtRating = (n: number) => ratingFormatter.format(n);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = unwrap(await listReviews({
        status: (activeTab === "all" || activeTab === "reports" || activeTab === "disputes") ? undefined : activeTab,
        vertical: verticalFilter === "all" ? undefined : verticalFilter,
        rating: ratingFilter > 0 ? ratingFilter : undefined,
        wilayaCode: wilayaFilter === "all" ? undefined : wilayaFilter,
        search,
        page,
        pageSize,
      }));

      setReviews(res.rows);
      setTotal(res.total);
      if (res.facets) setFacets(res.facets);
    } catch (err) {
      error(t("toast.loadFailed"), errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [activeTab, verticalFilter, ratingFilter, wilayaFilter, search, page, pageSize, error, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRestore = async (r: ReviewItem) => {
    try {
      unwrap(await restoreReview(r.id));
      success(t("toast.restored"), t("toast.restoredDesc"));
      loadData();
      if (selectedReview?.id === r.id) setSelectedReview({ ...r, status: "published" });
    } catch (err) {
      error(t("toast.restoreFailed"), errMsg(err));
    }
  };

  const handleHide = async (r: ReviewItem) => {
    try {
      unwrap(await hideReview(r.id));
      success(t("toast.hidden"), t("toast.hiddenDesc"), () => {
        handleRestore(r);
      });
      loadData();
      if (selectedReview?.id === r.id) setSelectedReview({ ...r, status: "hidden" });
    } catch (err) {
      error(t("toast.hideFailed"), errMsg(err));
    }
  };

  const handleDismissFlag = async (r: ReviewItem) => {
    try {
      unwrap(await dismissFlag(r.id));
      success(t("toast.flagDismissed"), t("toast.flagDismissedDesc"));
      loadData();
      if (selectedReview?.id === r.id) setSelectedReview({ ...r, status: "published", flagReason: undefined });
    } catch (err) {
      error(t("toast.dismissFailed"), errMsg(err));
    }
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    try {
      unwrap(await deleteReview(reviewToDelete.id));
      success(t("toast.deleted"), t("toast.deletedDesc"));
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      if (selectedReview?.id === reviewToDelete.id) setSelectedReview(null);
      loadData();
    } catch (err) {
      error(t("toast.deleteFailed"), errMsg(err));
    }
  };

  const totalReviews = facets.status?.all || total || 342;
  const flaggedReviews = facets.status?.flagged || 8;
  const userReports = 14;
  const activeDisputes = 3;

  const kpis = [
    {
      id: "all",
      label: t("kpi.all"),
      value: totalReviews,
      icon: Star,
      colorVariant: "primary" as const,
      active: activeTab === "all",
      onClick: () => { setActiveTab("all"); setPage(1); },
    },
    {
      id: "flagged",
      label: t("kpi.flagged"),
      value: flaggedReviews,
      icon: Flag,
      colorVariant: "accent" as const,
      active: activeTab === "flagged",
      onClick: () => { setActiveTab("flagged"); setPage(1); },
    },
    {
      id: "reports",
      label: t("kpi.reports"),
      value: userReports,
      icon: ShieldAlert,
      colorVariant: "tertiary" as const,
      active: activeTab === "reports",
      onClick: () => { setActiveTab("reports"); setPage(1); },
    },
    {
      id: "disputes",
      label: t("kpi.disputes"),
      value: activeDisputes,
      icon: AlertTriangle,
      colorVariant: "tertiary" as const,
      active: activeTab === "disputes",
      onClick: () => { setActiveTab("disputes"); setPage(1); },
    },
  ];

  const onCardKeyDown = (e: React.KeyboardEvent, r: ReviewItem) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedReview(r);
    }
  };

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          can("reports.export")
            ? [
                {
                  label: t("exportReport"),
                  icon: <Download className="w-4 h-4" aria-hidden="true" />,
                  variant: "outline" as const,
                  onClick: () => success(t("exported")),
                },
              ]
            : []
        }
      />

      <KpiStrip cards={kpis} />

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl shadow-e1 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,2fr)_repeat(3,minmax(11rem,1fr))] gap-3">
          <div className="relative">
            <label htmlFor="reviews-search" className="sr-only">{t("filters.search")}</label>
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
            <input
              id="reviews-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-primary/[0.12] bg-white shadow-2xs text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08]"
            />
          </div>

          <div>
            <label htmlFor="reviews-vertical" className="sr-only">{t("filters.vertical")}</label>
            <select
              id="reviews-vertical"
              value={verticalFilter}
              onChange={(e) => {
                setVerticalFilter(e.target.value);
                setPage(1);
              }}
              className={SELECT}
            >
              <option value="all">{t("filters.allVerticals")}</option>
              {VERTICAL_OPTIONS.map((v) => (
                <option key={v} value={v}>{tVerticals(v)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reviews-rating" className="sr-only">{t("filters.rating")}</label>
            <select
              id="reviews-rating"
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(Number(e.target.value));
                setPage(1);
              }}
              className={SELECT}
            >
              <option value={0}>{t("filters.allRatings")}</option>
              <option value={5}>{t("filters.ratingOnly5")}</option>
              <option value={4}>{t("filters.ratingStars", { count: 4 })}</option>
              <option value={3}>{t("filters.ratingStars", { count: 3 })}</option>
              <option value={2}>{t("filters.ratingStars", { count: 2 })}</option>
              <option value={1}>{t("filters.rating1")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="reviews-wilaya" className="sr-only">{t("filters.wilaya")}</label>
            <select
              id="reviews-wilaya"
              value={wilayaFilter}
              onChange={(e) => {
                setWilayaFilter(e.target.value);
                setPage(1);
              }}
              className={SELECT}
            >
              <option value="all">{t("filters.allWilayas")}</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {getWilayaLabel(w, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SplitView with Reviews List & DetailPanel */}
      <SplitView
        isOpen={!!selectedReview}
        mainContent={
          loading ? (
            <div className="space-y-4" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl skeleton" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-e1">
              <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-3" aria-label={t("listLabel")}>
              {reviews.map((r) => {
                const isSelected = selectedReview?.id === r.id;
                return (
                  <li key={r.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={t("openReview", { name: r.guestName })}
                    onClick={() => setSelectedReview(r)}
                    onKeyDown={(e) => onCardKeyDown(e, r)}
                    className={`rounded-2xl p-4 transition-[box-shadow,background-color] duration-fast ease-standard cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                      isSelected
                        ? "bg-secondary-50 shadow-e2 ring-2 ring-secondary-600/50"
                        : "bg-white shadow-e1 hover:shadow-e2"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-50 ring-1 ring-inset ring-amber-200"
                            role="img"
                            aria-label={t("ratingAria", { rating: fmtRating(r.rating) })}
                          >
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                aria-hidden="true"
                                className={`w-3.5 h-3.5 ${
                                  i < r.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-neutral-300"
                                }`}
                              />
                            ))}
                            <span className="text-xs font-semibold text-amber-900 ms-1" aria-hidden="true">
                              {fmtRating(r.rating)}
                            </span>
                          </div>

                          <StatusPill status={r.status} size="sm" />
                          <span className="text-xs text-neutral-500 tabular-nums">
                            {formatDate(r.createdAt, locale)}
                          </span>
                        </div>

                        <p className="text-sm text-primary-800 leading-relaxed line-clamp-2">
                          {t("quoted", { text: r.comment })}
                        </p>

                        {r.flagReason && (
                          <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-accent/10 ring-1 ring-inset ring-accent/20 text-accent-700 text-[11px]">
                            <Flag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{t("flagReasonInline", { reason: r.flagReason })}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-neutral-500 flex-wrap pt-1">
                          <span className="font-semibold text-primary truncate max-w-[200px]">
                            {r.listingTitle}
                          </span>
                          <span>{t("guestLabel", { name: r.guestName })}</span>
                          <span>{t("hostLabel", { name: r.hostName })}</span>
                        </div>
                      </div>

                      <span className="p-1 shrink-0 text-neutral-500" aria-hidden="true">
                        <Eye className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                  </li>
                );
              })}
              </ul>

              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(total / pageSize))}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )
        }
        detailPanel={
          selectedReview ? (
            <DetailPanel
              onClose={() => setSelectedReview(null)}
              title={t("detailTitle", { id: selectedReview.id })}
              subtitle={t("detailSubtitle", {
                name: selectedReview.guestName,
                date: formatDate(selectedReview.createdAt, locale),
              })}
              status={selectedReview.status}
              footer={
                <div className="flex items-center justify-between w-full gap-2">
                  {selectedReview.status === "flagged" && can("reviews.moderate") && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDismissFlag(selectedReview)} leftIcon={<CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}>
                      {t("dismiss")}
                    </Button>
                  )}
                  {!can("reviews.moderate") ? null : selectedReview.status !== "hidden" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHide(selectedReview)} leftIcon={<EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}>
                      {t("hide")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(selectedReview)} leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}>
                      {t("restore")}
                    </Button>
                  )}
                  {can("reviews.delete") && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setReviewToDelete(selectedReview);
                        setDeleteDialogOpen(true);
                      }} leftIcon={<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}>
                      {t("delete")}
                    </Button>
                  )}
                </div>
              }
            >
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-darnaBg-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-sm">{t("ratingGiven")}</span>
                    <div className="flex items-center text-amber-800 font-semibold">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500 me-1" aria-hidden="true" />
                      <span dir="ltr">{t("ratingValue", { rating: fmtRating(selectedReview.rating) })}</span>
                    </div>
                  </div>
                  <p className="text-primary-800 italic bg-white p-3 rounded-lg shadow-2xs">
                    {t("quoted", { text: selectedReview.comment })}
                  </p>
                </div>

                {selectedReview.flagReason && (
                  <div className="p-3 rounded-xl bg-accent/10 ring-1 ring-inset ring-accent/20 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-accent-700">
                      <Flag className="w-4 h-4" aria-hidden="true" /> {t("flagReasonTitle")}
                    </div>
                    <p className="text-neutral-700">{selectedReview.flagReason}</p>
                    <span className="text-[11px] text-neutral-500 block mt-1">
                      {t("flaggedByProvider", { date: formatDate(MOCK_FLAG_DATE, locale) })}
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-darnaBg-100 space-y-3">
                  <h5 className="font-semibold text-primary">{t("contextTitle")}</h5>
                  <dl className="space-y-2">
                    <div className="flex items-center justify-between gap-3 py-1 border-b border-primary/[0.08]">
                      <dt className="text-neutral-500">{t("ctxListing")}</dt>
                      <dd className="font-semibold text-primary text-end">{selectedReview.listingTitle}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1 border-b border-primary/[0.08]">
                      <dt className="text-neutral-500">{t("ctxGuest")}</dt>
                      <dd className="font-semibold text-primary text-end">{selectedReview.guestName}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1 border-b border-primary/[0.08]">
                      <dt className="text-neutral-500">{t("ctxHost")}</dt>
                      <dd className="font-semibold text-primary text-end">{selectedReview.hostName}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1">
                      <dt className="text-neutral-500">{t("ctxLocation")}</dt>
                      <dd className="font-semibold text-primary text-end">
                        {getWilayaName(selectedReview.wilayaCode, locale)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 rounded-xl bg-darnaBg-100 space-y-2">
                  <h5 className="font-semibold text-primary">{t("rulesTitle")}</h5>
                  <p className="text-[11px] text-neutral-500">
                    {t("rulesText")}
                  </p>
                </div>
              </div>
            </DetailPanel>
          ) : undefined
        }
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={t("deleteTitle")}
        description={t("deleteDesc")}
        variant="danger"
        confirmLabel={t("delete")}
      />
    </div>
  );
}
