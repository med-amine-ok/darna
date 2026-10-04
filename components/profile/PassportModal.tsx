"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { MdClose, MdLocationOn, MdExplore, MdVerified } from "react-icons/md";
import { useTranslations } from "next-intl";

export interface PassportStamp {
  id: string;
  name: string;
  wilaya: string;
  arabicName: string;
  image: string;
  tagline: string;
  description: string;
  highlights: string[];
  searchQuery: string;
  unlocked: boolean;
}

interface PassportModalProps {
  stamp: PassportStamp | null;
  onClose: () => void;
}

export default function PassportModal({ stamp, onClose }: PassportModalProps) {
  const router = useRouter();
  const t = useTranslations("profile.passport");

  if (!stamp) return null;

  const handleExplore = () => {
    onClose();
    router.push(`/search?destination=${encodeURIComponent(stamp.searchQuery)}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-surface rounded-3xl overflow-hidden shadow-2xl border border-tertiary/40 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Photo with Stamp Overlay */}
        <div className="relative h-56 w-full bg-neutral-900">
          <Image
            src={stamp.image}
            alt={stamp.name}
            fill
            className="object-cover opacity-90"
            sizes="(max-width: 768px) 100vw, 500px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 end-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition cursor-pointer"
          >
            <MdClose size={20} />
          </button>

          {/* Wilaya badge */}
          <div className="absolute top-4 start-4 px-3 py-1 bg-surface/90 text-primary text-xs font-bold rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-sm">
            <MdLocationOn className="text-accent" size={14} />
            <span>{stamp.wilaya}</span>
          </div>

          {/* Stamp header */}
          <div className="absolute bottom-4 start-5 end-5 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-wider uppercase text-tertiary-200 font-medium">
                {stamp.arabicName}
              </span>
              {stamp.unlocked && (
                <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/80 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                  <MdVerified size={13} />
                  <span>Collected</span>
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black tracking-tight drop-shadow-sm mt-0.5">
              {stamp.name}
            </h3>
            <p className="text-xs text-neutral-200 line-clamp-1">{stamp.tagline}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            {stamp.description}
          </p>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Authentic Experiences
            </h4>
            <div className="flex flex-wrap gap-2">
              {stamp.highlights.map((highlight, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-tertiary/20 text-primary-800 border border-tertiary/40"
                >
                  ✦ {highlight}
                </span>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExplore}
              className="px-5 py-2.5 bg-accent hover:bg-accent-600 text-white text-xs font-bold rounded-xl shadow-md shadow-accent/20 flex items-center gap-2 transition hover:scale-[1.02] cursor-pointer"
            >
              <MdExplore size={16} />
              <span>{t("exploreRegion", { region: stamp.name })}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
