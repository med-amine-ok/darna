"use client";

import React, { useId, useMemo, useState } from "react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  BookOpen,
  Search,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  RotateCcw,
  Compass,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import {
  GLOSSARY_KEYS,
  useGlossary,
  useMigrationItems,
  filterMigrationItems,
} from "@/lib/glossary";

type HelpTab = "guides" | "glossary" | "migration";

const GUIDES: {
  id: "validateProviders" | "refunds" | "commissions" | "staysVsHotels";
  href: string;
  icon: LucideIcon;
  iconClass: string;
  linkClass: string;
}[] = [
  {
    id: "validateProviders",
    href: "/moderation/providers",
    icon: ShieldCheck,
    iconClass: "bg-secondary/15 text-secondary-700",
    linkClass: "text-secondary-700",
  },
  {
    id: "refunds",
    href: "/bookings",
    icon: RotateCcw,
    iconClass: "bg-primary/10 text-primary",
    linkClass: "text-primary",
  },
  {
    id: "commissions",
    href: "/payments/commissions",
    icon: CreditCard,
    iconClass: "bg-tertiary/20 text-primary",
    linkClass: "text-primary",
  },
  {
    id: "staysVsHotels",
    href: "/stays",
    icon: Building,
    iconClass: "bg-accent/15 text-accent-700",
    linkClass: "text-accent-700",
  },
];

/** Business terms specific to the help centre (metric terms come from lib/glossary). */
const HELP_TERMS = ["dzd", "escrow", "individualHost", "travelAgency"] as const;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function HelpClient() {
  const locale = useLocale();
  const t = useTranslations("help");
  const tWhere = useTranslations("whereDidItGo");
  const { getPlainTerm, getDefinition, getTerm } = useGlossary();
  const [activeTab, setActiveTab] = useState<HelpTab>("guides");
  const [searchQuery, setSearchQuery] = useState("");
  const searchId = useId();

  const migrationItems = useMigrationItems();
  const filteredMigration = useMemo(
    () => filterMigrationItems(migrationItems, searchQuery, locale),
    [migrationItems, searchQuery, locale]
  );

  const glossaryCount = HELP_TERMS.length + GLOSSARY_KEYS.length;

  const kpis = [
    {
      id: "guides",
      label: t("kpi.guides"),
      value: t("kpi.guidesValue", { count: GUIDES.length }),
      icon: BookOpen,
      colorVariant: "primary" as const,
      active: activeTab === "guides",
      onClick: () => setActiveTab("guides"),
    },
    {
      id: "glossary",
      label: t("kpi.glossary"),
      value: t("kpi.glossaryValue", { count: glossaryCount }),
      icon: FileText,
      colorVariant: "secondary" as const,
      active: activeTab === "glossary",
      onClick: () => setActiveTab("glossary"),
    },
    {
      id: "migration",
      label: t("kpi.migration"),
      value: t("kpi.migrationValue", { count: migrationItems.length }),
      icon: Compass,
      colorVariant: "tertiary" as const,
      active: activeTab === "migration",
      onClick: () => setActiveTab("migration"),
    },
  ];

  return (
    <div className="space-y-6 text-start max-w-6xl mx-auto">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <KpiStrip cards={kpis} />

      <Tabs
        items={[
          { id: "guides", label: t("tabs.guides"), icon: <BookOpen className="w-4 h-4" aria-hidden="true" /> },
          { id: "glossary", label: t("tabs.glossary"), icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
          { id: "migration", label: t("tabs.migration"), icon: <Compass className="w-4 h-4" aria-hidden="true" /> },
        ]}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as HelpTab)}
      />

      {/* Task Guides */}
      {activeTab === "guides" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDES.map((guide) => {
            const Icon = guide.icon;
            return (
              <article
                key={guide.id}
                className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-3 shadow-2xs"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${guide.iconClass}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-bold text-primary text-base">{t(`guides.${guide.id}.title`)}</h2>
                <p className="text-xs text-neutral-500 leading-relaxed">{t(`guides.${guide.id}.body`)}</p>
                <div className="pt-2">
                  <Link
                    href={guide.href}
                    className={`text-xs font-bold inline-flex items-center gap-1 hover:underline rounded ${guide.linkClass} ${FOCUS_RING}`}
                  >
                    {t(`guides.${guide.id}.cta`)}
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Glossary */}
      {activeTab === "glossary" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h2 className="font-bold text-primary text-base">{t("glossaryTitle")}</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {HELP_TERMS.map((term) => (
              <div key={term} className="p-3.5 rounded-xl bg-darnaBg/30 border border-tertiary/40 space-y-1">
                <dt className="font-bold text-xs text-primary">{t(`terms.${term}.term`)}</dt>
                <dd className="text-xs text-neutral-600">{t(`terms.${term}.definition`)}</dd>
              </div>
            ))}
            {GLOSSARY_KEYS.map((key) => (
              <div key={key} className="p-3.5 rounded-xl bg-darnaBg/30 border border-tertiary/40 space-y-1">
                <dt className="font-bold text-xs text-primary">
                  {getPlainTerm(key)}{" "}
                  <span className="font-normal text-neutral-500">({getTerm(key)})</span>
                </dt>
                <dd className="text-xs text-neutral-600">{getDefinition(key)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Migration / Where did it go */}
      {activeTab === "migration" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-tertiary/40">
            <label htmlFor={searchId} className="sr-only">
              {tWhere("searchLabel")}
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
                placeholder={tWhere("searchPlaceholder")}
                className={`w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-darnaBg/50 border border-tertiary/70 text-primary focus:outline-none focus:border-secondary ${FOCUS_RING}`}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/40 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <caption className="sr-only">{tWhere("tableCaption")}</caption>
                <thead className="bg-darnaBg/60 text-neutral-600 font-semibold border-b border-tertiary/40">
                  <tr>
                    <th scope="col" className="py-3 px-4 text-start">{tWhere("columns.oldName")}</th>
                    <th scope="col" className="py-3 px-4 text-start">{tWhere("columns.newName")}</th>
                    <th scope="col" className="py-3 px-4 text-start">{tWhere("columns.why")}</th>
                    <th scope="col" className="py-3 px-4 text-end">{tWhere("columns.link")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredMigration.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-4 text-center text-neutral-500">
                        {tWhere("noResults", { query: searchQuery.trim() })}
                      </td>
                    </tr>
                  ) : (
                    filteredMigration.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/50">
                        <td className="py-3 px-4 text-neutral-600">{item.oldName}</td>
                        <td className="py-3 px-4 font-bold text-primary">{item.newName}</td>
                        <td className="py-3 px-4 text-neutral-600">{item.description}</td>
                        <td className="py-3 px-4 text-end">
                          <Link
                            href={item.href}
                            aria-label={tWhere("jumpToLabel", { name: item.newName })}
                            className={`text-xs font-bold text-secondary-700 hover:underline inline-flex items-center gap-1 rounded ${FOCUS_RING}`}
                          >
                            {t("open")}
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
      )}
    </div>
  );
}
