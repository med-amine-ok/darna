"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { Listing, Reservation, User } from "@/types";
import HeartButton from "@/components/HeartButton";
import PriceDisplay from "@/components/common/PriceDisplay";
import Button from "@/components/Button";
import { useTranslations, useLocale } from "next-intl";
import { useShowTotalPrice } from "@/hook/useShowTotalPrice";
import { formatDate, formatRating } from "@/lib/i18n/date-locale";
import { listingHref, priceSuffixKey } from "./cardLabels";
import {
  BrandStarIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandCalendarIcon,
  BrandPinIcon,
  CategoryVehicleIcon,
} from "@/components/icons";

interface ListingCardProps {
  data: Listing;
  reservation?: Reservation;
  onAction?: (id: string) => void;
  disabled?: boolean;
  actionLabel?: string;
  actionId?: string;
  currentUser?: User | null;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
  /** Called instead of navigating when the card is activated. */
  onClick?: () => void;
  customHref?: string;
}

export default function ListingCard({
  data,
  reservation,
  onAction,
  disabled,
  actionLabel,
  actionId = "",
  currentUser,
  onHover,
  onClick,
  customHref,
}: ListingCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tSearch = useTranslations("search");
  const tCommon = useTranslations("common");
  const t = useTranslations("listing");

  const images = useMemo(() => {
    if (Array.isArray(data.imageSrc)) {
      return data.imageSrc;
    }
    return [data.imageSrc];
  }, [data.imageSrc]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const gestureStartX = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const handleNextImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    },
    [images.length]
  );

  const handlePrevImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    },
    [images.length]
  );

  // Swipe/drag on the photo changes the image. The card link overlays the whole card, so the
  // gesture is tracked on the card and only counts when it starts over the photo area.
  const isOverImage = (clientX: number, clientY: number) => {
    const rect = imageAreaRef.current?.getBoundingClientRect();
    return Boolean(rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    didDragRef.current = false;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gestureStartX.current = isOverImage(e.clientX, e.clientY) ? e.clientX : null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (gestureStartX.current === null) return;
    if (Math.abs(e.clientX - gestureStartX.current) > 8) {
      didDragRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (gestureStartX.current === null) return;
    const diff = gestureStartX.current - e.clientX;
    if (images.length > 1 && Math.abs(diff) > 35) {
      // Swipe toward the reading direction's end shows the next photo.
      const forward = locale === "ar" ? diff < 0 : diff > 0;
      setCurrentImageIndex((prev) =>
        forward ? (prev + 1) % images.length : (prev - 1 + images.length) % images.length
      );
    }
    gestureStartX.current = null;
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Drag guard: a swipe on the photo must not open the listing.
    if (didDragRef.current) {
      e.preventDefault();
      didDragRef.current = false;
      return;
    }
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const handleAction = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      onAction?.(actionId);
    },
    [onAction, actionId, disabled]
  );

  const [showTotalPrice] = useShowTotalPrice();
  // "Show total price": search total incl. fees when dates were searched.
  const showTotal = !reservation && showTotalPrice && typeof data.quotedTotal === "number";

  const price = useMemo(() => {
    if (showTotal) return data.quotedTotal as number;
    if (reservation) {
      return reservation.totalPrice;
    }
    if (data.roomTypes && data.roomTypes.length > 0) {
      return Math.min(...data.roomTypes.map((r) => r.basePrice ?? r.price ?? data.price));
    }
    return data.price;
  }, [reservation, data.price, data.roomTypes, data.quotedTotal, showTotal]);

  const rating = formatRating(data.rating, locale);

  const shortDate = { month: "short", day: "numeric" } as const;
  const reservationDate = reservation
    ? tCommon("dateRange", {
        start: formatDate(reservation.startDate, locale, { ...shortDate, year: "numeric" }),
        end: formatDate(reservation.endDate, locale, { ...shortDate, year: "numeric" }),
      })
    : null;

  const href =
    customHref ??
    listingHref(data, {
      onSearchPage: Boolean(pathname?.includes("/search")),
      query: searchParams?.toString(),
    });

  const hasRoomTypes = Boolean(data.roomTypes && data.roomTypes.length > 0);
  const period = showTotal ? t("priceSuffix.total") : !reservation ? t(priceSuffixKey(data)) : undefined;

  const arrowClass =
    "hidden group-hover:flex group-focus-within:flex items-center justify-center p-1.5 rounded-full bg-white/95 hover:bg-white text-neutral-800 shadow-darna transition absolute top-1/2 -translate-y-1/2 z-10 hover:scale-105 active:scale-95 cursor-pointer btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";

  return (
    <div
      onMouseEnter={() => onHover?.(data.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(data.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHover?.(null);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (gestureStartX.current = null)}
      className="relative col-span-1 group select-none transition-all duration-200 card-hover-lift"
    >
      <div className="flex flex-col gap-1.5 w-full">
        {/* Image Container */}
        <div
          ref={imageAreaRef}
          className="aspect-square w-full relative overflow-hidden rounded-xl bg-neutral-100 border border-tertiary/40 select-none"
        >
          <Image
            fill
            className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-300"
            src={images[currentImageIndex] || "/assets/template.jpeg"}
            alt=""
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Heart Button */}
          <div className="absolute top-2.5 end-2.5 z-10">
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>

          {/* Guest Favorite Badge */}
          {data.isGuestFavorite && (
            <div className="absolute top-2 start-2 z-[2] bg-white/95 backdrop-blur-xs text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm max-w-[calc(100%-48px)] truncate">
              {tNav("guestFavorite")}
            </div>
          )}

          {/* Carousel Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t("previousPhoto")}
                onClick={handlePrevImage}
                className={`${arrowClass} start-2`}
              >
                <BrandChevronLeftIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                aria-label={t("nextPhoto")}
                onClick={handleNextImage}
                className={`${arrowClass} end-2`}
              >
                <BrandChevronRightIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
              </button>
            </>
          )}

          {/* Carousel Dots */}
          {images.length > 1 && (
            <div
              className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-1 z-[2] pointer-events-none"
              aria-hidden="true"
            >
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`rounded-full transition-all duration-200 ${
                    idx === currentImageIndex ? "bg-white w-2 h-2 shadow-xs" : "bg-white/60 w-1.5 h-1.5"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Partial Availability Badge (Section 6) */}
        {data.matchedAvailability?.isPartial && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50/90 text-amber-800 border border-amber-200/80 text-[10px] font-semibold w-fit my-0.5">
            <BrandCalendarIcon size={12} strokeWidth={1.8} className="text-amber-700 shrink-0" />
            <span className="truncate">
              {tSearch("partialAvailabilityBadge", {
                range: tCommon("dateRange", {
                  start: formatDate(data.matchedAvailability.overlapStart, locale, shortDate),
                  end: formatDate(data.matchedAvailability.overlapEnd, locale, shortDate),
                }),
              })}
            </span>
          </div>
        )}

        {/* Text Details */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-1 text-xs sm:text-sm font-semibold text-primary">
            <h3 className="truncate flex items-center gap-1 min-w-0">
              <BrandPinIcon size={13} strokeWidth={2} className="text-accent shrink-0" />
              {/* Stretched link: its ::after covers the whole card, so the entire card is clickable. */}
              <Link
                href={href}
                onClick={handleLinkClick}
                draggable={false}
                className="truncate rounded after:absolute after:inset-0 after:z-[1] after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-600 focus-visible:after:ring-offset-2"
              >
                <span className="sr-only">{data.title} – </span>
                {data.city ? t("cityCountry", { city: data.city }) : data.title}
              </Link>
            </h3>
            <span className="flex items-center gap-0.5 font-semibold flex-shrink-0 ms-1 text-xs text-neutral-800">
              {rating ? (
                <>
                  <BrandStarIcon size={12} className="fill-accent text-accent" />
                  <span className="sr-only">{t("ratingLabel", { rating })}</span>
                  <span aria-hidden="true">{rating}</span>
                </>
              ) : (
                t("ratingNew")
              )}
              {rating && data.reviewCount ? (
                <span className="font-normal text-neutral-600 text-[10px]">
                  <span aria-hidden="true">({data.reviewCount})</span>
                  <span className="sr-only">{t("reviewsCount", { count: data.reviewCount })}</span>
                </span>
              ) : null}
            </span>
          </div>

          <div className="font-normal text-neutral-600 text-[11px] sm:text-xs truncate flex items-center gap-1">
            {reservationDate ||
              (hasRoomTypes ? (
                <>
                  <span className="font-semibold text-secondary-700">
                    {data.businessCategory === "hostel" ? t("hostel") : t("hotel")}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{t("unitTypes", { count: data.roomTypes?.length ?? 0 })}</span>
                </>
              ) : data.category === "vehicle" ? (
                <>
                  <CategoryVehicleIcon size={15} strokeWidth={1.8} className="text-secondary shrink-0" />
                  <span>
                    {t("vehicleSummary", {
                      seats: data.seats || 5,
                      transmission: t(`transmission.${data.transmission === "manual" ? "manual" : "automatic"}`),
                    })}
                  </span>
                </>
              ) : data.category === "experience" ? (
                t("experienceSummary", { hours: data.durationHours || 4, type: data.type })
              ) : (
                t("homeSummary", { type: data.type, count: data.bedroomCount || 2 })
              ))}
          </div>

          <div className="pt-0.5">
            <PriceDisplay
              price={price}
              originalPrice={showTotal ? undefined : data.originalPrice}
              period={period}
            />
          </div>
        </div>

        {onAction && actionLabel && (
          <div className="pt-1 relative z-10">
            <Button disabled={disabled} small label={actionLabel} onClick={handleAction} />
          </div>
        )}
      </div>
    </div>
  );
}
