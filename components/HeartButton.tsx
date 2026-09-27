"use client";

import useFavorite from "@/hook/useFavorite";
import { SafeUser } from "@/types";
import React from "react";

type Props = {
  listingId: string;
  currentUser?: SafeUser | null;
  variant?: "overlay" | "circle";
};

function HeartButton({ listingId, currentUser, variant = "overlay" }: Props) {
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
        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          aria-hidden="true"
          role="presentation"
          focusable="false"
          className={`w-4 h-4 transition-colors duration-150 ${
            hasFavorite
              ? "fill-accent stroke-accent"
              : "fill-transparent stroke-neutral-700 hover:stroke-primary"
          }`}
          style={{
            strokeWidth: 2.5,
            overflow: "visible",
          }}
        >
          <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05A6.98 6.98 0 0 0 9 4a6.98 6.98 0 0 0-7 7c0 7 7 12.27 14 17z" />
        </svg>
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        aria-hidden="true"
        role="presentation"
        focusable="false"
        className={`w-6 h-6 transition-colors duration-150 ${
          hasFavorite
            ? "fill-accent stroke-accent"
            : "fill-black/50 stroke-white hover:fill-black/60"
        }`}
        style={{
          strokeWidth: 2.2,
          overflow: "visible",
        }}
      >
        <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05A6.98 6.98 0 0 0 9 4a6.98 6.98 0 0 0-7 7c0 7 7 12.27 14 17z" />
      </svg>
    </button>
  );
}

export default HeartButton;
