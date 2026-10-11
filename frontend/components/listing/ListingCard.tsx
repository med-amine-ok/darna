"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "@/navigation";
import { Listing, Reservation, User } from "@/types";
import HeartButton from "@/components/HeartButton";
import PriceDisplay from "@/components/common/PriceDisplay";
import Button from "@/components/Button";
import { useTranslations, useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

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
  isHovered = false,
  onClick,
  customHref,
}: ListingCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const tNav = useTranslations("nav");

  const images = useMemo(() => {
    if (Array.isArray(data.imageSrc)) {
      return data.imageSrc;
    }
    return [data.imageSrc];
  }, [data.imageSrc]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setPointerStartX(e.clientX);
    didDragRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartX === null) return;
    if (Math.abs(e.clientX - pointerStartX) > 8) {
      didDragRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX === null) return;
    const diff = pointerStartX - e.clientX;
    if (images.length > 1 && Math.abs(diff) > 35) {
      if (diff > 0) {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    setPointerStartX(null);
  };

  const handleCancel = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      onAction?.(actionId);
    },
    [onAction, actionId, disabled]
  );

  const price = useMemo(() => {
    if (reservation) {
      return reservation.totalPrice;
    }
    return data.price;
  }, [reservation, data.price]);

  const rating = useMemo(() => {
    if (data.rating) {
      return data.rating.toFixed(2).replace(/\.00$/, ".0");
    }
    return "4.95";
  }, [data.rating]);

  const reservationDate = useMemo(() => {
    if (!reservation) return null;
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const formatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }, [reservation, locale]);

  const periodLabel =
    data.category === "vehicle"
      ? "/ day"
      : data.category === "experience"
      ? "/ person"
      : "/ night";

  return (
    <div
      onMouseEnter={() => onHover?.(data.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        if (onClick) {
          onClick();
        } else if (customHref) {
          router.push(customHref);
        } else if (pathname?.includes("/search")) {
          // On search split-map view, clicking the item redirects to its full detail page
          router.push(`/listings/${data.id}`);
        } else {
          // On homepage or other views, clicking the item redirects to the split map view
          const destParam = data.city ? `&destination=${encodeURIComponent(data.city)}` : "";
          const vertParam = data.category ? `&vertical=${data.category}` : "";
          router.push(`/search?selectedId=${data.id}${destParam}${vertParam}`);
        }
      }}
      className="col-span-1 cursor-pointer group select-none transition-all duration-200 card-hover-lift"
    >
      <div className="flex flex-col gap-1.5 w-full">
        {/* Image Container */}
        <div
          className="aspect-square w-full relative overflow-hidden rounded-xl bg-neutral-100 border border-tertiary/40 select-none cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setPointerStartX(null)}
        >
          <Image
            fill
            className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-300"
            src={images[currentImageIndex] || "/assets/template.jpeg"}
            alt={data.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Heart Button */}
          <div className="absolute top-2.5 end-2.5 z-10">
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>

          {/* Guest Favorite Badge */}
          {data.isGuestFavorite && (
            <div className="absolute top-2 start-2 z-10 bg-white/95 backdrop-blur-xs text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {tNav("guestFavorite") || "Guest favorite"}
            </div>
          )}

          {/* Carousel Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={handlePrevImage}
                className="hidden group-hover:flex items-center justify-center p-1.5 rounded-full bg-white/95 hover:bg-white text-neutral-800 shadow-darna transition absolute top-1/2 -translate-y-1/2 z-10 start-2 hover:scale-105 active:scale-95 cursor-pointer btn-press"
              >
                <ChevronLeft size={16} className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={handleNextImage}
                className="hidden group-hover:flex items-center justify-center p-1.5 rounded-full bg-white/95 hover:bg-white text-neutral-800 shadow-darna transition absolute top-1/2 -translate-y-1/2 z-10 end-2 hover:scale-105 active:scale-95 cursor-pointer btn-press"
              >
                <ChevronRight size={16} className="rtl:rotate-180" />
              </button>
            </>
          )}

          {/* Carousel Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-1 z-10 pointer-events-none">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`rounded-full transition-all duration-200 ${
                    idx === currentImageIndex
                      ? "bg-white w-2 h-2 shadow-xs"
                      : "bg-white/60 w-1.5 h-1.5"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-1 text-xs sm:text-sm font-semibold text-primary">
            <span className="truncate flex items-center gap-1">
              <Image
                src="/assets/location.png"
                alt="Location"
                width={13}
                height={13}
                className="object-contain shrink-0"
              />
              <span className="truncate">{data.city ? `${data.city}, Algeria` : data.title}</span>
            </span>
            <span className="flex items-center gap-0.5 font-semibold flex-shrink-0 ms-1 text-xs text-neutral-800">
              <Star size={12} className="fill-accent text-accent" />
              <span>{rating}</span>
              {data.reviewCount ? (
                <span className="font-normal text-neutral-500 text-[10px]">
                  ({data.reviewCount})
                </span>
              ) : null}
            </span>
          </div>

          <div className="font-normal text-neutral-500 text-[11px] sm:text-xs truncate flex items-center gap-1">
            {reservationDate ||
              (data.category === "vehicle" ? (
                <>
                  <Image
                    src="/assets/car.png"
                    alt="Vehicle"
                    width={14}
                    height={14}
                    className="object-contain shrink-0"
                  />
                  <span>{`${data.seats || 5} seats · ${data.transmission || "Automatic"}`}</span>
                </>
              ) : data.category === "experience" ? (
                `${data.durationHours || 4} hours · ${data.type}`
              ) : (
                `${data.type} · ${data.bedroomCount || 2} bedrooms`
              ))}
          </div>

          <div className="pt-0.5">
            <PriceDisplay
              price={price}
              originalPrice={data.originalPrice}
              period={!reservation ? periodLabel : undefined}
            />
          </div>
        </div>

        {onAction && actionLabel && (
          <div className="pt-1">
            <Button
              disabled={disabled}
              small
              label={actionLabel}
              onClick={handleCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
