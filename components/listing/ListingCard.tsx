"use client";

import useCountries from "@/hook/useCountries";
import { SafeReservation, SafeUser, safeListing } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "@/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import Button from "../Button";
import HeartButton from "../HeartButton";

type Props = {
  data: safeListing;
  reservation?: SafeReservation;
  onAction?: (id: string) => void;
  disabled?: boolean;
  actionLabel?: string;
  actionId?: string;
  currentUser?: SafeUser | null;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
  customHref?: string;
  onClick?: () => void;
};

function ListingCard({
  data,
  reservation,
  onAction,
  disabled,
  actionLabel,
  actionId = "",
  currentUser,
  onHover,
  isHovered = false,
  customHref,
  onClick,
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("common");
  const tCat = useTranslations("categories");
  const tListing = useTranslations("listing");
  const { getByValue } = useCountries();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const location = getByValue(data.locationValue);

  // Multi-image list for carousel
  const images = useMemo(() => {
    if (data.images && data.images.length > 0) {
      return data.images;
    }
    const base = data.imageSrc;
    const complements: Record<string, string[]> = {
      Modern: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      ],
      Beach: [
        "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
      ],
      Pools: [
        "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80",
      ],
      Countryside: [
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      ],
    };

    const extras = complements[data.category] || complements["Modern"];
    return [base, ...extras.slice(0, 3)];
  }, [data.images, data.imageSrc, data.category]);

  const handleNextImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    },
    [images.length]
  );

  const handlePrevImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
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
        // Swiped left -> next
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      } else {
        // Swiped right -> prev
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
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
    return "4.92";
  }, [data.rating]);

  const reservationDate = useMemo(() => {
    if (!reservation) {
      return null;
    }

    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);

    const formatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }, [reservation, locale]);

  let categoryLabel = data.category;
  try {
    categoryLabel = tCat(data.category as any);
  } catch {
    categoryLabel = data.category;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      onMouseEnter={() => onHover?.(data.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => {
        if (onClick) {
          onClick();
        } else if (customHref) {
          router.push(customHref);
        } else {
          router.push(`/listings/${data.id}`);
        }
      }}
      className={`col-span-1 cursor-pointer group select-none transition-all duration-200 ${
        isHovered ? "ring-2 ring-neutral-900 ring-offset-2 rounded-xl" : ""
      }`}
    >
      <div className="flex flex-col gap-2 w-full">
        {/* Image Container with aspect-square and rounded-xl (~12px) */}
        <div
          className="aspect-square w-full relative overflow-hidden rounded-xl bg-neutral-100"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            fill
            className="object-cover h-full w-full group-hover:scale-105 transition duration-300"
            src={images[currentImageIndex] || data.imageSrc}
            alt={data.title}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
          />

          {/* Heart/Wishlist Button */}
          <div className="absolute top-2.5 end-2.5 z-10">
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>

          {/* Guest Favorite Badge */}
          {data.isGuestFavorite && (
            <div className="absolute top-2.5 start-2.5 z-10 bg-white/95 backdrop-blur-xs text-neutral-900 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {tListing("guestFavorite")}
            </div>
          )}

          {/* Desktop Hover Carousel Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={handlePrevImage}
                className="hidden group-hover:flex items-center justify-center p-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition absolute top-1/2 -translate-y-1/2 z-10 start-2 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MdChevronLeft size={18} className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={handleNextImage}
                className="hidden group-hover:flex items-center justify-center p-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition absolute top-1/2 -translate-y-1/2 z-10 end-2 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MdChevronRight size={18} className="rtl:rotate-180" />
              </button>
            </>
          )}

          {/* Carousel Dots Indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
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
          {/* Row 1: Title/Location + Star Rating */}
          <div className="flex items-center justify-between gap-1 text-[15px] font-semibold text-neutral-900">
            <span className="truncate">
              {location?.region ? `${location.region}, ` : ""}{location?.label || data.title}
            </span>
            <span className="flex items-center gap-1 font-semibold flex-shrink-0 ms-1 text-sm text-neutral-900">
              <span className="text-xs">★</span>
              <span>{rating}</span>
              {data.reviewCount ? (
                <span className="font-normal text-neutral-500 text-xs">({data.reviewCount})</span>
              ) : null}
            </span>
          </div>

          {/* Row 2: Subtitle (Property type or dates) */}
          <div className="font-normal text-neutral-500 text-xs sm:text-sm truncate">
            {reservationDate || data.subtitle || `${categoryLabel} · ${data.roomCount} ${data.roomCount === 1 ? t("room") : t("rooms")}`}
          </div>

          {/* Row 3: Price */}
          <div className="flex items-baseline gap-1.5 text-sm text-neutral-900 pt-0.5">
            {data.originalPrice && (
              <span className="line-through text-neutral-400 text-xs font-normal">
                ${data.originalPrice}
              </span>
            )}
            <span className="font-bold">${price}</span>
            {!reservation && (
              <span className="font-normal text-neutral-500 text-xs sm:text-sm">
                / {t("night")}
              </span>
            )}
          </div>
        </div>

        {/* Cancel / Action Button */}
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
    </motion.div>
  );
}

export default ListingCard;
