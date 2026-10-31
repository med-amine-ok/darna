"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  BrandUserIcon,
  BrandCompassIcon,
  BrandBuildingIcon,
  BrandBedIcon,
  BrandArrowRightIcon,
  BrandCheckCircleIcon,
} from "@/components/icons";
import { ArchImage, Badge, cn, focusRing } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { imagery } from "@/lib/imagery";

export type HostKind = "individual" | "agency" | "hotel" | "hostel";

const photo = (url: string, w = 900) => `${url}?auto=format&fit=crop&w=${w}&q=80`;

/**
 * Step 0: the welcoming intro. Arch-masked photography, serif headline, then four large
 * selectable host-type cards (photo, icon tile, palette badge, lift on hover).
 */
export default function HostTypeStep({ onSelect }: { onSelect: (kind: HostKind) => void }) {
  const t = useTranslations("hostFlow");

  const cards: {
    kind: HostKind;
    Icon: typeof BrandUserIcon;
    image: string;
    badge: string;
    tone: BadgeTone;
    title: string;
    desc: string;
    cta: string;
  }[] = [
    {
      kind: "individual",
      Icon: BrandUserIcon,
      image: imagery.kabylieVillage,
      badge: t("hostType.individual.badge"),
      tone: "olive",
      title: t("individualTitle"),
      desc: t("individualDesc"),
      cta: t("hostType.individual.cta"),
    },
    {
      kind: "agency",
      Icon: BrandCompassIcon,
      image: imagery.desert4x4,
      badge: t("hostType.agency.badge"),
      tone: "ochre",
      title: t("agencyTitle"),
      desc: t("agencyDesc"),
      cta: t("hostType.agency.cta"),
    },
    {
      kind: "hotel",
      Icon: BrandBuildingIcon,
      image: imagery.riadPool,
      badge: t("hostType.hotel.badge"),
      tone: "terracotta",
      title: t("hostType.hotel.title"),
      desc: t("hostType.hotel.desc"),
      cta: t("hostType.hotel.cta"),
    },
    {
      kind: "hostel",
      Icon: BrandBedIcon,
      image: imagery.ghardaiaStreet,
      badge: t("hostType.hostel.badge"),
      tone: "sand",
      title: t("hostType.hostel.title"),
      desc: t("hostType.hostel.desc"),
      cta: t("hostType.hostel.cta"),
    },
  ];

  const points = [t("hostType.points.draft"), t("hostType.points.dzd"), t("hostType.points.types")];

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Intro */}
      <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div className="space-y-5 text-center lg:text-start">
          <p className="enter-up text-eyebrow uppercase text-secondary-700">{t("hostType.eyebrow")}</p>
          {/* tabIndex=-1 lets the flow move focus here when the step changes. */}
          <h1
            tabIndex={-1}
            data-step-heading
            className="enter-up font-serif text-display-lg font-normal text-primary-900 text-balance focus:outline-none"
            style={{ animationDelay: "60ms" }}
          >
            {t("hostTypeTitle")}
          </h1>
          <p
            className="enter-up mx-auto max-w-xl text-body-lg text-primary-600 text-pretty lg:mx-0"
            style={{ animationDelay: "120ms" }}
          >
            {t("hostTypeSubtitle")}
          </p>
          <ul
            className="enter-up mx-auto flex max-w-xl flex-col items-center gap-2.5 pt-1 sm:items-start lg:mx-0"
            style={{ animationDelay: "180ms" }}
          >
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-body text-primary-800">
                <BrandCheckCircleIcon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-secondary-600" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto hidden w-full max-w-md grid-cols-[0.8fr_1fr] items-end gap-4 sm:grid">
          <div className="enter-rise pb-10" style={{ animationDelay: "200ms" }}>
            <ArchImage
              src={photo(imagery.ghardaia, 700)}
              alt={t("hostType.imageAlt.ghardaia")}
              sizes="(min-width: 1024px) 190px, 30vw"
              priority
            />
          </div>
          <div className="enter-rise" style={{ animationDelay: "80ms" }}>
            <ArchImage
              src={photo(imagery.riadCourtyard, 900)}
              alt={t("hostType.imageAlt.riad")}
              sizes="(min-width: 1024px) 240px, 38vw"
              priority
            />
          </div>
        </div>
      </section>

      {/* Host type cards */}
      <section aria-labelledby="host-type-cards-title" className="space-y-5">
        <h2 id="host-type-cards-title" className="text-heading text-primary-900">
          {t("hostType.chooseTitle")}
        </h2>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {cards.map((card, i) => (
            <li key={card.kind} className="enter-up flex" style={{ animationDelay: `${240 + i * 60}ms` }}>
              <HostTypeCard {...card} onSelect={() => onSelect(card.kind)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HostTypeCard({
  kind,
  Icon,
  image,
  badge,
  tone,
  title,
  desc,
  cta,
  onSelect,
}: {
  kind: HostKind;
  Icon: typeof BrandUserIcon;
  image: string;
  badge: string;
  tone: BadgeTone;
  title: string;
  desc: string;
  cta: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      id={`choose-${kind}-card`}
      onClick={onSelect}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-3xl bg-white text-start shadow-e1",
        "transition-[box-shadow,transform] duration-base ease-out hover:-translate-y-1 hover:shadow-e3 active:translate-y-0",
        focusRing
      )}
    >
      <span className="relative block aspect-[16/7] w-full overflow-hidden bg-tertiary-100">
        <Image
          src={photo(image)}
          alt=""
          fill
          sizes="(min-width: 1024px) 560px, (min-width: 640px) 46vw, 92vw"
          className={cn(
            "object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
          )}
        />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-primary-900/45 to-transparent" />
        <span className="absolute start-4 top-4">
          <Badge tone={tone} size="md" className="shadow-e1">
            {badge}
          </Badge>
        </span>
      </span>
      <span className="relative flex flex-1 flex-col gap-3 p-5 pt-9 sm:p-6 sm:pt-10">
        <span
          aria-hidden="true"
          className="absolute -top-7 start-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary-800 shadow-e2 transition-colors duration-fast ease-standard group-hover:bg-primary-800 group-hover:text-white sm:start-6"
        >
          <Icon size={26} />
        </span>
        <span className="block text-heading text-primary-900">{title}</span>
        <span className="block flex-1 text-body text-primary-600">{desc}</span>
        <span className="mt-1 flex items-center justify-between gap-3 border-t border-primary/[0.08] pt-4 text-body font-semibold text-accent-700">
          <span>{cta}</span>
          <BrandArrowRightIcon
            size={18}
            aria-hidden="true"
            className="shrink-0 transition-transform duration-base ease-out rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
          />
        </span>
      </span>
    </button>
  );
}
