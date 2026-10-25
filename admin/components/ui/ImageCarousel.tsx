"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, MoreHorizontal, Maximize2 } from "lucide-react";

export interface ImageCarouselProps {
  images: string[];
  statusBadge?: React.ReactNode;
  onClose?: () => void;
  onMoreOptions?: () => void;
  alt?: string;
  className?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images = [],
  statusBadge,
  onClose,
  onMoreOptions,
  alt = "Image",
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const safeImages = images.length > 0 ? images : ["/assets/template.jpeg"];
  const total = safeImages.length;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <div className={`relative w-full h-52 sm:h-56 bg-neutral-900 overflow-hidden select-none group ${className}`}>
        {/* Main Image */}
        <Image
          src={safeImages[currentIndex]}
          alt={`${alt} ${currentIndex + 1}/${total}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-102"
        />

        {/* Top Floating Controls */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
          <div className="pointer-events-auto">{statusBadge}</div>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer"
              title="Agrandir l'image"
              aria-label="Agrandir l'image"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            {onMoreOptions && (
              <button
                type="button"
                onClick={onMoreOptions}
                className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer"
                title="Options"
                aria-label="Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer"
                title="Fermer le panneau"
                aria-label="Fermer le panneau"
              >
                <X className="w-4 h-4" />
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
              className="absolute start-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer z-10"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer z-10"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </>
        )}

        {/* Counter Badge at bottom right */}
        <div className="absolute bottom-2.5 end-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-semibold tabular-nums backdrop-blur-xs z-10">
          {currentIndex + 1}/{total}
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 end-4 w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center transition cursor-pointer"
            aria-label="Fermer l'aperçu"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full h-[70vh]"
          >
            <Image
              src={safeImages[currentIndex]}
              alt={alt}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};
