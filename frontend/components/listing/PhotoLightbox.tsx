"use client";

import React, { useEffect, useId } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { BrandCloseIcon, BrandChevronLeftIcon, BrandChevronRightIcon } from "@/components/icons";

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Listing title, used in the dialog label. */
  title: string;
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

/**
 * Full-screen photo viewer: modal dialog with focus trap, Escape to close and
 * ←/→ to browse (mirrored in RTL so the arrow keys follow the reading direction).
 */
export default function PhotoLightbox({ isOpen, onClose, images, index, onIndexChange, title }: PhotoLightboxProps) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const titleId = useId();
  const panelRef = useDialogA11y<HTMLDivElement>(isOpen, { onEscape: onClose });
  const count = images.length;

  useEffect(() => {
    if (!isOpen || count < 2) return;
    const rtl = locale === "ar";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const forward = (e.key === "ArrowRight") !== rtl;
      onIndexChange(forward ? (index + 1) % count : (index - 1 + count) % count);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, index, count, locale, onIndexChange]);

  if (!isOpen || count === 0) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between p-4 sm:p-6"
    >
      <h2 id={titleId} className="sr-only">
        {t("galleryTitle", { title })}
      </h2>

      {/* Top Bar */}
      <div className="flex items-center justify-between text-white z-10">
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer ${focusRing}`}
        >
          <BrandCloseIcon size={20} strokeWidth={2.2} />
          <span className="text-xs sm:text-sm font-semibold">{t("closeGallery")}</span>
        </button>
        <span className="text-xs sm:text-sm font-semibold" aria-live="polite">
          {t("photoCount", { current: index + 1, total: count })}
        </span>
      </div>

      {/* Active Image */}
      <div className="relative flex-1 w-full max-w-5xl mx-auto my-4 flex items-center justify-center">
        <Image
          src={images[index]}
          alt={t("photoAlt", { title, number: index + 1, total: count })}
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-contain"
        />

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label={t("previousPhoto")}
              onClick={() => onIndexChange((index - 1 + count) % count)}
              className={`absolute start-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer ${focusRing}`}
            >
              <BrandChevronLeftIcon size={28} strokeWidth={2.2} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-label={t("nextPhoto")}
              onClick={() => onIndexChange((index + 1) % count)}
              className={`absolute end-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer ${focusRing}`}
            >
              <BrandChevronRightIcon size={28} strokeWidth={2.2} className="rtl:rotate-180" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnails */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-2" role="group" aria-label={t("thumbnails")}>
        {images.map((img, idx) => (
          <button
            key={`${img}-${idx}`}
            type="button"
            aria-label={t("showPhoto", { number: idx + 1 })}
            aria-current={idx === index ? "true" : undefined}
            onClick={() => onIndexChange(idx)}
            className={`relative w-16 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition ${focusRing} ${
              idx === index ? "border-accent scale-105" : "border-transparent opacity-60"
            }`}
          >
            <Image src={img} alt="" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
