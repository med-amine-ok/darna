"use client";

import React from "react";
import { usePathname, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Search, Heart, Compass, MessageSquare, User as UserIcon } from "lucide-react";
import { User } from "@/types";
import Avatar from "@/components/Avatar";
import { useLoginModal } from "@/hook/useLoginModal";

interface BottomNavProps {
  currentUser?: User | null;
}

export default function BottomNav({ currentUser }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");
  const loginModal = useLoginModal();

  // Hide on admin routes, host mode, become-a-host flow, and active message threads
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/host") ||
    pathname?.startsWith("/become-a-host") ||
    (pathname?.startsWith("/messages/") && pathname !== "/messages")
  ) {
    return null;
  }

  const isExplore = pathname === "/" || pathname === "";
  const isWishlists = pathname === "/favorites";
  const isTrips = pathname === "/trips";
  const isMessages = pathname === "/messages";
  const isProfile = pathname === "/profile";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-tertiary/60 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] h-16 px-1.5 flex items-center justify-around select-none pb-[env(safe-area-inset-bottom)]"
    >
      {/* 1. Explore Tab */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer btn-press ${
          isExplore
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <Search
          size={20}
          strokeWidth={isExplore ? 2.4 : 1.8}
          className={`transition-transform duration-150 ${
            isExplore ? "scale-105" : ""
          }`}
        />
        <span className="text-[10px] leading-none">
          {tNav("explore") || "Explore"}
        </span>
      </button>

      {/* 2. Wishlists Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            loginModal.onOpen();
          } else {
            router.push("/favorites");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer btn-press ${
          isWishlists
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <Heart
          size={20}
          strokeWidth={isWishlists ? 2.4 : 1.8}
          className={`transition-transform duration-150 ${
            isWishlists ? "fill-accent text-accent scale-105" : ""
          }`}
        />
        <span className="text-[10px] leading-none">
          {tNav("wishlists") || "Wishlists"}
        </span>
      </button>

      {/* 3. Trips Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            loginModal.onOpen();
          } else {
            router.push("/trips");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer btn-press ${
          isTrips
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <Compass
          size={20}
          strokeWidth={isTrips ? 2.4 : 1.8}
          className={`transition-transform duration-150 ${
            isTrips ? "scale-105" : ""
          }`}
        />
        <span className="text-[10px] leading-none">
          {tNav("trips") || "Trips"}
        </span>
      </button>

      {/* 4. Messages Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            loginModal.onOpen();
          } else {
            router.push("/messages");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer btn-press ${
          isMessages
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <MessageSquare
          size={20}
          strokeWidth={isMessages ? 2.4 : 1.8}
          className={`transition-transform duration-150 ${
            isMessages ? "scale-105" : ""
          }`}
        />
        <span className="text-[10px] leading-none">
          {tNav("messages") || "Messages"}
        </span>
      </button>

      {/* 5. Profile Tab */}
      <button
        type="button"
        onClick={() => {
          if (!currentUser) {
            loginModal.onOpen();
          } else {
            router.push("/profile");
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer btn-press ${
          isProfile
            ? "text-accent font-semibold"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        {currentUser?.image ? (
          <div className="w-5 h-5 rounded-full overflow-hidden border border-tertiary">
            <Avatar src={currentUser.image} size={20} />
          </div>
        ) : (
          <UserIcon
            size={20}
            strokeWidth={isProfile ? 2.4 : 1.8}
            className={`transition-transform duration-150 ${
              isProfile ? "scale-105" : ""
            }`}
          />
        )}
        <span className="text-[10px] leading-none">
          {currentUser ? (tNav("profile") || "Profile") : (tNav("logIn") || "Log in")}
        </span>
      </button>
    </nav>
  );
}
