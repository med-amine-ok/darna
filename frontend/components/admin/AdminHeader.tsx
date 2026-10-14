"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "@/navigation";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import Avatar from "@/components/Avatar";
import { BrandMenuIcon, BrandBellIcon, BrandShieldIcon } from "@/components/icons";

interface AdminHeaderProps {
  onMobileMenuToggle: () => void;
}

export default function AdminHeader({ onMobileMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();

  const getBreadcrumbTitle = () => {
    if (pathname === "/admin") return "Overview Dashboard";
    if (pathname.includes("/admin/listings")) return "Listings Moderation";
    if (pathname.includes("/admin/bookings")) return "Bookings Management";
    if (pathname.includes("/admin/users")) return "Users & Hosts Control";
    if (pathname.includes("/admin/reviews")) return "Reviews Moderation";
    if (pathname.includes("/admin/categories")) return "Categories & Amenities";
    if (pathname.includes("/admin/promotions")) return "Coupons & Promotions";
    if (pathname.includes("/admin/reports")) return "Reports & Data Exports";
    if (pathname.includes("/admin/settings")) return "Platform Settings";
    if (pathname.includes("/admin/audit-log")) return "System Audit Log";
    return "Control Center";
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary/60 px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-xl border border-tertiary/70 text-neutral-700 hover:bg-neutral-100 transition"
          aria-label="Open Admin Menu"
        >
          <BrandMenuIcon size={20} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <Link href="/admin" className="font-bold text-neutral-400 hover:text-primary transition">
            Admin
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="font-serif font-black text-primary text-sm sm:text-base">
            {getBreadcrumbTitle()}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher />

        {/* Audit Notification shortcut */}
        <Link
          href="/admin/audit-log"
          className="relative p-2 rounded-full hover:bg-neutral-100 text-primary transition"
          title="Recent Audit Logs"
        >
          <BrandBellIcon size={20} />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </Link>

        {/* Admin User Badge */}
        <div className="flex items-center gap-2 ps-3 border-s border-tertiary/50">
          <Avatar src="/assets/avatar.png" size={30} />
          <div className="hidden sm:block text-start">
            <span className="block text-xs font-bold text-primary leading-tight">
              Administrator
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
              <BrandShieldIcon size={12} /> Super Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
