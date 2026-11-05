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
import { cn } from "@/components/ui/cn";
import { listingHref, priceSuffixKey } from "./cardLabels";
import { experienceTypeLabel } from "@/lib/catalog-types";
import {
  BrandStarIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandCalendarIcon,
  BrandLightningIcon,
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
  /** Highlighted from outside (e.g. its map pin is hovered or selected). */
  isHovered?: boolean;
  /** Called instead of navigating when the card is activated. */
  onClick?: () => void;
  customHref?: string;
  /** Preload the first photo (cards above the fold). */
  priority?: boolean;
}

/** Most dots shown under the photo; longer galleries slide a window of dots (Airbnb pattern). */
const MAX_DOTS = 5;

/**
 * Listing card (search, home grids, favorites, profiles) in the pilot editorial style:
 * 20:19 photo with 20px radius and sand placeholder, swipeable photo carousel whose arrows and
 * dots fade in on hover/focus, glass "Guest favourite" badge, heart, rating, and price with the
 * unit suffix (or the total for the searched dates). The whole card is one stretched link.
 */
export default function ListingCard({
  data,
  reservation,
  onAction,
  disabled,
  actionLabel,
  actionId = "",
  currentUser,
  onHover,
  isHovered = false,
  onClick,
  customHref,
  priority = false,
}: ListingCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const tNav = useTranslations("nav");
  const tSearch = useTranslations("search");
  const tCommon = useTranslations("common");
  const t = useTranslations("listing");

  const images = useMemo(() => {
    const list = (Array.isArray(data.imageSrc) ? data.imageSrc : [data.imageSrc]).filter(Boolean);
    return list.length > 0 ? list : ["/assets/template.jpeg"];
  }, [data.imageSrc]);

  const [index, setIndex] = useState(0);
  // Photos load lazily: a slide is mounted once it has been (or is about to be) shown.
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0, 1]));
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const gestureStartX = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      const n = (next + images.length) % images.length;
      setIndex(n);
      setVisited((prev) => {
        if (prev.has(n) && prev.has((n + 1) % images.length)) return prev;
        const copy = new Set(prev);
        copy.add(n);
        copy.add((n + 1) % images.length);
        return copy;
      });
    },
    [images.length]
  );

  const step = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    goTo(index + dir);
  };

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
    if (Math.abs(e.clientX - gestureStartX.current) > 8) didDragRef.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (gestureStartX.current === null) return;
    const diff = gestureStartX.current - e.clientX;
    if (images.length > 1 && Math.abs(diff) > 35) {
      // Swipe toward the reading direction's end shows the next photo.
      const forward = isRtl ? diff < 0 : diff > 0;
      goTo(index + (forward ? 1 : -1));
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
    if (reservation) return reservation.totalPrice;
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

  const summary =
    reservationDate ||
    (hasRoomTypes
      ? `${data.businessCategory === "hostel" ? t("hostel") : t("hotel")} · ${t("unitTypes", { count: data.roomTypes?.length ?? 0 })}`
      : data.category === "vehicle"
        ? t("vehicleSummary", {
            seats: data.seats || 5,
            transmission: t(`transmission.${data.transmission === "manual" ? "manual" : "automatic"}`),
          })
        : data.category === "experience"
          ? t("experienceSummary", { hours: data.durationHours || 4, type: experienceTypeLabel(data.experienceType, locale) || data.type })
          : t("homeSummary", { type: data.type, count: data.bedroomCount || 2 }));

  // Sliding window of dots for long galleries.
  const dotCount = Math.min(images.length, MAX_DOTS);
  const dotStart = Math.min(Math.max(0, index - Math.floor(MAX_DOTS / 2)), Math.max(0, images.length - MAX_DOTS));

  const arrowClass = cn(
    "absolute top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full",
    "bg-white/90 text-primary-900 shadow-e2 cursor-pointer",
    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden",
    "transition-[opacity,transform,background-color] duration-fast ease-standard hover:bg-white hover:scale-105 active:scale-95",
    "before:absolute before:-inset-1.5 before:content-['']",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
  );

  return (
    <article
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
      className="group relative col-span-1 select-none"
    >
      <div
        ref={imageAreaRef}
        className={cn(
          "relative aspect-[20/19] w-full overflow-hidden rounded-2xl bg-tertiary-100",
          "transition-[box-shadow,transform] duration-base ease-out",
          isHovered
            ? "-translate-y-1 shadow-e3 ring-2 ring-primary-800/80 ring-offset-2 ring-offset-darnaBg"
            : "shadow-e1 group-hover:-translate-y-1 group-hover:shadow-e3"
        )}
      >
        {/* Photo track: slides by transform only; mirrors in RTL. */}
        <div
          className="absolute inset-0 flex transition-transform duration-slow ease-out motion-reduce:transition-none"
          style={{ transform: `translate3d(${(isRtl ? 1 : -1) * index * 100}%, 0, 0)` }}
        >
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="relative h-full w-full shrink-0 overflow-hidden" aria-hidden={i !== index}>
              {visited.has(i) && (
                <Image
                  fill
                  src={src}
                  alt=""
                  draggable={false}
                  priority={priority && i === 0}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1536px) 30vw, 360px"
                  className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                />
              )}
            </div>
          ))}
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary-900/25 to-transparent" />
        {images.length > 1 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-primary-900/30 to-transparent" />
        )}

        {(data.isGuestFavorite || data.instantBook) && (
          <div className="absolute top-3 start-3 z-[2] flex max-w-[calc(100%-4.5rem)] items-center gap-1.5">
            {data.isGuestFavorite ? (
              <span className="glass-chip truncate rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary-900 shadow-e1">
                {tNav("guestFavorite")}
              </span>
            ) : (
              <span className="glass-chip inline-flex items-center gap-1 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary-900 shadow-e1">
                <BrandLightningIcon size={12} strokeWidth={2} className="text-accent-600" aria-hidden="true" />
                {tSearch("instantBook")}
              </span>
            )}
          </div>
        )}

        <div className="absolute top-1.5 end-1.5 z-10">
          <HeartButton listingId={data.id} currentUser={currentUser} />
        </div>

        {images.length > 1 && (
          <>
            <button type="button" aria-label={t("previousPhoto")} onClick={step(-1)} className={cn(arrowClass, "start-2.5")}>
              <BrandChevronLeftIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
            </button>
            <button type="button" aria-label={t("nextPhoto")} onClick={step(1)} className={cn(arrowClass, "end-2.5")}>
              <BrandChevronRightIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-[2] flex items-center justify-center gap-1.5" aria-hidden="true">
              {Array.from({ length: dotCount }, (_, k) => {
                const i = dotStart + k;
                const edge = images.length > MAX_DOTS && ((k === 0 && dotStart > 0) || (k === dotCount - 1 && dotStart + MAX_DOTS < images.length));
                return (
                  <span
                    key={i}
                    className={cn(
                      "block rounded-full bg-white transition-[opacity,transform] duration-fast ease-standard",
                      edge ? "h-1 w-1" : "h-1.5 w-1.5",
                      i === index ? "scale-110 opacity-100 shadow-e1" : "opacity-60"
                    )}
                  />
                );
              })}
            </div>
            <span className="sr-only" aria-live="polite">
              {t("photoCount", { current: index + 1, total: images.length })}
            </span>
          </>
        )}
      </div>

      <div className="space-y-0.5 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[0.9375rem] font-semibold leading-snug text-primary-900 line-clamp-1">
            {/* Stretched link: its ::after covers the whole card. */}
            <Link
              href={href}
              onClick={handleLinkClick}
              draggable={false}
              className="rounded after:absolute after:inset-0 after:z-[1] after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-600 focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-darnaBg"
            >
              {data.title}
            </Link>
          </h3>
          <span className="flex shrink-0 items-center gap-1 pt-0.5 text-meta font-semibold tabular-nums text-primary-800">
            {rating ? (
              <>
                <BrandStarIcon size={13} className="text-accent-600" />
                <span className="sr-only">{t("ratingLabel", { rating })}</span>
                <span aria-hidden="true">{rating}</span>
                {data.reviewCount ? (
                  <span className="font-normal text-primary-500">
                    <span aria-hidden="true">({data.reviewCount})</span>
                    <span className="sr-only">{t("reviewsCount", { count: data.reviewCount })}</span>
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-secondary-700">{t("ratingNew")}</span>
            )}
          </span>
        </div>

        {data.city && <p className="truncate text-meta text-primary-600">{t("cityCountry", { city: data.city })}</p>}
        <p className="truncate text-meta text-primary-500">{summary}</p>

        {data.matchedAvailability?.isPartial && (
          <p className="!mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/80">
            <BrandCalendarIcon size={12} strokeWidth={1.8} className="shrink-0 text-amber-700" />
            <span className="truncate">
              {tSearch("partialAvailabilityBadge", {
                range: tCommon("dateRange", {
                  start: formatDate(data.matchedAvailability.overlapStart, locale, shortDate),
                  end: formatDate(data.matchedAvailability.overlapEnd, locale, shortDate),
                }),
              })}
            </span>
          </p>
        )}

        <PriceDisplay
          price={price}
          originalPrice={showTotal ? undefined : data.originalPrice}
          period={period}
          className="pt-1"
          priceClassName="font-semibold text-[0.9375rem] text-primary-900 tabular-nums"
          eurClassName="text-meta text-primary-500 tabular-nums"
        />
      </div>

      {onAction && actionLabel && (
        <div className="relative z-10 pt-2">
          <Button disabled={disabled} small label={actionLabel} onClick={handleAction} />
        </div>
      )}
    </article>
  );
}
