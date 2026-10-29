"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  BrandUserIcon,
  BrandCompassIcon,
  BrandBuildingIcon,
  BrandBedIcon,
  BrandChevronRightIcon,
} from "@/components/icons";
import { FOCUS_RING } from "./data";
import { StepHeader } from "./ui";

export type HostKind = "individual" | "agency" | "hotel" | "hostel";

/** Step 0: choose between individual, agency, hotel and hostel onboarding. */
export default function HostTypeStep({ onSelect }: { onSelect: (kind: HostKind) => void }) {
  const t = useTranslations("hostFlow");

  const cards: {
    kind: HostKind;
    Icon: typeof BrandUserIcon;
    badge: string;
    badgeClass: string;
    title: string;
    desc: string;
    cta: string;
  }[] = [
    {
      kind: "individual",
      Icon: BrandUserIcon,
      badge: t("hostType.individual.badge"),
      badgeClass: "bg-emerald-100 text-emerald-800",
      title: t("individualTitle"),
      desc: t("individualDesc"),
      cta: t("hostType.individual.cta"),
    },
    {
      kind: "agency",
      Icon: BrandCompassIcon,
      badge: t("hostType.agency.badge"),
      badgeClass: "bg-amber-100 text-amber-800",
      title: t("agencyTitle"),
      desc: t("agencyDesc"),
      cta: t("hostType.agency.cta"),
    },
    {
      kind: "hotel",
      Icon: BrandBuildingIcon,
      badge: t("hostType.hotel.badge"),
      badgeClass: "bg-blue-100 text-blue-800",
      title: t("hostType.hotel.title"),
      desc: t("hostType.hotel.desc"),
      cta: t("hostType.hotel.cta"),
    },
    {
      kind: "hostel",
      Icon: BrandBedIcon,
      badge: t("hostType.hostel.badge"),
      badgeClass: "bg-purple-100 text-purple-800",
      title: t("hostType.hostel.title"),
      desc: t("hostType.hostel.desc"),
      cta: t("hostType.hostel.cta"),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      <StepHeader
        level={1}
        size="lg"
        eyebrow={t("hostType.eyebrow")}
        title={t("hostTypeTitle")}
        subtitle={t("hostTypeSubtitle")}
      />

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto pt-2">
        {cards.map(({ kind, Icon, badge, badgeClass, title, desc, cta }) => (
          <li key={kind} className="flex">
            <button
              type="button"
              id={`choose-${kind}-card`}
              onClick={() => onSelect(kind)}
              className={`w-full text-start bg-white rounded-3xl p-6 sm:p-7 border-2 border-tertiary hover:border-primary hover:shadow-lg transition flex flex-col justify-between group ${FOCUS_RING}`}
            >
              <span className="space-y-4 block">
                <span className="flex items-center justify-between">
                  <span className="w-13 h-13 bg-tertiary/30 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                    <Icon size={26} />
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>{badge}</span>
                </span>
                <span className="block">
                  <span className="block text-lg font-bold text-primary">{title}</span>
                  <span className="block text-xs text-neutral-600 mt-1.5 leading-relaxed">{desc}</span>
                </span>
              </span>
              <span className="w-full pt-5 mt-4 border-t border-tertiary/40 flex items-center justify-between text-xs font-bold text-primary">
                <span>{cta}</span>
                <BrandChevronRightIcon
                  size={18}
                  className="transition rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
