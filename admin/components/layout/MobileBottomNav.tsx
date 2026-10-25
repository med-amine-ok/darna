"use client";

import React from "react";
import { Link, usePathname } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  ShieldCheck,
  Calendar,
  Mail,
  Menu,
} from "lucide-react";

export interface MobileBottomNavProps {
  onOpenSidebar: () => void;
  approvalsCount?: number;
  unreadMessagesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenSidebar,
  approvalsCount = 0,
  unreadMessagesCount = 3,
}) => {
  const pathname = usePathname();
  const locale = useLocale();

  const navItems = [
    {
      id: "home",
      label: locale === "ar" ? "الرئيسية" : locale === "en" ? "Home" : "Accueil",
      href: "/",
      icon: LayoutDashboard,
      isActive: pathname === "/",
    },
    {
      id: "moderation",
      label: locale === "ar" ? "المعالجة" : locale === "en" ? "Review" : "À traiter",
      href: "/moderation/providers",
      icon: ShieldCheck,
      badge: approvalsCount > 0 ? approvalsCount : undefined,
      isActive: pathname.startsWith("/moderation") || pathname.startsWith("/approvals"),
    },
    {
      id: "bookings",
      label: locale === "ar" ? "الحجوزات" : locale === "en" ? "Bookings" : "Réservations",
      href: "/bookings",
      icon: Calendar,
      isActive: pathname.startsWith("/bookings"),
    },
    {
      id: "messages",
      label: locale === "ar" ? "الرسائل" : locale === "en" ? "Messages" : "Messages",
      href: "/messages",
      icon: Mail,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      isActive: pathname.startsWith("/messages"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-tertiary/60 shadow-lg px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative ${
                item.isActive
                  ? "text-primary font-bold"
                  : "text-neutral-500 hover:text-primary active:scale-95"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    item.isActive ? "text-secondary scale-110" : ""
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -end-2 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 truncate max-w-[64px] ${
                  item.isActive ? "text-primary font-bold" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More / Menu Button to open off-canvas drawer */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open Navigation Drawer"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl text-neutral-500 hover:text-primary active:scale-95 transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">
            {locale === "ar" ? "المزيد" : locale === "en" ? "More" : "Plus"}
          </span>
        </button>
      </div>
    </nav>
  );
};
