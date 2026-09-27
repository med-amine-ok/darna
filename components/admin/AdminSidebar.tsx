"use client";

import React, { useState } from "react";
import { usePathname, useRouter, Link } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
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

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-tertiary sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo variant="horizontal" width={100} height={28} interactive={false} />
          <span className="text-xs font-bold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20">
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
          className="md:hidden fixed inset-0 bg-primary/40 z-40 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 start-0 z-50 w-64 bg-surface border-e border-tertiary flex flex-col justify-between h-screen transition-transform duration-200 ease-in-out ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0 rtl:translate-x-full md:rtl:translate-x-0"
        }`}
      >
        {/* Brand & Platform Header */}
        <div>
          <div className="p-6 border-b border-tertiary/40 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <Logo variant="horizontal" width={115} height={32} interactive={false} />
              <span className="text-xs font-bold uppercase tracking-wider bg-accent/10 text-accent px-2.5 py-1 rounded-full border border-accent/20">
                {t("roleAdmin")}
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
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
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    active
                      ? "bg-accent/10 text-accent font-semibold shadow-xs"
                      : "text-neutral-600 hover:text-primary hover:bg-neutral-50"
                  }`}
                >
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
        <div className="p-4 border-t border-tertiary/40 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-primary/60 font-medium">{tNav("language")}:</span>
            <LanguageSwitcher />
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-tertiary text-primary text-sm font-semibold hover:bg-tertiary/20 hover:border-tertiary transition shadow-2xs"
          >
            <MdOutlineArrowBack
              size={18}
              className="rtl:rotate-180 transition-transform"
            />
            <span>{t("backToDarna")}</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
