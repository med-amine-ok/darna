"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  Percent,
  CheckCircle,
  XCircle,
  Tag,
  Copy,
  Users,
  Download,
  Flame,
  Award,
  Eye,
  PlusCircle,
} from "lucide-react";
import {
  listPromotions,
  createPromotion,
  togglePromotionStatus,
  deletePromotion,
} from "@/lib/data/promotions";
import { PromotionCoupon, HostType, ListingVertical } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate } from "@/lib/utils/format";

export interface PromotionsClientProps {
  locale: string;
  initialTab?: "coupons" | "featured";
}

export default function PromotionsClient({
  locale,
  initialTab = "coupons",
}: PromotionsClientProps) {
  const t = useTranslations("promotions");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [promotions, setPromotions] = useState<PromotionCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(15);
  const [minSpend, setMinSpend] = useState(10000);
  const [maxUses, setMaxUses] = useState(250);
  const [expiresAt, setExpiresAt] = useState("2026-12-31");

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<PromotionCoupon | null>(null);

  const { success, error, info } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPromotions();
      setPromotions(list);
    } catch (err: any) {
      error("Erreur de chargement", err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (p: PromotionCoupon) => {
    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
    try {
      const updated = await togglePromotionStatus(p.id, actor);
      success("Statut mis à jour", `Le code ${p.code} est désormais ${updated.status}`);
      loadData();
    } catch (err: any) {
      error("Échec de la mise à jour", err.message);
    }
  };

  const handleCreate = async () => {
    if (!code.trim()) {
      error("Code manquant", "Veuillez saisir un code promotionnel.");
      return;
    }

    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
    try {
      await createPromotion(
        {
          code: code.trim().toUpperCase(),
          discountType,
          discountValue,
          minSpendDzd: minSpend,
          maxUses,
          status: "active",
          expiresAt: new Date(expiresAt).toISOString(),
        },
        actor
      );
      success("Code promo créé avec succès");
      setModalOpen(false);
      setCode("");
      loadData();
    } catch (err: any) {
      error("Création échouée", err.message);
    }
  };

  const handleDelete = async () => {
    if (!promoToDelete) return;
    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
    try {
      await deletePromotion(promoToDelete.id, actor);
      success("Code promo supprimé");
      setDeleteModalOpen(false);
      setPromoToDelete(null);
      loadData();
    } catch (err: any) {
      error("Échec de suppression", err.message);
    }
  };

  const activeCodesCount = promotions.filter((p) => p.status === "active").length;
  const totalUses = promotions.reduce((acc, p) => acc + (p.currentUses || 0), 0);
  const totalSavings = 1450000;

  const kpis = [
    {
      id: "all",
      label: "Codes promo créés",
      value: promotions.length,
      icon: Tag,
      colorVariant: "primary" as const,
      active: activeTab === "coupons",
      onClick: () => setActiveTab("coupons"),
    },
    {
      id: "active",
      label: "Codes actifs",
      value: activeCodesCount,
      icon: CheckCircle,
      colorVariant: "secondary" as const,
      active: activeTab === "coupons",
      onClick: () => setActiveTab("coupons"),
    },
    {
      id: "uses",
      label: "Utilisations totales",
      value: totalUses,
      icon: Users,
      colorVariant: "tertiary" as const,
      active: false,
    },
    {
      id: "featured",
      label: "Mises en avant actives",
      value: 12,
      icon: Flame,
      colorVariant: "accent" as const,
      active: activeTab === "featured",
      onClick: () => setActiveTab("featured"),
    },
  ];

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          {
            label: "Nouveau code promo",
            icon: <PlusCircle className="w-4 h-4" />,
            variant: "primary",
            onClick: () => setModalOpen(true),
          },
        ]}
      />

      <KpiStrip cards={kpis} />

      <Tabs
        items={[
          { id: "coupons", label: "Codes promo", count: promotions.length, icon: <Tag className="w-4 h-4" /> },
          { id: "featured", label: "Mises en avant (Placements)", count: 12, icon: <Flame className="w-4 h-4" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Coupons Tab */}
      {activeTab === "coupons" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-tertiary/60 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Réduction</th>
                  <th className="py-3 px-4">Dépense min.</th>
                  <th className="py-3 px-4">Utilisations</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {promotions.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200">
                          {p.code}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 text-neutral-400 hover:text-primary"
                          onClick={() => {
                            navigator.clipboard.writeText(p.code);
                            info("Code copié dans le presse-papier");
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-secondary">
                      {p.discountType === "percentage" ? `${p.discountValue}%` : formatDzd(p.discountValue, locale)}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      {p.minSpendDzd ? formatDzd(p.minSpendDzd, locale) : "Aucun"}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-700">
                      {p.currentUses} / {p.maxUses}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-500">
                      {formatDate(p.expiresAt, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(p)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          p.status === "active"
                            ? "bg-secondary/15 text-secondary hover:bg-secondary/25"
                            : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
                        }`}
                      >
                        {p.status === "active" ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent hover:bg-accent/10"
                        onClick={() => {
                          setPromoToDelete(p);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Featured Placements Tab */}
      {activeTab === "featured" && (
        <div className="bg-white rounded-2xl border border-tertiary/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-primary text-base">Mises en avant sur la page d'accueil</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Gérez les annonces sponsorisées ou mises en vedette par la modération.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => success("Sélectionnez une annonce à promouvoir")}>
              + Ajouter une mise en avant
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-tertiary/60 bg-darnaBg/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-primary">Villa Hydra avec piscine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">
                  En vedette
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Placement : En-tête Page d'accueil · Alger</p>
              <div className="flex items-center justify-between pt-2 border-t border-tertiary/30 text-[11px]">
                <span className="text-neutral-400">Jusqu'au 30 avril 2024</span>
                <span className="font-bold text-primary">1 240 clics</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-tertiary/60 bg-darnaBg/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-primary">Circuit Tassili & Djanet 7J</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">
                  Coup de cœur
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Placement : Rubrique Voyages Organisés</p>
              <div className="flex items-center justify-between pt-2 border-t border-tertiary/30 text-[11px]">
                <span className="text-neutral-400">Jusqu'au 15 mai 2024</span>
                <span className="font-bold text-primary">890 clics</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-tertiary/60 bg-darnaBg/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-primary">Hyundai Tucson 2023</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">
                  Top Loueur
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Placement : Carrousel Voitures Populaires</p>
              <div className="flex items-center justify-between pt-2 border-t border-tertiary/30 text-[11px]">
                <span className="text-neutral-400">Jusqu'au 20 avril 2024</span>
                <span className="font-bold text-primary">640 clics</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Créer un nouveau code promo"
        description="Configurez le code, le taux de réduction et les limites d'utilisation."
      >
        <div className="space-y-4 text-xs text-start">
          <div>
            <label className="block font-bold text-primary mb-1">Code promo (en majuscules)*</label>
            <input
              type="text"
              placeholder="ex: DARNA2024"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 font-mono font-bold text-primary focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-primary mb-1">Type de réduction</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="percentage">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (DZD)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-primary mb-1">Valeur de la réduction*</label>
              <input
                type="number"
                min="1"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 font-mono font-bold text-primary focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-primary mb-1">Dépense min. (DZD)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={minSpend}
                onChange={(e) => setMinSpend(Number(e.target.value))}
                className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 font-mono text-primary focus:outline-none focus:border-secondary"
              />
            </div>
            <div>
              <label className="block font-bold text-primary mb-1">Nombre max. d'utilisations</label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 font-mono text-primary focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-primary mb-1">Date d'expiration</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Créer le code
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le code promotionnel"
        description={`Êtes-vous sûr de vouloir supprimer le code ${promoToDelete?.code} ? Cette action est irréversible.`}
        variant="danger"
        confirmLabel="Supprimer"
      />
    </div>
  );
}
