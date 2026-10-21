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
} from "lucide-react";
import {
  listPromotions,
  createPromotion,
  togglePromotionStatus,
  deletePromotion,
} from "@/lib/data/promotions";
import { PromotionCoupon, HostType, ListingVertical } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate } from "@/lib/utils/format";

interface Props {
  locale: string;
}

export default function PromotionsClient({ locale }: Props) {
  const t = useTranslations("promotions");
  const tCommon = useTranslations("common");
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
      error("Failed to load promotions", err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (p: PromotionCoupon) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      const updated = await togglePromotionStatus(p.id, actor);
      success("Promotion Status Updated", `Coupon ${p.code} is now ${updated.status}`);
      loadData();
    } catch (err: any) {
      error("Toggle failed", err.message);
    }
  };

  const handleCreate = async () => {
    if (!code.trim()) {
      error("Missing Code", "Please enter a promotional promo code.");
      return;
    }

    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
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

      success("Promotion Created", `Coupon ${code.toUpperCase()} has been published.`);
      setModalOpen(false);
      setCode("");
      loadData();
    } catch (err: any) {
      error("Creation failed", err.message);
    }
  };

  const confirmDelete = async () => {
    if (!promoToDelete) return;
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await deletePromotion(promoToDelete.id, actor);
      success("Promotion Deleted", `Coupon ${promoToDelete.code} removed.`);
      setDeleteModalOpen(false);
      setPromoToDelete(null);
      loadData();
    } catch (err: any) {
      error("Delete failed", err.message);
    }
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5 me-1.5" />
          {t("createCode")}
        </Button>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("code")}</th>
                <th className="py-3 px-4 text-start">{t("discount")}</th>
                <th className="py-3 px-4 text-start">{t("minSpend")}</th>
                <th className="py-3 px-4 text-start">{t("used")}</th>
                <th className="py-3 px-4 text-start">{t("validUntil")}</th>
                <th className="py-3 px-4 text-start">{tCommon("status")}</th>
                <th className="py-3 px-4 text-end">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    {tCommon("loading")}
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    {t("subtitle")}
                  </td>
                </tr>
              ) : (
                promotions.map((p) => (
                  <tr key={p.id} className="hover:bg-darnaBg/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary bg-darnaBg/80 px-2 py-0.5 rounded border border-tertiary">
                          {p.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(p.code);
                            info("Copied", `${p.code} copied`);
                          }}
                          className="text-neutral-400 hover:text-primary"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-secondary">
                      {p.discountType === "percentage"
                        ? `${p.discountValue}% OFF`
                        : `${formatDzd(p.discountValue, locale)} OFF`}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 font-medium">
                      {formatDzd(p.minSpendDzd, locale)}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-700">
                      {p.usedCount} / {p.maxUses}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {formatDate(p.expiresAt, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(p)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                          p.status === "active"
                            ? "bg-secondary/15 text-secondary border-secondary/30"
                            : "bg-neutral-100 text-neutral-400 border-neutral-300"
                        }`}
                      >
                        {p.status === "active" ? tCommon("active") : tCommon("disabled")}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => {
                          setPromoToDelete(p);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-accent/80 hover:text-accent hover:bg-accent/10"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("createCode")}
        size="md"
      >
        <div className="space-y-4 text-start">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("code")}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DARNAWELCOME"
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary font-mono uppercase font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {t("discountType")}
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed DZD Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {t("discount")}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {t("minSpend")}
              </label>
              <input
                type="number"
                value={minSpend}
                onChange={(e) => setMinSpend(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {t("usageLimit")}
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("validUntil")}
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              className="font-bold text-xs"
            >
              {tCommon("save")}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        confirmLabel={tCommon("delete")}
        variant="danger"
      />
    </div>
  );
}
