"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CheckSquare,
  Building,
  Users,
  Home,
  Calendar,
  Wallet,
  Star,
  Ticket,
  Tag,
  FileText,
  BarChart3,
  Compass,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  approvalsCount?: number;
  onOpenHelp?: () => void;
  onStartTour?: () => void;
  isTrainingMode?: boolean;
  onToggleTrainingMode?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onMobileClose,
  approvalsCount = 0,
  onOpenHelp,
  onStartTour,
  isTrainingMode = false,
  onToggleTrainingMode,
}) => {
  const pathname = usePathname();
  const locale = useLocale() as "en" | "fr" | "ar";
  const tNav = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);
  const [isManageExpanded, setIsManageExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("darna_admin_sidebar_collapsed");
      if (saved) setCollapsed(saved === "true");
    } catch {}
  }, []);

  // Automatically expand Manage group if currently inside one of its routes
  useEffect(() => {
    const managePaths = [
      "/reviews",
      "/promotions",
      "/categories",
      "/onboarding",
      "/reports",
      "/network",
      "/settings",
      "/team",
      "/audit-log",
      "/where-did-it-go",
    ];
    if (managePaths.some((p) => pathname?.startsWith(p))) {
      setIsManageExpanded(true);
    }
  }, [pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("darna_admin_sidebar_collapsed", String(next));
    } catch {}
  };

  /**
   * Top-level primary navigation (exactly 7 items, ordered by frequency of use)
   * Strictly obeys Miller 7±2 and §2 of the HCI Addendum
   */
  const topLevelNav = [
    {
      href: "/",
      label: tNav("home") || "Home",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/approvals",
      label: tNav("toReview") || "To review",
      icon: CheckSquare,
      badge: approvalsCount > 0 ? approvalsCount : undefined,
    },
    {
      href: "/hosts",
      label: tNav("hosts") || "Hosts",
      icon: Building,
    },
    {
      href: "/users",
      label: tNav("guests") || "Guests",
      icon: Users,
    },
    {
      href: "/listings",
      label: tNav("listings") || "Listings",
      icon: Home,
    },
    {
      href: "/bookings",
      label: tNav("bookings") || "Bookings",
      icon: Calendar,
    },
    {
      href: "/finance",
      label: tNav("money") || "Money",
      icon: Wallet,
    },
  ];

  /**
   * Secondary collapsed group: "Manage" (≤ 7 items)
   */
  const manageNav = [
    {
      href: "/reviews",
      label: tNav("reviews") || "Reviews",
      icon: Star,
    },
    {
      href: "/promotions",
      label: tNav("promotions") || "Promotions",
      icon: Ticket,
    },
    {
      href: "/categories",
      label: tNav("categories") || "Categories",
      icon: Tag,
    },
    {
      href: "/onboarding",
      label: tNav("hostSignUpSteps") || "Host sign-up steps",
      icon: FileText,
    },
    {
      href: "/reports",
      label: tNav("reports") || "Reports",
      icon: BarChart3,
    },
    {
      href: "/network",
      label: tNav("network") || "Network explorer",
      icon: Compass,
    },
    {
      href: "/settings",
      label: tNav("settings") || "Settings",
      icon: Settings,
    },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href || pathname === "";
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
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0 rtl:translate-x-full md:rtl:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`border-b border-[#3A493B] transition-all ${
            collapsed
              ? "p-3 flex flex-col items-center gap-2"
              : "p-4 flex items-center justify-between"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 overflow-hidden shrink-0 group select-none"
            title="DARNA Admin Console"
          >
            {collapsed ? (
              <div className="w-10 h-10 rounded-xl bg-[#2E3A2F] border border-[#3A493B] flex items-center justify-center hover:bg-[#3A493B] transition shadow-xs">
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
                <span className="px-2 py-0.5 bg-secondary text-white rounded-md text-[10px] font-semibold">
                  Admin
                </span>
              </>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`hidden md:flex items-center justify-center rounded-lg bg-[#2E3A2F] hover:bg-[#3A493B] text-tertiary hover:text-white transition cursor-pointer shadow-2xs border border-[#3A493B]/60 ${
              collapsed ? "w-8 h-7 mt-2" : "p-1.5"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            ) : (
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div
          className={`flex-1 overflow-y-auto space-y-2 py-3 darna-admin-scrollbar ${
            collapsed ? "px-2" : "px-3"
          }`}
        >
          {/* Section 1: Exactly 7 Top-Level Items */}
          <div className="space-y-1">
            {topLevelNav.map((item) => {
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
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}

                  {/* Red Badge count for pending reviews */}
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ms-auto ${
                        active
                          ? "bg-white text-secondary"
                          : "bg-[#C96F4F] text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip on collapsed state */}
                  {collapsed && (
                    <span className="hidden group-hover:flex absolute start-full ms-3 px-2.5 py-1.5 bg-[#1C241D] text-white text-xs font-semibold rounded-lg whitespace-nowrap z-50 shadow-2xl border border-[#3A493B] pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95">
                      {item.label}
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.2 bg-[#C96F4F] text-white rounded-full text-[9px]">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Section 2: Collapsed "Manage" Group (≤ 7 items) */}
          <div className="pt-2 border-t border-[#3A493B]/60">
            {!collapsed ? (
              <div>
                <button
                  type="button"
                  onClick={() => setIsManageExpanded(!isManageExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#2E3A2F] rounded-xl transition"
                >
                  <span className="flex items-center gap-2">
                    <span>{tNav("manage") || "Manage"}</span>
                    <span className="text-[10px] text-neutral-500 font-normal">
                      (7)
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isManageExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isManageExpanded && (
                  <div className="space-y-1 pt-1 ps-2 animate-in fade-in duration-200">
                    {manageNav.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onMobileClose}
                          className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                            active
                              ? "bg-[#6B7F5B] text-white font-semibold shadow-xs"
                              : "text-neutral-300 hover:bg-[#2E3A2F] hover:text-white"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0 text-neutral-400 group-hover:text-white" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Collapsed quick menu trigger */
              <div className="space-y-1">
                {manageNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={`group relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-xs transition ${
                        active
                          ? "bg-[#6B7F5B] text-white"
                          : "text-neutral-400 hover:bg-[#2E3A2F] hover:text-white"
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="hidden group-hover:flex absolute start-full ms-3 px-2.5 py-1.5 bg-[#1C241D] text-white text-xs font-semibold rounded-lg whitespace-nowrap z-50 shadow-2xl border border-[#3A493B] pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Utilities */}
        <div className="p-3 border-t border-[#3A493B] space-y-1.5">
          {/* Where did it go? Guide link */}
          <Link
            href="/where-did-it-go"
            className={`group relative flex items-center rounded-xl text-xs font-medium text-tertiary hover:bg-[#2E3A2F] hover:text-white transition ${
              collapsed
                ? "w-10 h-10 mx-auto justify-center px-0"
                : "gap-2.5 px-3 py-1.5"
            }`}
            title={tNav("whereDidItGo") || "Where did it go?"}
          >
            <Compass className="w-4 h-4 shrink-0 text-secondary" />
            {!collapsed && (
              <span className="truncate">
                {tNav("whereDidItGo") || "Where did it go?"}
              </span>
            )}
          </Link>

          {/* Link to public marketplace */}
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative flex items-center rounded-xl text-xs font-bold text-tertiary hover:bg-[#2E3A2F] hover:text-white transition ${
              collapsed
                ? "w-10 h-10 mx-auto justify-center px-0"
                : "gap-2.5 px-3 py-1.5"
            }`}
            title={tNav("backToSite")}
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{tNav("backToSite")}</span>}
          </a>
        </div>
      </aside>
    </>
  );
};
