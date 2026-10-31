"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import useFavorite from "@/hook/useFavorite";
import { User } from "@/types";
import { BrandHeartIcon } from "@/components/icons";
import { spring } from "@/lib/motion";

interface HeartButtonProps {
  listingId: string;
  currentUser?: User | null;
  variant?: "overlay" | "circle";
}

const BURST_ANGLES = [0, 60, 120, 180, 240, 300];

/** Wishlist toggle with a spring pop and a small terracotta burst when saving. */
export default function HeartButton({ listingId, currentUser, variant = "overlay" }: HeartButtonProps) {
  const { hasFavorite, toggleFavorite } = useFavorite({ listingId, currentUser });
  const t = useTranslations("common");
  const reduceMotion = useReducedMotion();
  // Bumped on every click; the icon only animates after a user toggle (never on first render).
  const [burstKey, setBurstKey] = useState(0);
  const [toggles, setToggles] = useState(0);
  const label = hasFavorite ? t("removeFromFavorites") : t("addToFavorites");

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!hasFavorite) setBurstKey((k) => k + 1);
    setToggles((n) => n + 1);
    toggleFavorite(e);
  };

  const isCircle = variant === "circle";

  return (
    <m.button
      type="button"
      aria-label={label}
      aria-pressed={hasFavorite}
      onClick={onClick}
      whileTap={{ scale: 0.82 }}
      whileHover={{ scale: 1.08 }}
      transition={spring.press}
      className={`relative flex items-center justify-center rounded-full cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
        isCircle ? "w-9 h-9 glass-chip shadow-e2" : "w-10 h-10"
      }`}
    >
      <m.span
        key={`${hasFavorite ? "on" : "off"}-${toggles}`}
        initial={reduceMotion || toggles === 0 ? false : { scale: hasFavorite ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={spring.pop}
        className="relative flex"
      >
        <BrandHeartIcon
          size={isCircle ? 18 : 24}
          strokeWidth={2}
          filled={hasFavorite}
          className={`transition-colors duration-fast ease-standard ${
            hasFavorite
              ? "fill-accent-500 text-accent-500 drop-shadow-[0_2px_6px_rgba(182,86,52,0.45)]"
              : isCircle
                ? "text-primary-800"
                : "text-white fill-primary-900/30 drop-shadow-[0_1px_3px_rgba(30,38,31,0.45)]"
          }`}
        />
      </m.span>

      {/* Burst: six dots flying out once when the listing is saved. */}
      <AnimatePresence>
        {!reduceMotion && burstKey > 0 && hasFavorite && (
          <m.span key={burstKey} aria-hidden="true" className="pointer-events-none absolute inset-0" initial="from" animate="to" exit={{ opacity: 0 }}>
            {BURST_ANGLES.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <m.span
                  key={deg}
                  className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-accent-400"
                  variants={{
                    from: { x: 0, y: 0, opacity: 1, scale: 1 },
                    to: { x: Math.cos(rad) * 20, y: Math.sin(rad) * 20, opacity: 0, scale: 0.4 },
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              );
            })}
          </m.span>
        )}
      </AnimatePresence>
    </m.button>
  );
}
