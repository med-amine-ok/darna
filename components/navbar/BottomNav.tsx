"use client";

import React from "react";
import { usePathname, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { BiSearch, BiUserCircle } from "react-icons/bi";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { SafeUser } from "@/types";
import useLoginModel from "@/hook/useLoginModal";
import Avatar from "../Avatar";

interface BottomNavProps {
  currentUser?: SafeUser | null;
}

export default function BottomNav({ currentUser }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const loginModal = useLoginModel();

  // Hide on admin routes, become-a-host flow, listing detail pages (where mobile reserve bar is active), login page, and active message threads
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/become-a-host") ||
    pathname?.includes("/listings/") ||
    pathname?.endsWith("/login") ||
    pathname?.startsWith("/messages")
  ) {
    return null;
  }

  const isExplore = pathname === "/" || pathname === "";
  const isWishlists = pathname === "/favorites";
  const isProfile = pathname === "/trips" || pathname === "/login";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] h-16 px-4 flex items-center justify-around select-none pb-[env(safe-area-inset-bottom)]"
    >
      {/* 1. Explore Tab */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] touch-manipulation transition-all cursor-pointer ${
          isExplore
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <BiSearch
          size={24}
          className={`transition-transform duration-150 ${
            isExplore ? "scale-110" : ""
          }`}
        />
        <span className="text-[10px] sm:text-xs leading-none">
          {t("explore")}
        </span>
      </button>

      {/* 2. Wishlists Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            router.push("/login");
          } else {
            router.push("/favorites");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] touch-manipulation transition-all cursor-pointer ${
          isWishlists
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        {isWishlists ? (
          <AiFillHeart size={24} className="text-accent scale-110" />
        ) : (
          <AiOutlineHeart size={24} />
        )}
        <span className="text-[10px] sm:text-xs leading-none">
          {t("wishlists")}
        </span>
      </button>

      {/* 3. Log in / Profile Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            router.push("/login");
          } else {
            router.push("/trips");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] touch-manipulation transition-all cursor-pointer ${
          isProfile
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        {currentUser?.image ? (
          <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-300">
            <Avatar src={currentUser.image} userName={currentUser.name} />
          </div>
        ) : (
          <BiUserCircle
            size={24}
            className={`transition-transform duration-150 ${
              isProfile ? "scale-110" : ""
            }`}
          />
        )}
        <span className="text-[10px] sm:text-xs leading-none">
          {currentUser ? t("profile") : t("logIn")}
        </span>
      </button>
    </nav>
  );
}
