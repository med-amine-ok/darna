"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  X,
  MoreHorizontal,
  Maximize2,
} from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { formatNumber } from "@/lib/utils/format";
import { listingImages, type PlaceholderKind } from "@/lib/placeholders";

export interface ImageCarouselProps {
  images: string[];
  statusBadge?: React.ReactNode;
  onClose?: () => void;
  onMoreOptions?: () => void;
  alt?: string;
  className?: string;
  /** Branded placeholder used when there is no real photo (generic icon / legacy path). */
  placeholderKind?: PlaceholderKind;
}

// Glass controls over imagery (white, frosted, e2), readable on photos and on the sand placeholder.
const overlayButton =
  "w-8 h-8 rounded-full glass-light text-primary-900 shadow-e2 hover:bg-white flex items-center justify-center transition-[background-color,transform] duration-fast ease-standard active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images = [],
  statusBadge,
  onClose,
  onMoreOptions,
  alt,
  className = "",
  placeholderKind = "stay",
}) => {
  const t = useTranslations("uiKit.carousel");
  const tUi = useTranslations("ui");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const uid = useId();
  const lightboxTitleId = `${uid}-lightbox-title`;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const safeImages = listingImages(images, placeholderKind);
  const total = safeImages.length;
  const baseAlt = alt || t("defaultAlt");
  const index = Math.min(currentIndex, total - 1);
  const altText = t("imageAlt", {
    alt: baseAlt,
    current: formatNumber(index + 1, locale),
    total: formatNumber(total, locale),
  });

  const goPrev = useCallback(
    () => setCurrentIndex((prev) => (prev <= 0 ? total - 1 : prev - 1)),
    [total],
  );
  const goNext = useCallback(
    () => setCurrentIndex((prev) => (prev >= total - 1 ? 0 : prev + 1)),
    [total],
  );
  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);

  const lightboxRef = useDialogA11y<HTMLDivElement>(isLightboxOpen, {
    onEscape: closeLightbox,
  });

  // Arrow-key navigation inside the lightbox (mirrored in RTL).
  useEffect(() => {
    if (!isLightboxOpen || total < 2) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isRtl) goNext();
        else goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isRtl) goPrev();
        else goNext();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen, total, isRtl, goPrev, goNext]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    goPrev();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    goNext();
  };

  const counterLabel = t("counter", {
    current: formatNumber(index + 1, locale),
    total: formatNumber(total, locale),
  });

  return (
    <>
      <div
        className={`relative w-full h-52 sm:h-56 bg-tertiary-100 overflow-hidden select-none group ${className}`}
      >
        {/* Main Image */}
        <Image
          src={safeImages[index]}
          alt={altText}
          fill
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
        />

        {/* Top Floating Controls */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
          <div className="pointer-events-auto">{statusBadge}</div>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              aria-haspopup="dialog"
              className={overlayButton}
              title={t("enlarge")}
              aria-label={t("enlarge")}
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {onMoreOptions && (
              <button
                type="button"
                onClick={onMoreOptions}
                className={overlayButton}
                title={tUi("moreOptions")}
                aria-label={tUi("moreOptions")}
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={overlayButton}
                title={tUi("closePanel")}
                aria-label={tUi("closePanel")}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className={`absolute start-2.5 top-1/2 -translate-y-1/2 z-10 ${overlayButton}`}
              aria-label={t("previous")}
            >
              <ChevronLeft
                className="w-4 h-4 rtl:rotate-180"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`absolute end-2.5 top-1/2 -translate-y-1/2 z-10 ${overlayButton}`}
              aria-label={t("next")}
            >
              <ChevronRight
                className="w-4 h-4 rtl:rotate-180"
                aria-hidden="true"
              />
            </button>
          </>
        )}

        {/* Counter Badge at bottom end */}
        <div
          className="absolute bottom-2.5 end-2.5 px-2 py-0.5 rounded-full glass-light text-primary-900 shadow-e1 text-[11px] font-semibold tabular-nums z-10"
          aria-live="polite"
        >
          <span aria-hidden="true">
            {formatNumber(index + 1, locale)}/{formatNumber(total, locale)}
          </span>
          <span className="sr-only">{counterLabel}</span>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-primary-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            ref={lightboxRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={lightboxTitleId}
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <h2 id={lightboxTitleId} className="sr-only">
              {t("preview")} – {counterLabel}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/15 text-white hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors duration-fast cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={t("closePreview")}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute start-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors duration-fast cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={t("previous")}
                >
                  <ChevronLeft
                    className="w-5 h-5 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute end-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors duration-fast cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={t("next")}
                >
                  <ChevronRight
                    className="w-5 h-5 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </button>
              </>
            )}

            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] w-full h-[70vh] animate-in fade-in zoom-in-95 duration-200"
            >
              <Image
                src={safeImages[index]}
                alt={altText}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
