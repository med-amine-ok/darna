"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { dur, ease } from "@/lib/motion";
import {
  BrandCloseIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandGridIcon,
  BrandSearchIcon,
} from "@/components/icons";

export interface PhotoGroup {
  id: string;
  label: string;
  images: string[];
}

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  /** Flat list of photos. When `groups` is set it must be the groups flattened in order. */
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Listing title, used in the dialog label. */
  title: string;
  /** Photo tour sections (Overview, then one per room type). */
  groups?: PhotoGroup[];
  /** Open on the grouped photo tour instead of the single-photo viewer. */
  startInTour?: boolean;
}

const ctrl =
  "inline-flex items-center justify-center gap-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-fast ease-standard cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

/**
 * Full-screen photo viewer on ink. Two views:
 * - tour: every photo grouped by space (Airbnb hotel pattern), with jump chips;
 * - viewer: one photo, thumbnails, swipe, arrow keys (mirrored in RTL), tap to zoom / fit.
 * Modal dialog: focus trap, Escape (viewer → tour → close), scroll lock, focus restore.
 */
export default function PhotoLightbox({
  isOpen,
  onClose,
  images,
  index,
  onIndexChange,
  title,
  groups,
  startInTour = false,
}: PhotoLightboxProps) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const rtl = locale === "ar";
  const titleId = useId();
  const count = images.length;
  const hasTour = count > 1;
  const [view, setView] = useState<"tour" | "viewer">(startInTour && hasTour ? "tour" : "viewer");
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState(1);
  const touchX = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const tourRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (isOpen) {
      setView(startInTour && hasTour ? "tour" : "viewer");
      setZoomed(false);
    }
  }, [isOpen, startInTour, hasTour]);

  const panelRef = useDialogA11y<HTMLDivElement>(isOpen, {
    onEscape: () => {
      if (zoomed) setZoomed(false);
      else if (view === "viewer" && startInTour && hasTour) setView("tour");
      else onClose();
    },
  });

  const sections: PhotoGroup[] = useMemo(
    () => (groups && groups.length > 0 ? groups : [{ id: "all", label: t("tour.overview"), images }]),
    [groups, images, t]
  );
  const groupOf = (flatIndex: number) => {
    let offset = 0;
    for (const g of sections) {
      if (flatIndex < offset + g.images.length) return g;
      offset += g.images.length;
    }
    return sections[0];
  };

  const go = (next: number) => {
    setZoomed(false);
    setDirection(next > index || (index === count - 1 && next === 0) ? 1 : -1);
    onIndexChange((next + count) % count);
  };

  useEffect(() => {
    if (!isOpen || view !== "viewer" || count < 2) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const forward = (e.key === "ArrowRight") !== rtl;
      setZoomed(false);
      setDirection(forward ? 1 : -1);
      onIndexChange(forward ? (index + 1) % count : (index - 1 + count) % count);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, view, index, count, rtl, onIndexChange]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    if (view !== "viewer") return;
    const el = thumbsRef.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index, view]);

  if (!mounted) return null;

  const openAt = (flatIndex: number) => {
    setDirection(1);
    onIndexChange(flatIndex);
    setZoomed(false);
    setView("viewer");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (zoomed) return;
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 50) return;
    // Swiping toward the reading start shows the next photo.
    const forward = (dx < 0) !== rtl;
    go(forward ? index + 1 : index - 1);
  };

  const toggleZoom = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!zoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setOrigin(`${Number.isFinite(x) ? x : 50}% ${Number.isFinite(y) ? y : 50}%`);
    }
    setZoomed((z) => !z);
  };

  const currentGroup = groupOf(index);
  let flatOffset = 0;

  return createPortal(
    <AnimatePresence>
      {isOpen && count > 0 && (
        <m.div
          key="lightbox"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: dur.base, ease: ease.out } }}
          exit={{ opacity: 0, transition: { duration: dur.fast } }}
          className="fixed inset-0 z-[100] bg-primary-900 text-white flex flex-col"
        >
          <h2 id={titleId} className="sr-only">
            {t("galleryTitle", { title })}
          </h2>

          {view === "tour" ? (
            <div ref={tourRef} className="flex-1 overflow-y-auto overscroll-contain">
              <div className="sticky top-0 z-10 bg-primary-900/90 backdrop-blur-md border-b border-white/10">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                  <button type="button" onClick={onClose} className={`${ctrl} h-10 ps-3 pe-4 text-sm font-semibold`}>
                    <BrandCloseIcon size={18} />
                    <span>{t("closeGallery")}</span>
                  </button>
                  <p className="text-meta text-white/80 tabular-nums">{t("tour.photosCount", { count })}</p>
                </div>
                {sections.length > 1 && (
                  <nav aria-label={t("tour.sections")} className="mx-auto max-w-5xl px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
                    {sections.map((g) => (
                      <a
                        key={g.id}
                        href={`#tour-${g.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`tour-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={`${ctrl} shrink-0 h-9 px-4 text-meta font-semibold whitespace-nowrap`}
                      >
                        {g.label}
                      </a>
                    ))}
                  </nav>
                )}
              </div>

              <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-12">
                <p className="font-serif text-display-md text-white">{title}</p>
                {sections.map((g) => {
                  const start = flatOffset;
                  flatOffset += g.images.length;
                  return (
                    <section key={g.id} id={`tour-${g.id}`} aria-labelledby={`tour-h-${g.id}`} className="scroll-mt-32 grid gap-5 md:grid-cols-[14rem_1fr]">
                      <div>
                        <h3 id={`tour-h-${g.id}`} className="font-serif text-heading text-white">
                          {g.label}
                        </h3>
                        <p className="mt-1 text-meta text-white/70">{t("tour.photosCount", { count: g.images.length })}</p>
                      </div>
                      <ul className="grid grid-cols-2 gap-2">
                        {g.images.map((src, i) => (
                          <li key={`${src}-${i}`} className={i % 3 === 0 ? "col-span-2" : ""}>
                            <button
                              type="button"
                              onClick={() => openAt(start + i)}
                              aria-label={t("openPhoto", { number: start + i + 1, total: count })}
                              className={`group relative block w-full overflow-hidden rounded-2xl bg-primary-800 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                i % 3 === 0 ? "aspect-[16/10]" : "aspect-[4/3]"
                              }`}
                            >
                              <Image
                                src={src}
                                alt=""
                                fill
                                sizes={i % 3 === 0 ? "(max-width: 768px) 100vw, 720px" : "(max-width: 768px) 50vw, 360px"}
                                className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3">
                {startInTour && hasTour ? (
                  <button type="button" onClick={() => setView("tour")} className={`${ctrl} h-10 ps-3 pe-4 text-sm font-semibold`}>
                    <BrandGridIcon size={16} />
                    <span>{t("tour.backToTour")}</span>
                  </button>
                ) : (
                  <button type="button" onClick={onClose} className={`${ctrl} h-10 ps-3 pe-4 text-sm font-semibold`}>
                    <BrandCloseIcon size={18} />
                    <span>{t("closeGallery")}</span>
                  </button>
                )}
                <p className="min-w-0 text-center text-meta text-white/85" aria-live="polite">
                  {sections.length > 1 && <span className="font-semibold text-white">{currentGroup.label} · </span>}
                  <span className="tabular-nums">{t("photoCount", { current: index + 1, total: count })}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomed((z) => !z)}
                    aria-pressed={zoomed}
                    aria-label={zoomed ? t("tour.zoomOut") : t("tour.zoomIn")}
                    className={`${ctrl} w-10 h-10 hidden sm:inline-flex`}
                  >
                    <BrandSearchIcon size={17} />
                  </button>
                  {startInTour && hasTour && (
                    <button type="button" onClick={onClose} aria-label={t("closeGallery")} className={`${ctrl} w-10 h-10`}>
                      <BrandCloseIcon size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Active photo */}
              <div
                className="relative flex-1 min-h-0 my-3 sm:my-4 overflow-hidden rounded-2xl"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <m.div
                    key={index}
                    custom={direction}
                    initial={{ opacity: 0, x: (rtl ? -1 : 1) * direction * 40 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: dur.base, ease: ease.out } }}
                    exit={{ opacity: 0, x: (rtl ? 1 : -1) * direction * 40, transition: { duration: dur.fast } }}
                    className="absolute inset-0"
                  >
                    <button
                      type="button"
                      onClick={toggleZoom}
                      aria-label={zoomed ? t("tour.zoomOut") : t("tour.zoomIn")}
                      className={`relative block w-full h-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-2xl ${
                        zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                      }`}
                    >
                      <Image
                        src={images[index]}
                        alt={t("photoAlt", { title, number: index + 1, total: count })}
                        fill
                        sizes="(max-width: 1280px) 100vw, 1280px"
                        style={{ transformOrigin: origin }}
                        className={`object-contain transition-transform duration-slow ease-out ${zoomed ? "scale-[2]" : "scale-100"}`}
                      />
                    </button>
                  </m.div>
                </AnimatePresence>

                {count > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label={t("previousPhoto")}
                      onClick={() => go(index - 1)}
                      className={`${ctrl} absolute start-2 sm:start-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 bg-primary-900/50 backdrop-blur-sm`}
                    >
                      <BrandChevronLeftIcon size={24} className="rtl:rotate-180" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("nextPhoto")}
                      onClick={() => go(index + 1)}
                      className={`${ctrl} absolute end-2 sm:end-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 bg-primary-900/50 backdrop-blur-sm`}
                    >
                      <BrandChevronRightIcon size={24} className="rtl:rotate-180" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {count > 1 && (
                <div
                  ref={thumbsRef}
                  className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 sm:justify-center"
                  role="group"
                  aria-label={t("thumbnails")}
                >
                  {images.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      data-thumb={idx}
                      aria-label={t("showPhoto", { number: idx + 1 })}
                      aria-current={idx === index ? "true" : undefined}
                      onClick={() => go(idx)}
                      className={`relative w-16 h-12 shrink-0 rounded-xl overflow-hidden transition duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        idx === index ? "ring-2 ring-accent-400 opacity-100" : "opacity-50 hover:opacity-90"
                      }`}
                    >
                      <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
