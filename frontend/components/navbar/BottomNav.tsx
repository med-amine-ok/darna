"use client";

import React from "react";
import { usePathname, Link } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  BrandSearchIcon,
  BrandHeartIcon,
  BrandCompassIcon,
  BrandMessageIcon,
  BrandUserIcon,
} from "@/components/icons";
import { User } from "@/types";
import Avatar from "@/components/Avatar";
import { useLoginModal } from "@/hook/useLoginModal";

interface BottomNavProps {
  currentUser?: User | null;
}

const itemBase =
  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-manipulation transition-all cursor-pointer btn-press rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";

export default function BottomNav({ currentUser }: BottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const openLogin = useLoginModal((s) => s.onOpen);

  // Hide on host mode, become-a-host flow, and active message threads
  if (
    pathname?.startsWith("/host") ||
    pathname?.startsWith("/become-a-host") ||
    (pathname?.startsWith("/messages/") && pathname !== "/messages")
  ) {
    return null;
  }

  const items = [
    { href: "/", label: t("explore"), Icon: BrandSearchIcon, active: pathname === "/" || pathname === "", requiresAuth: false },
    { href: "/favorites", label: t("wishlists"), Icon: BrandHeartIcon, active: pathname === "/favorites", requiresAuth: true },
    { href: "/trips", label: t("trips"), Icon: BrandCompassIcon, active: pathname === "/trips", requiresAuth: true },
    { href: "/messages", label: t("messages"), Icon: BrandMessageIcon, active: pathname === "/messages", requiresAuth: true },
  ];
  const isProfile = pathname === "/profile";

  const tone = (active: boolean) =>
    active ? "text-accent-700 font-semibold" : "text-neutral-600 hover:text-neutral-800";

  return (
    <nav
      aria-label={t("mobileNavigation")}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-tertiary/60 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] h-16 px-1.5 flex items-center justify-around select-none pb-[env(safe-area-inset-bottom)]"
    >
      {items.map(({ href, label, Icon, active, requiresAuth }) => {
        const icon = (
          <Icon
            size={22}
            strokeWidth={active ? 2.3 : 1.8}
            className={`transition-transform duration-150 ${active ? "scale-105" : ""} ${
              active && Icon === BrandHeartIcon ? "fill-accent text-accent" : ""
            }`}
          />
        );
        const text = <span className="text-[10px] leading-none">{label}</span>;

        if (requiresAuth && !currentUser) {
          return (
            <button key={href} type="button" onClick={openLogin} className={`${itemBase} ${tone(active)}`}>
              {icon}
              {text}
            </button>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${itemBase} ${tone(active)}`}
          >
            {icon}
            {text}
          </Link>
        );
      })}

      {/* Profile / Log in */}
      {currentUser ? (
        <Link
          href="/profile"
          aria-current={isProfile ? "page" : undefined}
          className={`${itemBase} ${tone(isProfile)}`}
        >
          {currentUser.image ? (
            <span className="w-5 h-5 rounded-full overflow-hidden border border-tertiary">
              <Avatar src={currentUser.image} size={20} />
            </span>
          ) : (
            <BrandUserIcon
              size={22}
              strokeWidth={isProfile ? 2.3 : 1.8}
              className={`transition-transform duration-150 ${isProfile ? "scale-105" : ""}`}
            />
          )}
          <span className="text-[10px] leading-none">{t("profile")}</span>
        </Link>
      ) : (
        <button type="button" onClick={openLogin} className={`${itemBase} ${tone(false)}`}>
          <BrandUserIcon size={22} strokeWidth={1.8} />
          <span className="text-[10px] leading-none">{t("logIn")}</span>
        </button>
      )}
    </nav>
  );
}
