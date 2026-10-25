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
  Download,
  AlertCircle,
  ShieldAlert,
  Clock,
  Eye,
} from "lucide-react";
import {
  listReviews,
  hideReview,
  restoreReview,
  deleteReview,
  dismissFlag,
} from "@/lib/data/reviews";
import { ReviewItem, ReviewStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

export interface ReviewsClientProps {
  locale: string;
  initialTab?: string;
}

export default function ReviewsClient({
  locale,
  initialTab = "all",
}: ReviewsClientProps) {
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common");
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

  const { success, error, info } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listReviews({
        status: (activeTab === "all" || activeTab === "reports" || activeTab === "disputes") ? undefined : activeTab,
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
      error("Erreur avis", err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, verticalFilter, ratingFilter, wilayaFilter, search, page, pageSize, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleHide = async (r: ReviewItem) => {
    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
    try {
      await hideReview(r.id, actor);
      success("Avis masqué", "L'avis a été retiré de la publication publique.", () => {
        handleRestore(r);
      });
      loadData();
      if (selectedReview?.id === r.id) setSelectedReview({ ...r, status: "hidden" });
    } catch (err: any) {
      error("Erreur lors du masquage", err.message);
    }
  };

  const handleRestore = async (r: ReviewItem) => {
    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
    try {
      await restoreReview(r.id, actor);
      success("Avis rétabli", "L'avis est de nouveau visible publiquement.");
      loadData();
      if (selectedReview?.id === r.id) setSelectedReview({ ...r, status: "published" });
    } catch (err: any) {
      error("Erreur lors du rétablissement", err.message);
    }
  };

  const handleDismissFlag = async (r: ReviewItem) => {
    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
    try {
      await dismissFlag(r.id, actor);
      success("Signalement rejeté", "L'avis est confirmé conforme.");
      loadData();
      if (selectedReview?.id === r.id) setSelectedReview({ ...r, status: "published", flagReason: undefined });
    } catch (err: any) {
      error("Erreur de signalement", err.message);
    }
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
    try {
      await deleteReview(reviewToDelete.id, actor);
      success("Avis supprimé", "Supprimé temporairement. Récupérable dans la corbeille.");
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      if (selectedReview?.id === reviewToDelete.id) setSelectedReview(null);
      loadData();
    } catch (err: any) {
      error("Échec de suppression", err.message);
    }
  };

  const totalReviews = facets.status?.all || total || 342;
  const flaggedReviews = facets.status?.flagged || 8;
  const userReports = 14;
  const activeDisputes = 3;

  const kpis = [
    {
      id: "all",
      label: "Tous les avis",
      value: totalReviews,
      icon: Star,
      colorVariant: "primary" as const,
      active: activeTab === "all",
      onClick: () => { setActiveTab("all"); setPage(1); },
    },
    {
      id: "flagged",
      label: "Avis signalés",
      value: flaggedReviews,
      icon: Flag,
      colorVariant: "accent" as const,
      active: activeTab === "flagged",
      onClick: () => { setActiveTab("flagged"); setPage(1); },
    },
    {
      id: "reports",
      label: "Signalements d'utilisateurs",
      value: userReports,
      icon: ShieldAlert,
      colorVariant: "tertiary" as const,
      active: activeTab === "reports",
      onClick: () => { setActiveTab("reports"); setPage(1); },
    },
    {
      id: "disputes",
      label: "Litiges ouverts",
      value: activeDisputes,
      icon: AlertTriangle,
      colorVariant: "tertiary" as const,
      active: activeTab === "disputes",
      onClick: () => { setActiveTab("disputes"); setPage(1); },
    },
  ];

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          {
            label: "Exporter le rapport d'avis",
            icon: <Download className="w-4 h-4" />,
            variant: "outline",
            onClick: () => success("Rapport des avis exporté"),
          },
        ]}
      />

      <KpiStrip cards={kpis} />

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
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">Tous les services</option>
              <option value="home">Hébergements</option>
              <option value="hotel">Hôtels & Hostels</option>
              <option value="trip">Voyages organisés</option>
              <option value="vehicle">Location de voitures</option>
              <option value="experience">Expériences</option>
            </select>
          </div>

          <div>
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(Number(e.target.value));
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value={0}>Toutes les notes (1 - 5 ★)</option>
              <option value={5}>5 étoiles uniquement</option>
              <option value={4}>4 étoiles</option>
              <option value={3}>3 étoiles</option>
              <option value={2}>2 étoiles</option>
              <option value={1}>1 étoile (Alerte)</option>
            </select>
          </div>

          <div>
            <select
              value={wilayaFilter}
              onChange={(e) => {
                setWilayaFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">
                {locale === "ar" ? "جميع الولايات" : locale === "en" ? "All wilayas" : "Toutes les wilayas"}
              </option>
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-tertiary/70 animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-tertiary/70 p-12 text-center">
              <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-primary">Aucun avis trouvé</h3>
              <p className="text-xs text-neutral-500 mt-1">Modifiez vos filtres ou termes de recherche.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => {
                const isSelected = selectedReview?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReview(r)}
                    className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all cursor-pointer ${
                      isSelected
                        ? "border-secondary ring-2 ring-secondary/20 bg-secondary/5"
                        : "border-tertiary/60 hover:border-secondary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                          <span className="text-xs text-neutral-400">
                            {formatDate(r.createdAt, locale)}
                          </span>
                        </div>

                        <p className="text-xs text-primary leading-relaxed line-clamp-2">
                          &quot;{r.comment}&quot;
                        </p>

                        {r.flagReason && (
                          <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[11px]">
                            <Flag className="w-3.5 h-3.5 shrink-0" />
                            <span>Motif: <strong>{r.flagReason}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-neutral-500 flex-wrap pt-1">
                          <span className="font-semibold text-primary truncate max-w-[200px]">
                            {r.listingTitle}
                          </span>
                          <span>Voyageur : <strong>{r.guestName}</strong></span>
                          <span>Hôte : <strong>{r.hostName}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 text-neutral-500 hover:text-primary"
                          onClick={() => setSelectedReview(r)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

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
              title={`Avis #${selectedReview.id}`}
              subtitle={`${selectedReview.guestName} · ${formatDate(selectedReview.createdAt, locale)}`}
              status={selectedReview.status}
              footer={
                <div className="flex items-center justify-between w-full gap-2">
                  {selectedReview.status === "flagged" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDismissFlag(selectedReview)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 me-1" />
                      Ignorer le signalement
                    </Button>
                  )}
                  {selectedReview.status !== "hidden" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHide(selectedReview)}
                    >
                      <EyeOff className="w-3.5 h-3.5 me-1" />
                      Masquer
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(selectedReview)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 me-1" />
                      Rétablir
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setReviewToDelete(selectedReview);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 me-1" />
                    Supprimer
                  </Button>
                </div>
              }
            >
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-darnaBg border border-tertiary/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary text-sm">Note attribuée</span>
                    <div className="flex items-center text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-current me-1" />
                      {selectedReview.rating}.0 / 5
                    </div>
                  </div>
                  <p className="text-primary italic bg-white p-3 rounded-lg border border-tertiary/40">
                    &quot;{selectedReview.comment}&quot;
                  </p>
                </div>

                {selectedReview.flagReason && (
                  <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-accent">
                      <Flag className="w-4 h-4" /> Motif du signalement
                    </div>
                    <p className="text-neutral-700">{selectedReview.flagReason}</p>
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      Signalé par le prestataire le 14 mars 2024
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-white border border-tertiary/40 space-y-3">
                  <h5 className="font-bold text-primary">Contexte de la prestation</h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-500">Annonce concernée :</span>
                      <span className="font-semibold text-primary">{selectedReview.listingTitle}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-500">Voyageur (Auteur) :</span>
                      <span className="font-semibold text-primary">{selectedReview.guestName}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-500">Hôte / Prestataire :</span>
                      <span className="font-semibold text-primary">{selectedReview.hostName}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-neutral-500">Localisation :</span>
                      <span className="font-semibold text-primary">Wilaya {selectedReview.wilayaCode}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-tertiary/40 space-y-2">
                  <h5 className="font-bold text-primary">Règles de modération</h5>
                  <p className="text-[11px] text-neutral-500">
                    Les avis diffamatoires, contenant des propos haineux ou des coordonnées personnelles peuvent être supprimés sans délai.
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
        title="Supprimer l'avis"
        description="Cet avis sera supprimé de la base et ne figurera plus sur la fiche de l'annonce."
        variant="danger"
        confirmLabel="Supprimer définitivement"
      />
    </div>
  );
}
