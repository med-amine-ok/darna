"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import {
  listCategories,
  createCategory,
  toggleCategoryStatus,
  deleteCategory,
} from "@/lib/actions/categories";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { CategoryItem, ListingVertical } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/utils/format";

interface Props {
  locale: string;
}

const VERTICAL_FILTERS = ["all", "home", "hotel", "trip", "vehicle", "experience"] as const;
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function CategoriesClient({ locale }: Props) {
  const t = useTranslations("categories");
  const tCommon = useTranslations("common");
  const tVerticals = useTranslations("verticals");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verticalFilter, setVerticalFilter] = useState("all");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [categoryVertical, setCategoryVertical] = useState<ListingVertical>("home");
  const [iconName] = useState("Sparkles");

  // Delete Confirm
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState<CategoryItem | null>(null);

  const { success, error } = useToast();
  const can = useCan();
  const canManage = can("categories.manage");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const items = unwrap(await listCategories());
      setCategories(items);
    } catch (err) {
      error(t("toast.loadFailed"), errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [error, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (cat: CategoryItem) => {
    try {
      const updated = unwrap(await toggleCategoryStatus(cat.id));
      success(
        t("toast.statusChanged"),
        t(updated.isActive ? "toast.nowActive" : "toast.nowInactive", { name: cat.name.en })
      );
      loadData();
    } catch (err) {
      error(t("toast.toggleFailed"), errMsg(err));
    }
  };

  const handleCreate = async () => {
    if (!nameEn.trim()) {
      error(t("toast.nameRequired"), t("toast.nameRequiredDesc"));
      return;
    }

    try {
      unwrap(await createCategory(
        {
          name: {
            en: nameEn.trim(),
            fr: nameFr.trim() || nameEn.trim(),
            ar: nameAr.trim() || nameEn.trim(),
          },
          vertical: categoryVertical,
          icon: iconName,
          order: categories.length + 1,
          isActive: true,
        }
      ));

      success(
        t("toast.created"),
        t("toast.createdDesc", { name: nameEn.trim(), vertical: tVerticals(categoryVertical) })
      );
      setCreateModalOpen(false);
      setNameEn("");
      setNameFr("");
      setNameAr("");
      loadData();
    } catch (err) {
      error(t("toast.createFailed"), errMsg(err));
    }
  };

  const confirmDelete = async () => {
    if (!catToDelete) return;
    try {
      unwrap(await deleteCategory(catToDelete.id));
      success(t("toast.deleted"), t("toast.deletedDesc", { name: catToDelete.name.en }));
      setDeleteModalOpen(false);
      setCatToDelete(null);
      loadData();
    } catch (err) {
      error(t("toast.deleteFailed"), errMsg(err));
    }
  };

  const filteredCategories = categories.filter((c) =>
    verticalFilter === "all" ? true : c.vertical === verticalFilter
  );

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-heading text-primary-900">{t("title")}</h1>
          <p className="text-meta text-primary-600 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {canManage && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="text-xs font-semibold" leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>
          {t("addNew")}
        </Button>
        )}
      </div>

      {/* Filter by Vertical */}
      <div
        role="group"
        aria-label={t("filterLabel")}
        className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-primary/[0.08]"
      >
        {VERTICAL_FILTERS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={verticalFilter === v}
            onClick={() => setVerticalFilter(v)}
            className={`px-1 me-3 py-2 text-xs font-semibold transition-colors duration-fast border-b-2 -mb-[2px] cursor-pointer ${FOCUS_RING} ${
              verticalFilter === v
                ? "border-primary text-primary bg-white shadow-2xs font-bold"
                : "border-transparent text-primary-600 hover:text-primary-900"
            }`}
          >
            {v === "all" ? t("allVerticals") : tVerticals(v)}
          </button>
        ))}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-e1">
        <div className="relative overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg-100 border-b border-primary/[0.08] text-primary-600 [&_th]:whitespace-nowrap text-xs font-semibold">
              <tr>
                <th scope="col" className="py-3 px-4 text-start">{t("order")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("nameEn")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("nameFr")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("nameAr")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("vertical")}</th>
                <th scope="col" className="py-3 px-4 text-end">{t("listings")}</th>
                <th scope="col" className="py-3 px-4 text-start">{tCommon("status")}</th>
                <th scope="col" className="py-3 px-4 text-end">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-4 px-4" aria-live="polite">
                    <span className="sr-only">{tCommon("loading")}</span>
                    <div aria-hidden="true" className="space-y-3">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-4 rounded-md" style={{ width: `${90 - i * 12}%` }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState size="compact" title={t("empty")} />
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-darnaBg-100 transition-colors">
                    <td className="py-3 px-4 tabular-nums font-semibold text-neutral-500 whitespace-nowrap">{formatNumber(c.order, locale)}</td>
                    <td className="py-3 px-4 font-semibold text-primary" lang="en">{c.name.en}</td>
                    <td className="py-3 px-4 text-neutral-600" lang="fr">{c.name.fr}</td>
                    <td className="py-3 px-4 font-arabic text-neutral-600" lang="ar" dir="rtl">{c.name.ar}</td>
                    <td className="py-3 px-4 font-semibold text-secondary">
                      {tVerticals(c.vertical)}
                    </td>
                    <td className="py-3 px-4 text-end font-semibold tabular-nums text-neutral-700">
                      {formatNumber(c.listingCount, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggle(c)}
                        disabled={!canManage}
                        aria-pressed={c.isActive}
                        title={t("toggleActive", { name: c.name.en })}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer disabled:cursor-default ${FOCUS_RING} ${
                          c.isActive
                            ? "bg-secondary/15 text-secondary border-secondary/30"
                            : "bg-neutral-100 text-neutral-600 border-neutral-300"
                        }`}
                      >
                        {c.isActive ? tCommon("active") : tCommon("disabled")}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (<>
                        <button
                          type="button"
                          onClick={() => handleToggle(c)}
                          className={`p-1 rounded-lg text-neutral-500 hover:text-primary hover:bg-neutral-100 ${FOCUS_RING}`}
                          title={t("toggleActive", { name: c.name.en })}
                          aria-label={t("toggleActive", { name: c.name.en })}
                        >
                          {c.isActive ? (
                            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCatToDelete(c);
                            setDeleteModalOpen(true);
                          }}
                          className={`p-1 rounded-lg text-accent-700 hover:text-accent-800 hover:bg-accent/10 ${FOCUS_RING}`}
                          title={t("deleteCategory", { name: c.name.en })}
                          aria-label={t("deleteCategory", { name: c.name.en })}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CATEGORY DIALOG */}
      <Dialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t("createTitle")}
        subtitle={t("createSubtitle")}
        size="md"
      >
        <div className="space-y-4 text-start">
          <div>
            <label htmlFor="category-vertical" className="block text-xs font-semibold text-primary mb-1">
              {t("vertical")}
            </label>
            <select
              id="category-vertical"
              value={categoryVertical}
              onChange={(e) => setCategoryVertical(e.target.value as ListingVertical)}
              className="w-full p-2.5 rounded-xl text-xs bg-darnaBg-100 text-primary"
            >
              <option value="home">{tVerticals("home")}</option>
              <option value="hotel">{tVerticals("hotel")}</option>
              <option value="trip">{tVerticals("trip")}</option>
              <option value="vehicle">{tVerticals("vehicle")}</option>
              <option value="experience">{tVerticals("experience")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="category-name-en" className="block text-xs font-semibold text-primary mb-1">
              {t("nameEn")}
            </label>
            <input
              id="category-name-en"
              type="text"
              lang="en"
              required
              aria-required="true"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t("placeholderEn")}
              className="w-full p-2.5 rounded-xl text-xs bg-darnaBg-100 text-primary"
            />
          </div>

          <div>
            <label htmlFor="category-name-fr" className="block text-xs font-semibold text-primary mb-1">
              {t("nameFr")}
            </label>
            <input
              id="category-name-fr"
              type="text"
              lang="fr"
              value={nameFr}
              onChange={(e) => setNameFr(e.target.value)}
              placeholder={t("placeholderFr")}
              className="w-full p-2.5 rounded-xl text-xs bg-darnaBg-100 text-primary"
            />
          </div>

          <div>
            <label htmlFor="category-name-ar" className="block text-xs font-semibold text-primary mb-1">
              {t("nameAr")}
            </label>
            <input
              id="category-name-ar"
              type="text"
              lang="ar"
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={t("placeholderAr")}
              className="w-full p-2.5 rounded-xl text-xs bg-darnaBg-100 text-primary font-arabic"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              className="font-semibold text-xs"
            >
              {tCommon("save")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("deleteTitle")}
        description={t("deleteDesc")}
        confirmLabel={tCommon("delete")}
        variant="danger"
      />
    </div>
  );
}
