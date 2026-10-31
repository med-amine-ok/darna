"use client";

import React from "react";
import { Link, usePathname } from "@/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { m } from "framer-motion";
import { spring } from "@/lib/motion";
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
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass border-t border-primary/[0.07] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
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
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-[color,transform] duration-fast ease-standard relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                  item.isActive ? "text-primary-900" : "text-primary-600 hover:text-primary-900 active:scale-95"
                }`}
              >
                {item.isActive && (
                  <m.span
                    layoutId="mobile-nav-active"
                    transition={spring.layout}
                    aria-hidden="true"
                    className="absolute top-0.5 inset-x-3 h-8 rounded-full bg-primary/[0.08]"
                  />
                )}
                <div className="relative">
                  <Icon
                    aria-hidden="true"
                    className={`w-5 h-5 my-1.5 ${item.isActive ? "text-primary-900" : ""}`}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0.5 -end-2.5 min-w-[16px] h-4 px-1 rounded-full bg-accent-600 text-white text-[11px] font-semibold tabular-nums flex items-center justify-center leading-none ring-2 ring-darnaBg"
                    >
                      {item.badge > 99 ? `${format.number(99)}+` : format.number(item.badge)}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] leading-tight truncate max-w-[64px] ${
                    item.isActive ? "font-semibold" : "font-medium"
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
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl text-primary-600 hover:text-primary-900 active:scale-95 transition-[color,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
        >
          <Menu className="w-5 h-5 my-1.5" aria-hidden="true" />
          <span className="text-[11px] leading-tight font-medium">
            {tNav("more")}
          </span>
        </button>
      </div>
    </nav>
  );
};
