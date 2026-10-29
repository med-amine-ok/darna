"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { Plus, ArrowLeft, Tag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { useToast } from "@/components/ui/Toast";
import { listCategories, createCategory, toggleCategoryStatus } from "@/lib/actions/categories";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { CategoryItem } from "@/lib/types";

interface Props {
  title: string;
  subtitle: string;
  backRoute: string;
  defaultVertical?: string;
  /** Translated, lower-case noun for one item (e.g. "category"). Defaults to the generic "category". */
  itemTypeLabel?: string;
}

function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

export default function CategoriesManagerClient({
  title,
  subtitle,
  backRoute,
  defaultVertical = "home",
  itemTypeLabel,
}: Props) {
  const t = useTranslations("categoryManager");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const { addToast } = useToast();
  const can = useCan();
  const canManage = can("categories.manage");
  const item = itemTypeLabel || t("defaultItem");
  const formId = useId();
  const nameFrErrorId = `${formId}-nameFr-error`;

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

  // Form state
  const [nameFr, setNameFr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [slug, setSlug] = useState("");
  const icon = "Home";
  const [nameFrError, setNameFrError] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = unwrap(await listCategories());
      setCategories(all);
    } catch (err: unknown) {
      addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, tCommon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (cat: CategoryItem) => {
    try {
      unwrap(await toggleCategoryStatus(cat.id));
      addToast({ title: t("statusUpdated"), variant: "info" });
      loadData();
    } catch (err: unknown) {
      addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
    }
  };

  const resetForm = () => {
    setNameFr("");
    setNameEn("");
    setNameAr("");
    setSlug("");
    setNameFrError(false);
  };

  const handleCreate = async () => {
    if (!nameFr) {
      setNameFrError(true);
      addToast({ title: tCommon("error"), description: t("nameFrRequired"), variant: "danger" });
      return;
    }
    try {
      unwrap(await createCategory(
        {
          slug: slug || nameFr.toLowerCase().replace(/\s+/g, "-"),
          vertical: (defaultVertical as CategoryItem["vertical"]) || "home",
          name: { fr: nameFr, en: nameEn || nameFr, ar: nameAr || nameFr },
          icon,
          order: categories.length + 1,
          isActive: true,
        }
      ));
      addToast({ title: t("created", { item }), variant: "success" });
      setIsAddDrawerOpen(false);
      resetForm();
      loadData();
    } catch (err: unknown) {
      addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });
    }
  };

  const columns: Column<CategoryItem>[] = [
    {
      key: "icon",
      header: t("columns.icon"),
      className: "w-16 text-center",
      render: () => (
        <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D9C9B2]/50 flex items-center justify-center text-xs font-semibold text-[#2E3A2F]">
          <Tag className="w-4 h-4 text-secondary-700" aria-hidden="true" />
        </div>
      ),
    },
    {
      key: "nameFr",
      header: t("columns.nameFr"),
      render: (row) => <span lang="fr" className="font-medium text-[#2E3A2F] text-xs">{row.name.fr}</span>,
    },
    {
      key: "nameEn",
      header: t("columns.nameEn"),
      render: (row) => <span lang="en" className="text-[#2E3A2F]/80 text-xs">{row.name.en}</span>,
    },
    {
      key: "nameAr",
      header: t("columns.nameAr"),
      render: (row) => <span lang="ar" dir="rtl" className="text-[#2E3A2F]/80 text-xs font-arabic">{row.name.ar}</span>,
    },
    {
      key: "slug",
      header: t("columns.slug"),
      render: (row) => <span dir="ltr" className="font-mono text-[11px] text-[#2E3A2F]/70">/{row.slug}</span>,
    },
    {
      key: "count",
      header: t("columns.activeListings"),
      render: (row) => <span className="font-medium text-xs text-[#2E3A2F]">{row.listingCount}</span>,
    },
    {
      key: "status",
      header: t("columns.visibility"),
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggle(row)}
          disabled={!canManage}
          aria-pressed={row.isActive}
          aria-label={t("toggleVisibility", { name: row.name[locale] || row.name.fr })}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
            row.isActive
              ? "bg-secondary/15 text-secondary-800 hover:bg-secondary/25"
              : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
          }`}
        >
          {row.isActive ? t("visible") : t("hidden")}
        </button>
      ),
    },
  ];

  const inputClass =
    "w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(backRoute)}
          className="inline-flex items-center gap-1.5 text-xs text-[#2E3A2F]/70 hover:text-[#2E3A2F] font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
          <span>{t("back")}</span>
        </button>
      </div>

      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          canManage && (
          <button
            type="button"
            onClick={() => setIsAddDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25] shadow-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t("add", { item })}</span>
          </button>
          )
        }
      />

      <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={categories}
          keyExtractor={(c) => c.id}
          isLoading={isLoading}
          emptyMessage={t("empty", { item })}
        />
      </div>

      {/* Add Drawer */}
      <FilterDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title={t("add", { item })}
        onApply={handleCreate}
        onReset={resetForm}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label htmlFor={`${formId}-nameFr`} className="block font-semibold text-[#2E3A2F] mb-1">
              {t("form.nameFr")} <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-nameFr`}
              type="text"
              lang="fr"
              aria-required="true"
              aria-invalid={nameFrError || undefined}
              aria-describedby={nameFrError ? nameFrErrorId : undefined}
              value={nameFr}
              onChange={(e) => {
                setNameFr(e.target.value);
                if (e.target.value) setNameFrError(false);
              }}
              placeholder={t("form.nameFrPlaceholder")}
              className={inputClass}
            />
            {nameFrError && (
              <p id={nameFrErrorId} role="alert" className="mt-1 text-[11px] text-accent-700">
                {t("nameFrRequired")}
              </p>
            )}
          </div>
          <div>
            <label htmlFor={`${formId}-nameEn`} className="block font-semibold text-[#2E3A2F] mb-1">{t("form.nameEn")}</label>
            <input
              id={`${formId}-nameEn`}
              type="text"
              lang="en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t("form.nameEnPlaceholder")}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-nameAr`} className="block font-semibold text-[#2E3A2F] mb-1">{t("form.nameAr")}</label>
            <input
              id={`${formId}-nameAr`}
              type="text"
              lang="ar"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={t("form.nameArPlaceholder")}
              dir="rtl"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-slug`} className="block font-semibold text-[#2E3A2F] mb-1">{t("form.slug")}</label>
            <input
              id={`${formId}-slug`}
              type="text"
              dir="ltr"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("form.slugPlaceholder")}
              className={inputClass}
            />
          </div>
        </div>
      </FilterDrawer>
    </div>
  );
}
