"use client";

import React, { useId, useMemo, useState } from "react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Compass, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { useMigrationItems, filterMigrationItems } from "@/lib/glossary";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function WhereDidItGoClient() {
  const locale = useLocale();
  const t = useTranslations("whereDidItGo");
  const tNav = useTranslations("nav");
  const [searchQuery, setSearchQuery] = useState("");
  const searchId = useId();

  const items = useMigrationItems();
  const filteredItems = useMemo(
    () => filterMigrationItems(items, searchQuery, locale),
    [items, searchQuery, locale]
  );

  return (
    <div className="space-y-6 text-start max-w-5xl mx-auto pb-12 animate-in fade-in">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: tNav("whereDidItGo") }]} />

      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-tertiary/70 shadow-2xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary-700">
            <Compass className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">{t("title")}</h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">{t("subtitle", { count: 7 })}</p>
          </div>
        </div>

        {/* Search input */}
        <div className="pt-2">
          <label htmlFor={searchId} className="sr-only">
            {t("searchLabel")}
          </label>
          <div className="relative max-w-md">
            <Search
              className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-darnaBg/70 border border-tertiary/80 focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 transition shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Migration Comparison Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <caption className="sr-only">{t("tableCaption")}</caption>
            <thead>
              <tr className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 font-bold">
                <th scope="col" className="px-4 py-3 text-start">
                  {t("columns.oldName")}
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  {t("columns.newName")}
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  {t("columns.location")}
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  {t("columns.why")}
                </th>
                <th scope="col" className="px-4 py-3 text-end">
                  {t("columns.link")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    {t("noResults", { query: searchQuery.trim() })}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition">
                    {/* Old Name */}
                    <td className="px-4 py-3.5 text-neutral-600">
                      {item.oldName}
                    </td>

                    {/* New Name */}
                    <td className="px-4 py-3.5 font-bold text-primary">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-secondary shrink-0"
                          aria-hidden="true"
                        />
                        <span>{item.newName}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3.5 text-neutral-700">
                      <span className="px-2 py-0.5 rounded-lg bg-neutral-100 border border-neutral-200 text-[11px] font-medium">
                        {item.location}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 text-neutral-600 text-[11px] max-w-xs leading-relaxed">
                      {item.description}
                    </td>

                    {/* Direct Link */}
                    <td className="px-4 py-3.5 text-end">
                      <Link
                        href={item.href}
                        aria-label={t("jumpToLabel", { name: item.newName })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary-700 font-bold text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                      >
                        <span>{t("jumpThere")}</span>
                        <ArrowRight className="w-3 h-3 rtl:rotate-180" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
