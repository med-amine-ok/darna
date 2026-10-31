"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import type { RoomType } from "@/types";
import { formatDzd } from "@/lib/currency";
import { dur, ease } from "@/lib/motion";
import { AnimatedNumber, Badge, Button, Pill, cn } from "@/components/ui";
import { BrandBedIcon, BrandCheckIcon, BrandChevronDownIcon, BrandUserIcon, BrandDoorIcon } from "@/components/icons";

interface RoomCardProps {
  room: RoomType;
  selected: boolean;
  onSelect: () => void;
  /** Price of one room / bed for the selected nights (same quote the server uses). */
  stayPrice: number;
  nights: number;
  /** Units left (rooms or beds). */
  left: number;
  /** A night in the selected range is fully booked for this type. */
  soldOut: boolean;
  amenityLabel: (key: string) => string;
  /** Opens the photo tour on this room's photos. */
  onOpenPhotos?: () => void;
  fallbackImage: string;
}

/**
 * Room / dorm card (Airbnb + Booking pattern): photo, specs, price for the stay, honest
 * availability, expandable details and a select action that drives the booking card.
 */
export default function RoomCard({
  room,
  selected,
  onSelect,
  stayPrice,
  nights,
  left,
  soldOut,
  amenityLabel,
  onOpenPhotos,
  fallbackImage,
}: RoomCardProps) {
  const t = useTranslations("listing");
  const tp = useTranslations("listing.property");
  const locale = useLocale();
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const isBed = room.bookingUnit === "bed";
  const nightly = room.basePrice ?? room.price;
  const image = room.imageSrc?.[0] || fallbackImage;
  const money = (n: number) => formatDzd(n, locale);
  const beds = room.bedsDescription || (isBed ? tp("bunkShared") : room.capacity > 2 ? tp("kingPlusSofa") : tp("kingBed"));

  return (
    <li
      className={cn(
        "group/room rounded-3xl bg-white p-3 sm:p-4 transition-[box-shadow,transform] duration-base ease-out",
        selected ? "shadow-e3 ring-2 ring-primary-800" : "shadow-e1 hover:shadow-e2 hover:-translate-y-0.5"
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
        {/* Photo */}
        <button
          type="button"
          onClick={onOpenPhotos}
          aria-label={t("tour.roomPhotos", { name: room.name })}
          className="md:col-span-5 relative aspect-[4/3] rounded-2xl overflow-hidden bg-tertiary-100 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className={cn(
              "object-cover transition-transform [transition-duration:700ms] ease-out group-hover/room:scale-[1.04]"
            )}
          />
          <Pill tone="glass" className="absolute top-3 start-3">
            {isBed ? tp("dormBed") : tp("privateRoom")}
          </Pill>
        </button>

        {/* Details */}
        <div className="md:col-span-7 flex flex-col gap-4 px-1 pb-1 md:px-0 md:py-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <h3 className="font-serif text-heading text-primary-900 min-w-0 [text-wrap:balance]">{room.name}</h3>
            {soldOut ? (
              <Badge tone="danger" size="md">{t("room.soldOut")}</Badge>
            ) : left <= 5 ? (
              <Badge tone="warning" size="md" dot>{t("room.leftCount", { count: left })}</Badge>
            ) : (
              <Badge tone="success" size="md" dot>{t("room.availableCount", { count: left })}</Badge>
            )}
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-meta text-primary-700">
            <li className="inline-flex items-center gap-1.5">
              <BrandUserIcon size={16} className="text-secondary-700" />
              {isBed ? t("room.onePerBed") : t("upToGuests", { count: room.capacity })}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <BrandBedIcon size={16} className="text-secondary-700" />
              {beds}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <BrandDoorIcon size={16} className="text-secondary-700" />
              {isBed ? t("room.bedsTotal", { count: room.totalInventory }) : t("room.roomsTotal", { count: room.totalInventory })}
            </li>
          </ul>

          <div>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 min-h-[44px] -my-2 text-meta font-semibold text-primary-900 underline underline-offset-4 decoration-primary/30 hover:decoration-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              {open ? t("room.hideDetails") : t("room.showDetails")}
              <BrandChevronDownIcon size={16} className={cn("transition-transform duration-fast", open && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <m.div
                  id={detailsId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, transition: { duration: dur.base, ease: ease.out } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: dur.fast, ease: ease.standard } }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    {room.description && <p className="text-body text-primary-700">{room.description}</p>}
                    {room.amenities && room.amenities.length > 0 && (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {room.amenities.map((am) => (
                          <li key={am} className="flex items-center gap-2 text-meta text-primary-700">
                            <BrandCheckIcon size={14} className="text-secondary-700 shrink-0" />
                            <span className="first-letter:uppercase">{amenityLabel(am)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="flex items-center gap-2 text-meta text-secondary-800">
                      <BrandCheckIcon size={14} className="shrink-0" />
                      {t("freeCancelHighlight")}
                    </p>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-primary/[0.08]">
            <div>
              <p className="flex items-baseline gap-1.5">
                <AnimatedNumber value={stayPrice} format={money} className="font-serif text-heading text-primary-900 tabular-nums" />
                <span className="text-meta text-primary-500">{t("room.forNights", { count: nights })}</span>
              </p>
              <p className="text-meta text-primary-500 tabular-nums">
                {money(nightly)} {isBed ? tp("perBedNight") : t("priceSuffix.night")}
              </p>
            </div>
            <Button
              variant={selected ? "secondary" : "tertiary"}
              onClick={onSelect}
              disabled={soldOut && !selected}
              aria-pressed={selected}
              aria-label={selected ? tp("selectedRoomNamed", { name: room.name }) : tp("selectRoomNamed", { name: room.name })}
              leadingIcon={selected ? <BrandCheckIcon size={16} /> : undefined}
            >
              {selected ? tp("selectedRoom") : tp("selectRoom")}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
