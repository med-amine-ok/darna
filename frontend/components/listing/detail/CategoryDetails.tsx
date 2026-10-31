"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { Listing } from "@/types";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import {
  BrandAdjustmentsIcon,
  BrandCalendarIcon,
  BrandCheckIcon,
  BrandClockIcon,
  BrandCompassIcon,
  BrandFlameIcon,
  BrandGlobeIcon,
  BrandKeyIcon,
  BrandLightningIcon,
  BrandMapIcon,
  BrandPinIcon,
  BrandShieldIcon,
  BrandUsersIcon,
  CategoryVehicleIcon,
  type IconProps,
} from "@/components/icons";

interface Fact {
  key: string;
  Icon: React.FC<IconProps>;
  label: string;
  value: string;
}

/** Icon tiles for the key facts of an experience or a vehicle (only facts the listing has). */
function FactGrid({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <RevealGroup as="ul" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {facts.map(({ key, Icon, label, value }) => (
        <RevealItem as="li" key={key} className="rounded-2xl bg-white shadow-e1 p-4 sm:p-5">
          <Icon size={22} className="text-secondary-700" />
          <p className="mt-3 text-meta text-primary-500">{label}</p>
          <p className="mt-0.5 text-body font-semibold text-primary-900 first-letter:uppercase">{value}</p>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

const sectionClass = "scroll-mt-28 border-b border-primary/[0.08] py-10 space-y-5";

/** Experience: quick facts, GetYourGuide-style "what's included" chips, languages. */
export function ExperienceDetails({ listing }: { listing: Listing }) {
  const t = useTranslations("listing");
  const included = (listing.includedItems ?? []).filter(Boolean);
  const languages = (listing.experienceLanguages ?? []).filter(Boolean);
  const durationLabel = (hours: number) =>
    hours >= 24 && hours % 24 === 0 ? t("daysCount", { count: hours / 24 }) : t("hoursCount", { count: hours });
  const facts: Fact[] = [
    listing.durationHours
      ? { key: "duration", Icon: BrandClockIcon, label: t("facts.duration"), value: durationLabel(listing.durationHours) }
      : null,
    listing.groupSize ? { key: "group", Icon: BrandUsersIcon, label: t("facts.groupSize"), value: t("upToGuests", { count: listing.groupSize }) } : null,
    languages.length > 0 ? { key: "languages", Icon: BrandGlobeIcon, label: t("facts.languages"), value: languages.join(", ") } : null,
    listing.activityName ? { key: "activity", Icon: BrandCompassIcon, label: t("facts.activity"), value: listing.activityName } : null,
  ].filter((f): f is Fact => f !== null);

  return (
    <>
      {facts.length > 0 && (
        <div data-reveal className={sectionClass}>
          <h2 className="font-serif text-heading text-primary-900">{t("facts.experienceTitle")}</h2>
          <FactGrid facts={facts} />
        </div>
      )}
      {included.length > 0 && (
        <div id="included" data-reveal className={sectionClass}>
          <h2 className="font-serif text-heading text-primary-900">{t("whatsIncluded")}</h2>
          <RevealGroup as="ul" each={0.04} className="flex flex-wrap gap-2.5">
            {included.map((item) => (
              <RevealItem
                as="li"
                key={item}
                className="inline-flex items-center gap-2 min-h-[44px] rounded-full bg-white shadow-e1 ps-2 pe-4 text-body font-medium text-primary-800"
              >
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-100 text-secondary-700">
                  <BrandCheckIcon size={15} />
                </span>
                {item}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}
    </>
  );
}

/** Vehicle: specifications grid and a pickup & return card (Turo pattern). */
export function VehicleDetails({ listing, pickupTime, returnTime }: { listing: Listing; pickupTime: string; returnTime: string }) {
  const t = useTranslations("listing");
  const makeModel = [listing.make, listing.model].filter(Boolean).join(" ");
  const facts: Fact[] = [
    makeModel ? { key: "model", Icon: CategoryVehicleIcon, label: t("facts.makeModel"), value: makeModel } : null,
    listing.year ? { key: "year", Icon: BrandCalendarIcon, label: t("facts.year"), value: String(listing.year) } : null,
    listing.seats ? { key: "seats", Icon: BrandUsersIcon, label: t("facts.seats"), value: t("seatsCount", { count: listing.seats }) } : null,
    listing.transmission
      ? {
          key: "transmission",
          Icon: BrandAdjustmentsIcon,
          label: t("facts.transmission"),
          value: t(`transmission.${listing.transmission === "manual" ? "manual" : "automatic"}`),
        }
      : null,
    listing.fuelType
      ? { key: "fuel", Icon: listing.fuelType === "electric" ? BrandLightningIcon : BrandFlameIcon, label: t("facts.fuel"), value: t(`fuel.${listing.fuelType}`) }
      : null,
  ].filter((f): f is Fact => f !== null);

  const rows = [
    listing.pickupLocation ? { key: "pickup", Icon: BrandPinIcon, label: t("facts.pickupLocation"), value: listing.pickupLocation } : null,
    { key: "times", Icon: BrandKeyIcon, label: t("facts.pickupReturnTimes"), value: t("facts.pickupReturnValue", { pickup: pickupTime, dropoff: returnTime }) },
    listing.mileagePolicy ? { key: "mileage", Icon: BrandMapIcon, label: t("facts.mileage"), value: listing.mileagePolicy } : null,
    listing.insuranceNotes ? { key: "insurance", Icon: BrandShieldIcon, label: t("facts.insurance"), value: listing.insuranceNotes } : null,
  ].filter((r): r is Fact => r !== null);

  return (
    <>
      {facts.length > 0 && (
        <div id="specs" data-reveal className={sectionClass}>
          <h2 className="font-serif text-heading text-primary-900">{t("facts.specsTitle")}</h2>
          <FactGrid facts={facts} />
        </div>
      )}
      <div data-reveal className={sectionClass}>
        <h2 className="font-serif text-heading text-primary-900">{t("facts.pickupReturnTitle")}</h2>
        <ul className="rounded-3xl bg-white shadow-e2 divide-y divide-primary/[0.08]">
          {rows.map(({ key, Icon, label, value }) => (
            <li key={key} className="flex items-start gap-4 p-5">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-100 text-primary-800">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-meta text-primary-500">{label}</p>
                <p className="mt-0.5 text-body font-medium text-primary-900">{value}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
