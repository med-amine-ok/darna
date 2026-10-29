"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Trash2,
  CheckCircle,
  Tag,
  Copy,
  Users,
  Flame,
  PlusCircle,
} from "lucide-react";
import {
  listPromotions,
  createPromotion,
  togglePromotionStatus,
  deletePromotion,
} from "@/lib/actions/promotions";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { PromotionCoupon } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate, formatNumber } from "@/lib/utils/format";

export interface PromotionsClientProps {
  locale: string;
  initialTab?: "coupons" | "featured";
}

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const FIELD =
  "w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600";

// Mock featured placements (titles are listing data; labels are translated at render time).
const FEATURED_PLACEMENTS = [
  { id: "f1", title: "Villa Hydra avec piscine", badgeKey: "featured", placeKey: "homeHeader", until: "2024-04-30", clicks: 1240 },
  { id: "f2", title: "Circuit Tassili & Djanet 7J", badgeKey: "favorite", placeKey: "tours", until: "2024-05-15", clicks: 890 },
  { id: "f3", title: "Hyundai Tucson 2023", badgeKey: "topRenter", placeKey: "carsCarousel", until: "2024-04-20", clicks: 640 },
] as const;

export default function PromotionsClient({
  locale,
  initialTab = "coupons",
}: PromotionsClientProps) {
  const t = useTranslations("promotions");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [promotions, setPromotions] = useState<PromotionCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(15);
  const [minSpend, setMinSpend] = useState(10000);
  const [maxUses, setMaxUses] = useState(250);
  const [expiresAt, setExpiresAt] = useState("2026-12-31");

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<PromotionCoupon | null>(null);

  const { success, error, info } = useToast();
  const can = useCan();
  const canManage = can("promotions.manage");

  const statusLabel = (status: PromotionCoupon["status"]) =>
    status === "expired" ? t("expired") : tStatus(status);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = unwrap(await listPromotions());
      setPromotions(list);
    } catch (err) {
      error(t("toast.loadFailed"), errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [error, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (p: PromotionCoupon) => {
    try {
      const updated = unwrap(await togglePromotionStatus(p.id));
      success(
        t("toast.statusUpdated"),
        t("toast.statusUpdatedDesc", { code: p.code, status: statusLabel(updated.status) })
      );
      loadData();
    } catch (err) {
      error(t("toast.updateFailed"), errMsg(err));
    }
  };

  const handleCreate = async () => {
    if (!code.trim()) {
      setCodeError(true);
      error(t("toast.codeMissing"), t("form.codeMissing"));
      return;
    }

    try {
      unwrap(await createPromotion(
        {
          code: code.trim().toUpperCase(),
          discountType,
          discountValue,
          minSpendDzd: minSpend,
          maxUses,
          status: "active",
          expiresAt: new Date(expiresAt).toISOString(),
        }
      ));
      success(t("toast.created"));
      setModalOpen(false);
      setCode("");
      setCodeError(false);
      loadData();
    } catch (err) {
      error(t("toast.createFailed"), errMsg(err));
    }
  };

  const handleDelete = async () => {
    if (!promoToDelete) return;
    try {
      unwrap(await deletePromotion(promoToDelete.id));
      success(t("toast.deleted"));
      setDeleteModalOpen(false);
      setPromoToDelete(null);
      loadData();
    } catch (err) {
      error(t("toast.deleteFailed"), errMsg(err));
    }
  };

  const activeCodesCount = promotions.filter((p) => p.status === "active").length;
  const totalUses = promotions.reduce((acc, p) => acc + (p.currentUses || 0), 0);

  const kpis = [
    {
      id: "all",
      label: t("kpi.created"),
      value: promotions.length,
      icon: Tag,
      colorVariant: "primary" as const,
      active: activeTab === "coupons",
      onClick: () => setActiveTab("coupons"),
    },
    {
      id: "active",
      label: t("kpi.active"),
      value: activeCodesCount,
      icon: CheckCircle,
      colorVariant: "secondary" as const,
      active: activeTab === "coupons",
      onClick: () => setActiveTab("coupons"),
    },
    {
      id: "uses",
      label: t("kpi.uses"),
      value: totalUses,
      icon: Users,
      colorVariant: "tertiary" as const,
      active: false,
    },
    {
      id: "featured",
      label: t("kpi.featured"),
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
        actions={canManage ? [
          {
            label: t("newCode"),
            icon: <PlusCircle className="w-4 h-4" aria-hidden="true" />,
            variant: "primary",
            onClick: () => setModalOpen(true),
          },
        ] : []}
      />

      <KpiStrip cards={kpis} />

      <Tabs
        items={[
          { id: "coupons", label: t("tabCoupons"), count: promotions.length, icon: <Tag className="w-4 h-4" aria-hidden="true" /> },
          { id: "featured", label: t("tabFeatured"), count: 12, icon: <Flame className="w-4 h-4" aria-hidden="true" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Coupons Tab */}
      {activeTab === "coupons" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-tertiary/60 overflow-x-auto shadow-2xs">
            <table className="w-full text-xs text-start">
              <thead className="bg-darnaBg/60 text-neutral-600 font-semibold border-b border-tertiary/40">
                <tr>
                  <th scope="col" className="py-3 px-4 text-start">{t("colCode")}</th>
                  <th scope="col" className="py-3 px-4 text-start">{t("colDiscount")}</th>
                  <th scope="col" className="py-3 px-4 text-start">{t("colMinSpend")}</th>
                  <th scope="col" className="py-3 px-4 text-start">{t("colUses")}</th>
                  <th scope="col" className="py-3 px-4 text-start">{t("colExpires")}</th>
                  <th scope="col" className="py-3 px-4 text-start">{tCommon("status")}</th>
                  <th scope="col" className="py-3 px-4 text-end">{tCommon("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading && promotions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500" aria-live="polite">
                      {tCommon("loading")}
                    </td>
                  </tr>
                ) : promotions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500">
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  promotions.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span dir="ltr" className="font-mono font-bold text-primary px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200">
                          {p.code}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 text-neutral-500 hover:text-primary"
                          aria-label={t("copyCode", { code: p.code })}
                          title={t("copyCode", { code: p.code })}
                          onClick={() => {
                            navigator.clipboard.writeText(p.code);
                            info(t("copied"));
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-secondary">
                      {p.discountType === "percentage"
                        ? `${formatNumber(p.discountValue, locale)}%`
                        : formatDzd(p.discountValue, locale)}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      {p.minSpendDzd ? formatDzd(p.minSpendDzd, locale) : t("none")}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-700" dir="ltr">
                      {t("usesValue", {
                        used: formatNumber(p.currentUses ?? 0, locale),
                        max: p.maxUses != null ? formatNumber(p.maxUses, locale) : t("unlimited"),
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-500">
                      {formatDate(p.expiresAt, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggle(p)}
                        disabled={!canManage}
                        aria-pressed={p.status === "active"}
                        title={t("toggleStatus", { code: p.code })}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer disabled:cursor-default ${FOCUS_RING} ${
                          p.status === "active"
                            ? "bg-secondary/15 text-secondary hover:bg-secondary/25"
                            : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                        }`}
                      >
                        {statusLabel(p.status)}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent-700 hover:bg-accent/10"
                        aria-label={t("deleteCode", { code: p.code })}
                        title={t("deleteCode", { code: p.code })}
                        onClick={() => {
                          setPromoToDelete(p);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Featured Placements Tab */}
      {activeTab === "featured" && (
        <div className="bg-white rounded-2xl border border-tertiary/60 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-primary text-base">{t("featured.title")}</h3>
              <p className="text-xs text-neutral-500 mt-1">
                {t("featured.subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" aria-hidden="true" />}
              onClick={() => success(t("featured.selectListing"))}
            >
              {t("featured.add")}
            </Button>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {FEATURED_PLACEMENTS.map((f) => (
              <li key={f.id} className="p-4 rounded-xl border border-tertiary/60 bg-darnaBg/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-primary">{f.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">
                    {t(`featured.badge.${f.badgeKey}`)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {t("featured.placement", { place: t(`featured.place.${f.placeKey}`) })}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-tertiary/30 text-[11px]">
                  <span className="text-neutral-500">
                    {t("featured.until", { date: formatDate(f.until, locale) })}
                  </span>
                  <span className="font-bold text-primary">
                    {t("featured.clicks", { count: f.clicks })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("form.title")}
        description={t("form.description")}
      >
        <div className="space-y-4 text-xs text-start">
          <div>
            <label htmlFor="promo-code" className="block font-bold text-primary mb-1">
              {t("form.code")}
              <span aria-hidden="true">*</span>
            </label>
            <input
              id="promo-code"
              type="text"
              dir="ltr"
              required
              aria-required="true"
              aria-invalid={codeError || undefined}
              aria-describedby={codeError ? "promo-code-error" : undefined}
              placeholder={t("form.codePlaceholder")}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (codeError) setCodeError(false);
              }}
              className={`${FIELD} font-mono font-bold`}
            />
            {codeError && (
              <p id="promo-code-error" role="alert" className="mt-1 text-[11px] text-accent-700">
                {t("form.codeMissing")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="promo-type" className="block font-bold text-primary mb-1">{t("form.type")}</label>
              <select
                id="promo-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className={`${FIELD} cursor-pointer`}
              >
                <option value="percentage">{t("form.percentage")}</option>
                <option value="fixed">{t("form.fixed")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="promo-value" className="block font-bold text-primary mb-1">
                {t("form.value")}
                <span aria-hidden="true">*</span>
              </label>
              <input
                id="promo-value"
                type="number"
                min="1"
                required
                aria-required="true"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className={`${FIELD} font-mono font-bold`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="promo-min-spend" className="block font-bold text-primary mb-1">{t("form.minSpend")}</label>
              <input
                id="promo-min-spend"
                type="number"
                min="0"
                step="1000"
                value={minSpend}
                onChange={(e) => setMinSpend(Number(e.target.value))}
                className={`${FIELD} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="promo-max-uses" className="block font-bold text-primary mb-1">{t("form.maxUses")}</label>
              <input
                id="promo-max-uses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className={`${FIELD} font-mono`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="promo-expires" className="block font-bold text-primary mb-1">{t("form.expiresAt")}</label>
            <input
              id="promo-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`${FIELD} cursor-pointer`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              {t("form.submit")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t("deleteTitle")}
        description={t("deleteDesc", { code: promoToDelete?.code ?? "" })}
        variant="danger"
        confirmLabel={tCommon("delete")}
      />
    </div>
  );
}
