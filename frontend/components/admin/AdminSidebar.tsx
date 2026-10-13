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
  HiOutlineCreditCard,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExternalLink,
  HiOutlineShieldCheck,
} from "react-icons/hi";

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminSidebar({
  isMobileOpen,
  onMobileClose,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  useEffect(() => {
    if (controlledCollapsed === undefined) {
      try {
        const saved = localStorage.getItem("darna_admin_sidebar_collapsed");
        if (saved) setInternalCollapsed(saved === "true");
      } catch (e) {}
    }
  }, [controlledCollapsed]);

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapsed = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalCollapsed;
      setInternalCollapsed(next);
      try {
        localStorage.setItem("darna_admin_sidebar_collapsed", String(next));
      } catch (e) {}
    }
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
        { href: "/admin/bookings", label: "Bookings", icon: HiOutlineCalendar },
        { href: "/admin/users", label: "Users & Hosts", icon: HiOutlineUsers },
      ],
    },
    {
      title: "Content",
      items: [
        { href: "/admin/listings", label: "Listings Moderation", imgSrc: "/assets/house.png" },
        { href: "/admin/reviews", label: "Reviews Moderation", icon: HiOutlineStar },
        { href: "/admin/categories", label: "Categories & Amenities", icon: HiOutlineTag },
        { href: "/admin/onboarding", label: "Onboarding Flows", icon: HiOutlineClipboardList },
      ],
    },
    {
      title: "Financial",
      items: [
        { href: "/admin/wallets", label: "Host Wallets & Ledger", icon: HiOutlineCreditCard },
        { href: "/admin/promotions", label: "Coupons & Promos", icon: HiOutlineTicket },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/reports", label: "Reports & Exports", icon: HiOutlineDocumentReport },
        { href: "/admin/settings", label: "Platform Settings", icon: HiOutlineCog },
        { href: "/admin/audit-log", label: "System Audit Log", icon: HiOutlineShieldCheck },
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
        <div
          className={`border-b border-[#3A493B] transition-all ${
            collapsed
              ? "p-3 flex flex-col items-center gap-2.5"
              : "p-4 flex items-center justify-between"
          }`}
        >
          <Link
            href="/admin"
            className="flex items-center gap-2 overflow-hidden shrink-0 group select-none"
            title="Darna Admin Control Center"
          >
            {collapsed ? (
              <div className="w-9 h-9 rounded-xl bg-[#2E3A2F] border border-[#3A493B] flex items-center justify-center hover:bg-[#3A493B] transition shadow-xs">
                <Image
                  src="/assets/logo.png"
                  alt="DARNA"
                  width={22}
                  height={22}
                  className="h-5 w-5 object-contain brightness-0 invert group-hover:scale-105 transition"
                />
              </div>
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

          {/* Desktop Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`hidden md:flex items-center justify-center rounded-lg bg-[#2E3A2F] hover:bg-[#3A493B] text-tertiary hover:text-white transition cursor-pointer shadow-2xs border border-[#3A493B]/60 ${
              collapsed ? "w-8 h-7" : "p-1.5"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <HiOutlineChevronRight size={15} className="rtl:rotate-180" />
            ) : (
              <HiOutlineChevronLeft size={16} className="rtl:rotate-180" />
            )}
          </button>
        </div>

        {/* Live Admin Status Indicator */}
        {!collapsed ? (
          <div className="mx-4 my-3 px-3 py-2 bg-[#2E3A2F] rounded-xl border border-[#3A493B] flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="truncate">
              <span className="block font-bold text-neutral-200">System Live</span>
              <span className="text-[10px] text-neutral-400">SATIM & CCP Operational</span>
            </div>
          </div>
        ) : (
          <div
            className="my-2.5 flex justify-center cursor-default"
            title="System Live • SATIM & CCP Operational"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
        )}

        {/* Navigation List with Darna custom scrollbar / slider */}
        <div
          className={`flex-1 overflow-y-auto space-y-4 darna-admin-scrollbar ${
            collapsed ? "px-2 py-2" : "px-3 py-2"
          }`}
        >
          {navGroups.map((group, groupIdx) => (
            <div
              key={group.title}
              className={
                groupIdx > 0
                  ? `pt-3 border-t border-[#3A493B]/60 ${collapsed ? "mx-1" : ""}`
                  : ""
              }
            >
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
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
                      className={`group relative flex items-center rounded-xl text-xs font-semibold transition ${
                        active
                          ? "bg-[#6B7F5B] text-white shadow-xs"
                          : "text-neutral-300 hover:bg-[#2E3A2F] hover:text-white"
                      } ${
                        collapsed
                          ? "w-10 h-10 mx-auto justify-center px-0"
                          : "gap-3 px-3 py-2.5"
                      }`}
                      title={item.label}
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

                      {/* Floating tooltip on collapsed state */}
                      {collapsed && (
                        <span className="hidden group-hover:flex absolute start-full ms-3 px-2.5 py-1.5 bg-[#1C241D] text-white text-xs font-semibold rounded-lg whitespace-nowrap z-50 shadow-2xl border border-[#3A493B] pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Return to Guest App */}
        <div className="p-3 border-t border-[#3A493B]">
          <Link
            href="/"
            className={`group relative flex items-center rounded-xl text-xs font-bold text-tertiary hover:bg-[#2E3A2F] hover:text-white transition ${
              collapsed
                ? "w-10 h-10 mx-auto justify-center px-0"
                : "gap-2.5 px-3 py-2"
            }`}
            title="Exit to Darna traveler marketplace"
          >
            <HiOutlineExternalLink size={17} className="shrink-0" />
            {!collapsed && <span>Return to App</span>}
            {collapsed && (
              <span className="hidden group-hover:flex absolute start-full ms-3 px-2.5 py-1.5 bg-[#1C241D] text-white text-xs font-semibold rounded-lg whitespace-nowrap z-50 shadow-2xl border border-[#3A493B] pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95">
                Return to App
              </span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
