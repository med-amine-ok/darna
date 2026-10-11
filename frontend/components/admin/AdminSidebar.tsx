"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "@/navigation";
import {
  HiOutlineChartBar,
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineUsers,
  HiOutlineStar,
  HiOutlineTag,
  HiOutlineTicket,
  HiOutlineDocumentReport,
  HiOutlineCog,
  HiOutlineClipboardList,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExternalLink,
  HiOutlineShieldCheck,
} from "react-icons/hi";

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({ isMobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("darna_admin_sidebar_collapsed");
      if (saved) setCollapsed(saved === "true");
    } catch (e) {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("darna_admin_sidebar_collapsed", String(next));
    } catch (e) {}
  };

  interface NavItem {
    href: string;
    label: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    imgSrc?: string;
    exact?: boolean;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      title: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: HiOutlineChartBar, exact: true },
      ],
    },
    {
      title: "Operations",
      items: [
        { href: "/admin/listings", label: "Listings", imgSrc: "/assets/house.png" },
        { href: "/admin/bookings", label: "Bookings", icon: HiOutlineCalendar },
        { href: "/admin/users", label: "Users & Hosts", icon: HiOutlineUsers },
        { href: "/admin/reviews", label: "Reviews Moderation", icon: HiOutlineStar },
      ],
    },
    {
      title: "Catalog & Marketing",
      items: [
        { href: "/admin/categories", label: "Categories & Amenities", icon: HiOutlineTag },
        { href: "/admin/promotions", label: "Coupons & Promos", icon: HiOutlineTicket },
      ],
    },
    {
      title: "Analytics & System",
      items: [
        { href: "/admin/reports", label: "Reports & Exports", icon: HiOutlineDocumentReport },
        { href: "/admin/settings", label: "Platform Settings", icon: HiOutlineCog },
        { href: "/admin/audit-log", label: "Audit Log", icon: HiOutlineClipboardList },
      ],
    },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 start-0 z-50 bg-[#242F25] text-white flex flex-col transition-all duration-300 border-e border-[#3A493B] shadow-xl ${
          collapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 rtl:translate-x-full md:rtl:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#3A493B] flex items-center justify-between">
          <Link
            href="/admin"
            className={`flex items-center gap-2 overflow-hidden ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            {collapsed ? (
              <Image
                src="/assets/logo.png"
                alt="DARNA"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            ) : (
              <>
                <Image
                  src="/assets/logo-horizontal.png"
                  alt="DARNA"
                  width={105}
                  height={32}
                  className="h-6 w-auto object-contain brightness-0 invert"
                />
                <span className="px-2 py-0.5 bg-[#C96F4F] text-white rounded-md text-[9px] font-bold uppercase tracking-wider">
                  Admin
                </span>
              </>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:flex p-1.5 rounded-lg bg-[#2E3A2F] hover:bg-[#3A493B] text-tertiary transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <HiOutlineChevronRight size={16} /> : <HiOutlineChevronLeft size={16} />}
          </button>
        </div>

        {/* Live Admin Status Badge */}
        {!collapsed && (
          <div className="mx-4 my-3 px-3 py-2 bg-[#2E3A2F] rounded-xl border border-[#3A493B] flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="truncate">
              <span className="block font-bold text-neutral-200">System Live</span>
              <span className="text-[10px] text-neutral-400">SATIM & CCP Operational</span>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        active
                          ? "bg-[#6B7F5B] text-white shadow-xs"
                          : "text-neutral-300 hover:bg-[#2E3A2F] hover:text-white"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                      title={collapsed ? item.label : undefined}
                    >
                      {item.imgSrc ? (
                        <Image
                          src={item.imgSrc}
                          alt={item.label}
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] object-contain brightness-0 invert shrink-0"
                        />
                      ) : Icon ? (
                        <Icon size={18} className="shrink-0" />
                      ) : null}
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Return to Guest App */}
        <div className="p-3 border-t border-[#3A493B] space-y-1">
          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-tertiary hover:bg-[#2E3A2F] transition ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title="Exit to Darna traveler marketplace"
          >
            <HiOutlineExternalLink size={16} />
            {!collapsed && <span>Return to App</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
