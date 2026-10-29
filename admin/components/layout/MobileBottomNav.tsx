"use client";

import React from "react";
import { Link, usePathname } from "@/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCurrentAdmin } from "@/components/auth/AdminSessionProvider";
import { canAccessPath } from "@/lib/route-permissions";
import { LayoutDashboard, ShieldCheck, Calendar, Mail, Menu } from "lucide-react";

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
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const format = useFormatter();
  const permissions = useCurrentAdmin()?.permissions ?? [];

  const navItems = [
    {
      id: "home",
      label: tNav("home"),
      href: "/",
      icon: LayoutDashboard,
      isActive: pathname === "/",
    },
    {
      id: "moderation",
      label: tNav("toReview"),
      href: "/moderation/providers",
      icon: ShieldCheck,
      badge: approvalsCount > 0 ? approvalsCount : undefined,
      isActive: pathname.startsWith("/moderation") || pathname.startsWith("/approvals"),
    },
    {
      id: "bookings",
      label: tNav("bookings"),
      href: "/bookings",
      icon: Calendar,
      isActive: pathname.startsWith("/bookings"),
    },
    {
      id: "messages",
      label: tNav("messages"),
      href: "/messages",
      icon: Mail,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      isActive: pathname.startsWith("/messages"),
    },
  ];

  return (
    <nav
      aria-label={tNav("quickNavigation")}
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-tertiary/60 shadow-lg px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems
          .filter((item) => canAccessPath(item.href, permissions))
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                  item.isActive ? "text-primary font-bold" : "text-neutral-600 hover:text-primary active:scale-95"
                }`}
              >
                <div className="relative">
                  <Icon
                    aria-hidden="true"
                    className={`w-5 h-5 transition-transform ${item.isActive ? "text-secondary-700 scale-110" : ""}`}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -end-2 min-w-[16px] h-4 px-1 rounded-full bg-accent-700 text-white text-[10px] font-bold flex items-center justify-center leading-none"
                    >
                      {item.badge > 99 ? `${format.number(99)}+` : format.number(item.badge)}
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
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="sr-only">{tSidebar("pendingBadge", { count: item.badge })}</span>
                )}
              </Link>
            );
          })}

        {/* More / Menu Button to open off-canvas drawer */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-haspopup="dialog"
          title={tNav("openMenu")}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl text-neutral-600 hover:text-primary active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight mt-1">
            {tNav("more")}
          </span>
        </button>
      </div>
    </nav>
  );
};
