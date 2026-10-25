"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Check, X, ArrowLeft, Layers, Tag, Eye } from "lucide-react";
import { useRouter } from "@/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { useToast } from "@/components/ui/Toast";
import { listCategories, createCategory, toggleCategoryStatus } from "@/lib/data/categories";
import { CategoryItem } from "@/lib/types";

interface Props {
  title: string;
  subtitle: string;
  backRoute: string;
  defaultVertical?: string;
  itemTypeLabel?: string;
}

export default function CategoriesManagerClient({
  title,
  subtitle,
  backRoute,
  defaultVertical = "home",
  itemTypeLabel = "catégorie",
}: Props) {
  const router = useRouter();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

  // Form state
  const [nameFr, setNameFr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("Home");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const all = await listCategories();
      setCategories(all);
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (cat: CategoryItem) => {
    try {
      await toggleCategoryStatus(cat.id, { id: "usr_admin", name: "Admin", role: "super_admin" });
      addToast({ title: "Statut mis à jour", variant: "info" });
      loadData();
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const handleCreate = async () => {
    if (!nameFr) {
      addToast({ title: "Erreur", description: "Le nom en français est requis", variant: "danger" });
      return;
    }
    try {
      await createCategory(
        {
          slug: slug || nameFr.toLowerCase().replace(/\s+/g, "-"),
          vertical: (defaultVertical as any) || "home",
          name: { fr: nameFr, en: nameEn || nameFr, ar: nameAr || nameFr },
          icon,
          order: categories.length + 1,
          isActive: true,
        },
        { id: "usr_admin", name: "Admin", role: "super_admin" }
      );
      addToast({ title: `${itemTypeLabel} ajoutée avec succès`, variant: "success" });
      setIsAddDrawerOpen(false);
      setNameFr("");
      setNameEn("");
      setNameAr("");
      setSlug("");
      loadData();
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const columns: Column<CategoryItem>[] = [
    {
      key: "icon",
      header: "Icône",
      className: "w-16 text-center",
      render: (row) => (
        <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D9C9B2]/50 flex items-center justify-center text-xs font-semibold text-[#2E3A2F]">
          <Tag className="w-4 h-4 text-[#6B7F5B]" />
        </div>
      ),
    },
    {
      key: "nameFr",
      header: "Nom (Français)",
      render: (row) => <span className="font-medium text-[#2E3A2F] text-xs">{row.name.fr}</span>,
    },
    {
      key: "nameEn",
      header: "Nom (English)",
      render: (row) => <span className="text-[#2E3A2F]/80 text-xs">{row.name.en}</span>,
    },
    {
      key: "nameAr",
      header: "Nom (العربية)",
      render: (row) => <span className="text-[#2E3A2F]/80 text-xs font-arabic">{row.name.ar}</span>,
    },
    {
      key: "slug",
      header: "Slug URL",
      render: (row) => <span className="font-mono text-[11px] text-[#2E3A2F]/60">/{row.slug}</span>,
    },
    {
      key: "count",
      header: "Annonces actives",
      render: (row) => <span className="font-medium text-xs text-[#2E3A2F]">{row.listingCount}</span>,
    },
    {
      key: "status",
      header: "Visibilité",
      render: (row) => (
        <button
          onClick={() => handleToggle(row)}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
            row.isActive
              ? "bg-secondary/15 text-secondary hover:bg-secondary/25"
              : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
          }`}
        >
          {row.isActive ? "Visible" : "Masquée"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(backRoute)}
          className="inline-flex items-center gap-1.5 text-xs text-[#2E3A2F]/70 hover:text-[#2E3A2F] font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour</span>
        </button>
      </div>

      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25] shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une {itemTypeLabel}</span>
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={categories}
          keyExtractor={(c) => c.id}
          isLoading={isLoading}
          emptyMessage={`Aucune ${itemTypeLabel} trouvée.`}
        />
      </div>

      {/* Add Drawer */}
      <FilterDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title={`Ajouter une ${itemTypeLabel}`}
        onApply={handleCreate}
        onReset={() => {
          setNameFr("");
          setNameEn("");
          setNameAr("");
          setSlug("");
        }}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#2E3A2F] mb-1">Nom en français *</label>
            <input
              type="text"
              value={nameFr}
              onChange={(e) => setNameFr(e.target.value)}
              placeholder="Ex: Villa de charme"
              className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#2E3A2F] mb-1">Nom en anglais</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Ex: Charming Villa"
              className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#2E3A2F] mb-1">Nom en arabe</label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: فيلا ساحرة"
              dir="rtl"
              className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#2E3A2F] mb-1">Identifiant URL (slug)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Ex: villa-charme"
              className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
            />
          </div>
        </div>
      </FilterDrawer>
    </div>
  );
}
