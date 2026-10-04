"use client";

import React, { useState } from "react";
import { usePathname, Link } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import Logo from "../navbar/Logo";
import {
  MdDashboard,
  MdHomeWork,
  MdCalendarMonth,
  MdPeople,
  MdRateReview,
  MdOutlineArrowBack,
  MdMenu,
  MdClose,
} from "react-icons/md";
import LanguageSwitcher from "../navbar/LanguageSwitcher";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/admin", labelKey: "overview", icon: MdDashboard },
  { href: "/admin/listings", labelKey: "listings", icon: MdHomeWork },
  { href: "/admin/bookings", labelKey: "bookings", icon: MdCalendarMonth },
  { href: "/admin/users", labelKey: "users", icon: MdPeople },
  { href: "/admin/reviews", labelKey: "reviews", icon: MdRateReview },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("admin");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isRtl = locale === "ar";

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  const closedTransform = isRtl
    ? "translate-x-full md:translate-x-0"
    : "-translate-x-full md:translate-x-0";

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-tertiary sticky top-0 z-40 shadow-xs">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo variant="horizontal" width={100} height={28} interactive={false} />
          <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20">
            {t("roleAdmin")}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-primary/70 hover:bg-tertiary/20 transition touch-manipulation cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-primary/40 z-40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Fixed Sidebar Container */}
      <aside
        className={`fixed top-0 inset-y-0 start-0 z-50 w-64 bg-surface border-e border-tertiary/60 flex flex-col justify-between h-screen shrink-0 transition-transform duration-200 ease-in-out shadow-sm ${
          isMobileOpen ? "translate-x-0" : closedTransform
        }`}
      >
        {/* Brand & Platform Header */}
        <div className="flex flex-col min-h-0 flex-1">
          <div className="p-5 border-b border-tertiary/40 flex items-center justify-between shrink-0">
            <Link href="/admin" className="flex items-center gap-2.5">
              <Logo variant="horizontal" width={110} height={30} interactive={false} />
              <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent px-2.5 py-0.5 rounded-full border border-accent/20">
                {t("roleAdmin")}
              </span>
            </Link>

            {/* Mobile Close Button inside Drawer Header */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-neutral-500 hover:text-primary hover:bg-neutral-100 transition cursor-pointer"
              aria-label="Close navigation sidebar"
            >
              <MdClose size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto min-h-0">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              {t("management")}
            </div>
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    active
                      ? "bg-accent/10 text-accent font-semibold shadow-2xs"
                      : "text-neutral-600 hover:text-primary hover:bg-neutral-100/80"
                  }`}
                >
                  {active && (
                    <span className="absolute start-0 top-2 bottom-2 w-1 bg-accent rounded-full" />
                  )}
                  <Icon
                    size={20}
                    className={active ? "text-accent" : "text-neutral-400"}
                  />
                  <span>{t(item.labelKey as any)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-tertiary/40 space-y-3 shrink-0 bg-surface">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-primary/60 font-medium">{tNav("language")}:</span>
            <LanguageSwitcher dropUp={true} />
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-tertiary/80 text-primary text-sm font-semibold hover:bg-tertiary/20 hover:border-tertiary transition shadow-2xs group"
          >
            <MdOutlineArrowBack
              size={18}
              className="rtl:rotate-180 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
            />
            <span>{t("backToDarna")}</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
