"use client";

import React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { BiSearch, BiUserCircle, BiMessageSquareDetail } from "react-icons/bi";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { SafeUser } from "@/types";
import Avatar from "../Avatar";

interface BottomNavProps {
  currentUser?: SafeUser | null;
}

export default function BottomNav({ currentUser }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  // Hide on admin routes, become-a-host flow, listing detail pages (where mobile reserve bar is active), and active individual message conversation threads
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/become-a-host") ||
    pathname?.includes("/listings/") ||
    (pathname?.startsWith("/messages/") && pathname !== "/messages")
  ) {
    return null;
  }

  const isExplore = pathname === "/" || pathname === "";
  const isWishlists = pathname === "/favorites";
  const isTrips = pathname === "/trips";
  const isMessages = pathname === "/messages";
  const isProfile = pathname === "/login" || pathname === "/profile";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-tertiary/40 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] h-16 px-1.5 flex items-center justify-around select-none pb-[env(safe-area-inset-bottom)]"
    >
      {/* 1. Explore Tab */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer ${
          isExplore
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <BiSearch
          size={22}
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
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer ${
          isWishlists
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        {isWishlists ? (
          <AiFillHeart size={22} className="text-accent scale-110" />
        ) : (
          <AiOutlineHeart size={22} />
        )}
        <span className="text-[10px] sm:text-xs leading-none">
          {t("wishlists")}
        </span>
      </button>

      {/* 3. Trips Tab (DARNA Logo in solid black) */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            router.push("/login");
          } else {
            router.push("/trips");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer ${
          isTrips
            ? "text-primary font-bold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <div className="relative w-[22px] h-[22px] flex items-center justify-center">
          <Image
            src="/assets/logo.png"
            alt="Trips"
            width={22}
            height={22}
            className={`w-[22px] h-[22px] object-contain brightness-0 transition-transform duration-150 ${
              isTrips ? "scale-110 opacity-100" : "opacity-55 hover:opacity-85"
            }`}
          />
        </div>
        <span className="text-[10px] sm:text-xs leading-none">
          {t("trips")}
        </span>
      </button>

      {/* 4. Messages Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            router.push("/login");
          } else {
            router.push("/messages");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer ${
          isMessages
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <BiMessageSquareDetail
          size={22}
          className={`transition-transform duration-150 ${
            isMessages ? "scale-110" : ""
          }`}
        />
        <span className="text-[10px] sm:text-xs leading-none">
          {t("messages")}
        </span>
      </button>

      {/* 5. Profile Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            router.push("/login");
          } else {
            router.push("/profile");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer ${
          isProfile
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        {currentUser?.image ? (
          <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-300">
            <Avatar src={currentUser.image} userName={currentUser.name} />
          </div>
        ) : (
          <BiUserCircle
            size={22}
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
