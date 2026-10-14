"use client";

import React from "react";
import useFavorite from "@/hook/useFavorite";
import { User } from "@/types";
import { BrandHeartIcon } from "@/components/icons";

interface HeartButtonProps {
  listingId: string;
  currentUser?: User | null;
  variant?: "overlay" | "circle";
}

export default function HeartButton({
  listingId,
  currentUser,
  variant = "overlay",
}: HeartButtonProps) {
  const { hasFavorite, toggleFavorite } = useFavorite({
    listingId,
    currentUser,
  });

  if (variant === "circle") {
    return (
      <button
        type="button"
        aria-label="Save listing"
        onClick={toggleFavorite}
        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
      >
        <BrandHeartIcon
          size={18}
          strokeWidth={2.2}
          filled={hasFavorite}
          className={`transition-colors duration-150 ${
            hasFavorite
              ? "fill-accent text-accent"
              : "text-neutral-700 hover:text-primary"
          }`}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Save listing"
      onClick={toggleFavorite}
      className="relative hover:scale-110 active:scale-90 transition-transform duration-150 cursor-pointer p-1 rounded-full touch-manipulation focus:outline-none select-none flex items-center justify-center"
    >
      <BrandHeartIcon
        size={24}
        strokeWidth={2.2}
        filled={hasFavorite}
        className={`transition-colors duration-150 ${
          hasFavorite
            ? "fill-accent text-accent drop-shadow-sm"
            : "text-white fill-black/35 hover:fill-black/55 drop-shadow-sm"
        }`}
      />
    </button>
  );
}

