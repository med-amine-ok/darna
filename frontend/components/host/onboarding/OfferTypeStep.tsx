"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  BrandArrowRightIcon,
  BrandBuildingIcon,
  BrandCompassIcon,
  BrandSparklesIcon,
  CategoryHouseIcon,
  CategoryVehicleIcon,
} from "@/components/icons";
import { cn, focusRing } from "@/components/ui";
import { imagery } from "@/lib/imagery";
import type { HostOffer } from "@/lib/catalog-types";

const photo = (url: string, w = 900) => `${url}?auto=format&fit=crop&w=${w}&q=80`;

const OFFER_VISUALS: Record<HostOffer, { Icon: React.FC<{ size?: number | string; className?: string }>; image: string }> = {
  home: { Icon: CategoryHouseIcon, image: imagery.kabylieVillage },
  vehicle: { Icon: CategoryVehicleIcon, image: imagery.desert4x4 },
  experience: { Icon: BrandSparklesIcon, image: imagery.ghardaiaStreet },
  trip: { Icon: BrandCompassIcon, image: imagery.caravan },
  hotel: { Icon: BrandBuildingIcon, image: imagery.riadPool },
};

/**
 * Step 0 of "Create a listing" (host mode): one big card per offer the
 * workspace may publish (lib/catalog-types.ts HOST_ALLOWED_OFFERS). Agencies
 * see Experience + Trip, individuals Home + Vehicle, hotels/hostels their
 * property with room types.
 */
export default function OfferTypeStep({
  offers,
  hostType,
  onSelect,
}: {
  offers: HostOffer[];
  hostType: "individual" | "agency" | "hotel" | "hostel";
  onSelect: (offer: HostOffer) => void;
}) {
  const t = useTranslations("hostFlow.create");

  return (
    <div className="mx-auto max-w-4xl space-y-8 sm:space-y-10">
      <div className="space-y-3 text-center sm:text-start">
        <p className="enter-up text-eyebrow uppercase text-secondary-700">{t("eyebrow")}</p>
        {/* tabIndex=-1 lets the flow move focus here when the step changes. */}
        <h1
          tabIndex={-1}
          data-step-heading
          className="enter-up font-serif text-display-md font-normal text-primary-900 text-balance focus:outline-none"
          style={{ animationDelay: "60ms" }}
        >
          {t("title")}
        </h1>
        <p className="enter-up max-w-2xl text-body-lg text-primary-600 text-pretty" style={{ animationDelay: "120ms" }}>
          {t(`subtitle.${hostType}`)}
        </p>
      </div>

      <ul className={cn("grid grid-cols-1 gap-5", offers.length > 1 && "sm:grid-cols-2")}>
        {offers.map((offer, i) => {
          const { Icon, image } = OFFER_VISUALS[offer];
          const label = offer === "hotel" ? t(`offers.hotel.title.${hostType === "hostel" ? "hostel" : "hotel"}`) : t(`offers.${offer}.title`);
          return (
            <li key={offer} className="enter-up flex" style={{ animationDelay: `${180 + i * 60}ms` }}>
              <button
                type="button"
                id={`create-offer-${offer}`}
                onClick={() => onSelect(offer)}
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
                    sizes="(min-width: 1024px) 440px, (min-width: 640px) 46vw, 92vw"
                    className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-primary-900/45 to-transparent" />
                </span>
                <span className="relative flex flex-1 flex-col gap-3 p-5 pt-9 sm:p-6 sm:pt-10">
                  <span
                    aria-hidden="true"
                    className="absolute -top-7 start-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary-800 shadow-e2 transition-colors duration-fast ease-standard group-hover:bg-primary-800 group-hover:text-white sm:start-6"
                  >
                    <Icon size={26} />
                  </span>
                  <span className="block text-heading text-primary-900">{label}</span>
                  <span className="block flex-1 text-body text-primary-600">{t(`offers.${offer}.desc`)}</span>
                  <span className="mt-1 flex items-center justify-between gap-3 border-t border-primary/[0.08] pt-4 text-body font-semibold text-accent-700">
                    <span>{t(`offers.${offer}.cta`)}</span>
                    <BrandArrowRightIcon
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 transition-transform duration-base ease-out rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                    />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
