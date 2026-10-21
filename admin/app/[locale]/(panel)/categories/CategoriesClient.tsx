"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  FolderTree,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  listCategories,
  createCategory,
  toggleCategoryStatus,
  deleteCategory,
} from "@/lib/data/categories";
import { CategoryItem, ListingVertical } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

interface Props {
  locale: string;
}

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
  const [iconName, setIconName] = useState("Sparkles");

  // Delete Confirm
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState<CategoryItem | null>(null);

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listCategories();
      setCategories(items);
    } catch (err: any) {
      error("Failed to load categories", err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (cat: CategoryItem) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      const updated = await toggleCategoryStatus(cat.id, actor);
      success("Category Status Changed", `${cat.name.en} is now ${updated.isActive ? "active" : "inactive"}`);
      loadData();
    } catch (err: any) {
      error("Toggle failed", err.message);
    }
  };

  const handleCreate = async () => {
    if (!nameEn.trim()) {
      error("English Name Required", "Please enter at least an English category name.");
      return;
    }

    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await createCategory(
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
        },
        actor
      );

      success("Category Created", `Added ${nameEn} to ${categoryVertical} categories.`);
      setCreateModalOpen(false);
      setNameEn("");
      setNameFr("");
      setNameAr("");
      loadData();
    } catch (err: any) {
      error("Creation failed", err.message);
    }
  };

  const confirmDelete = async () => {
    if (!catToDelete) return;
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      await deleteCategory(catToDelete.id, actor);
      success("Category Deleted", `${catToDelete.name.en} has been deleted.`);
      setDeleteModalOpen(false);
      setCatToDelete(null);
      loadData();
    } catch (err: any) {
      error("Delete failed", err.message);
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
          <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5 me-1.5" />
          {t("addNew")}
        </Button>
      </div>

      {/* Filter by Vertical */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-tertiary/60">
        {["all", "home", "hotel", "trip", "vehicle", "experience"].map((v) => (
          <button
            key={v}
            onClick={() => setVerticalFilter(v)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[2px] capitalize cursor-pointer ${
              verticalFilter === v
                ? "border-primary text-primary bg-white shadow-2xs font-bold"
                : "border-transparent text-neutral-500 hover:text-primary"
            }`}
          >
            {v === "all" ? t("allVerticals") : tVerticals(v)}
          </button>
        ))}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("order")}</th>
                <th className="py-3 px-4 text-start">{t("nameEn")}</th>
                <th className="py-3 px-4 text-start">{t("nameFr")}</th>
                <th className="py-3 px-4 text-start">{t("nameAr")}</th>
                <th className="py-3 px-4 text-start">{t("vertical")}</th>
                <th className="py-3 px-4 text-end">{t("listings")}</th>
                <th className="py-3 px-4 text-start">{tCommon("status")}</th>
                <th className="py-3 px-4 text-end">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    {tCommon("loading")}
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    {t("subtitle")}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-darnaBg/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-400">{c.order}</td>
                    <td className="py-3 px-4 font-bold text-primary">{c.name.en}</td>
                    <td className="py-3 px-4 text-neutral-600">{c.name.fr}</td>
                    <td className="py-3 px-4 font-arabic text-neutral-600">{c.name.ar}</td>
                    <td className="py-3 px-4 capitalize font-semibold text-secondary">
                      {tVerticals(c.vertical)}
                    </td>
                    <td className="py-3 px-4 text-end font-bold tabular-nums text-neutral-700">
                      {c.listingCount}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(c)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                          c.isActive
                            ? "bg-secondary/15 text-secondary border-secondary/30"
                            : "bg-neutral-100 text-neutral-400 border-neutral-300"
                        }`}
                      >
                        {c.isActive ? tCommon("active") : tCommon("disabled")}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggle(c)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-primary hover:bg-neutral-100"
                          title="Toggle Active"
                        >
                          {c.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCatToDelete(c);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-accent/80 hover:text-accent hover:bg-accent/10"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
        size="md"
      >
        <div className="space-y-4 text-start">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("vertical")}
            </label>
            <select
              value={categoryVertical}
              onChange={(e) => setCategoryVertical(e.target.value as ListingVertical)}
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            >
              <option value="home">{tVerticals("home")}</option>
              <option value="hotel">{tVerticals("hotel")}</option>
              <option value="trip">{tVerticals("trip")}</option>
              <option value="vehicle">{tVerticals("vehicle")}</option>
              <option value="experience">{tVerticals("experience")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("nameEn")}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Desert Glamping"
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("nameFr")}
            </label>
            <input
              type="text"
              value={nameFr}
              onChange={(e) => setNameFr(e.target.value)}
              placeholder="e.g. Bivouac de luxe dans le désert"
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("nameAr")}
            </label>
            <input
              type="text"
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: تخييم صحراوي فاخر"
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary font-arabic"
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
              className="font-bold text-xs"
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
