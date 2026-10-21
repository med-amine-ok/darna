"use client";

import React, { useState } from "react";
import { Link } from "@/navigation";
import { useLocale } from "next-intl";
import {
  Compass,
  Search,
  ArrowRight,
  Sparkles,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { WHERE_DID_IT_GO_ITEMS } from "@/lib/glossary";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function WhereDidItGoPage() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = WHERE_DID_IT_GO_ITEMS.filter((item) => {
    const q = searchQuery.toLowerCase();
    const oldN = (item.oldName[locale] || item.oldName.en).toLowerCase();
    const newN = (item.newName[locale] || item.newName.en).toLowerCase();
    const desc = (item.description[locale] || item.description.en).toLowerCase();
    return oldN.includes(q) || newN.includes(q) || desc.includes(q);
  });

  return (
    <div className="space-y-6 text-start max-w-5xl mx-auto pb-12 animate-in fade-in">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: locale === "fr" ? "Accueil" : locale === "ar" ? "الرئيسية" : "Home", href: "/" },
          {
            label:
              locale === "fr"
                ? "Où est passée ma page ?"
                : locale === "ar"
                ? "أين ذهبت صفحتي السابقة؟"
                : "Where did it go?",
          },
        ]}
      />

      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-tertiary/70 shadow-2xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">
              {locale === "fr"
                ? "Où est passée mon ancienne page ?"
                : locale === "ar"
                ? "دليل الانتقال: أين ذهبت الصفحة السابقة؟"
                : "Where Did It Go? Migration Guide"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              {locale === "fr"
                ? "Pour vous faire gagner du temps, nous avons simplifié la navigation à 7 rubriques principales. Retrouvez ici tous les anciens accès."
                : locale === "ar"
                ? "لتسهيل وتسريع عملكم اليومي، قمنا بتبسيط القائمة إلى 7 أقسام رئيسية. تجدون هنا مطابقة لكافة الروابط السابقة."
                : "To save you time and clicks, navigation has been simplified to 7 core items. Find previous links and their new locations below."}
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="pt-2">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                locale === "fr"
                  ? "Tapez l'ancien nom de la page..."
                  : locale === "ar"
                  ? "ابحثوا بالاسم السابق للصفحة..."
                  : "Search previous page name or keyword..."
              }
              className="w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-darnaBg/70 border border-tertiary/80 focus:outline-none focus:border-secondary transition shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Migration Comparison Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 font-bold">
                
                <th className="px-4 py-3 text-start">
                  {locale === "fr" ? "Nouveau nom & langage clair" : locale === "ar" ? "الاسم الجديد المبسط" : "New Name"}
                </th>
                <th className="px-4 py-3 text-start">
                  {locale === "fr" ? "Nouvel emplacement" : locale === "ar" ? "المكان الجديد" : "New Location"}
                </th>
                <th className="px-4 py-3 text-start">
                  {locale === "fr" ? "Pourquoi ce changement ?" : locale === "ar" ? "سبب التغيير" : "Why Changed?"}
                </th>
                <th className="px-4 py-3 text-end">
                  {locale === "fr" ? "Action directe" : locale === "ar" ? "الانتقال" : "Direct Link"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredItems.map((item, i) => (
                <tr key={i} className="hover:bg-neutral-50/80 transition">
                  

                  {/* New Name */}
                  <td className="px-4 py-3.5 font-bold text-primary">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span>{item.newName[locale] || item.newName.en}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3.5 text-neutral-700">
                    <span className="px-2 py-0.5 rounded-lg bg-neutral-100 border border-neutral-200 text-[11px] font-medium">
                      {item.location[locale] || item.location.en}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3.5 text-neutral-600 text-[11px] max-w-xs leading-relaxed">
                    {item.description[locale] || item.description.en}
                  </td>

                  {/* Direct Link */}
                  <td className="px-4 py-3.5 text-end">
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary font-bold text-xs transition"
                    >
                      <span>
                        {locale === "fr"
                          ? "Y aller"
                          : locale === "ar"
                          ? "الانتقال"
                          : "Jump there"}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
