"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AdminCategory, toggleCategoryStatus } from "@/lib/data/admin";
import {
  HiOutlineTag,
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineSparkles,
} from "react-icons/hi";
import { toast } from "react-toastify";

interface AdminCategoriesClientProps {
  initialCategories: AdminCategory[];
}

export default function AdminCategoriesClient({ initialCategories }: AdminCategoriesClientProps) {
  const [categories, setCategories] = useState<AdminCategory[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [vertical, setVertical] = useState<"home" | "experience" | "vehicle">("home");

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleCategoryStatus(id);
      if (updated) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: updated.isActive } : c))
        );
        toast.info(updated.isActive ? "Category activated in search." : "Category deactivated.");
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameFr || !nameAr) {
      toast.error("Please supply names in all three languages (EN, FR, AR).");
      return;
    }

    const newCat: AdminCategory = {
      id: `cat_${Date.now()}`,
      nameEn,
      nameFr,
      nameAr,
      vertical,
      iconName: "BiHome",
      listingCount: 0,
      isActive: true,
    };

    setCategories((prev) => [newCat, ...prev]);
    toast.success("New marketplace category created!");
    setIsModalOpen(false);
    setNameEn("");
    setNameFr("");
    setNameAr("");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Categories & Amenities Taxonomy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Manage trilingual labels (English, French, Arabic) across homes, Sahara excursions, and 4x4 vehicles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-2xs self-start md:self-auto"
        >
          <HiOutlinePlus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 capitalize flex items-center gap-1">
                  {cat.vertical === "home" && (
                    <Image
                      src="/assets/house.png"
                      alt="Homes"
                      width={12}
                      height={12}
                      className="object-contain"
                    />
                  )}
                  {cat.vertical === "experience" && (
                    <Image
                      src="/assets/location.png"
                      alt="Experiences"
                      width={12}
                      height={12}
                      className="object-contain"
                    />
                  )}
                  {cat.vertical === "vehicle" && (
                    <Image
                      src="/assets/car.png"
                      alt="Vehicles"
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                  )}
                  <span>{cat.vertical}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    cat.isActive ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {cat.isActive ? "Active" : "Disabled"}
                </span>
              </div>

              <h3 className="font-serif font-bold text-primary text-base mb-1">
                {cat.nameEn}
              </h3>
              <div className="text-xs text-neutral-500 mb-0.5">
                <span className="font-semibold">Français:</span> {cat.nameFr}
              </div>
              <div className="text-xs text-neutral-500 font-arabic text-end" dir="rtl">
                <span className="font-semibold font-sans">العربية:</span> {cat.nameAr}
              </div>
            </div>

            <div className="border-t border-tertiary/50 pt-3 mt-4 flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-500">
                {cat.listingCount} listings assigned
              </span>
              <button
                type="button"
                onClick={() => handleToggle(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  cat.isActive
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {cat.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-lg font-black text-primary mb-4 pb-2 border-b border-tertiary/60">
              Create Trilingual Category
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Vertical</label>
                <select
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none"
                >
                  <option value="home">Homes & Stays</option>
                  <option value="experience">Sahara Experiences</option>
                  <option value="vehicle">4x4 Vehicles</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">English Label</label>
                <input
                  type="text"
                  placeholder="e.g. Coastal Villas"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Nom Français</label>
                <input
                  type="text"
                  placeholder="e.g. Villas Côtières"
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">الاسم بالعربية</label>
                <input
                  type="text"
                  placeholder="مثال: فيلات ساحلية"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none text-end font-arabic"
                  dir="rtl"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
