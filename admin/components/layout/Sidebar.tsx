"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Home,
  Compass,
  Plane,
  Car,
  ShieldCheck,
  Calendar,
  Wallet,
  Star,
  Ticket,
  Mail,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
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

interface NavSubItem {
  href: string;
  labelKey: string;
  badge?: number;
}

interface NavItem {
  id: string;
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  subItems?: NavSubItem[];
  exact?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onMobileClose,
  onOpenHelp,
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale() as "en" | "fr" | "ar";
  const tNav = useTranslations("nav");

  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Restore collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("darna_admin_sidebar_collapsed");
      if (saved) setCollapsed(saved === "true");
    } catch {}
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [pathname, searchParams]);

  // Close mobile drawer on ESC key & lock body scroll on mobile
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onMobileClose) {
        onMobileClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen, onMobileClose]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("darna_admin_sidebar_collapsed", String(next));
    } catch {}
  };

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      href: "/",
      labelKey: "dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      id: "users",
      href: "/users",
      labelKey: "users",
      icon: Users,
      subItems: [
        { href: "/users", labelKey: "sub.allUsers" },
        { href: "/users/guests", labelKey: "sub.guests" },
        { href: "/providers", labelKey: "sub.providers" },
        { href: "/users?status=suspended,banned", labelKey: "sub.suspendedBanned" },
      ],
    },
    {
      id: "stays",
      href: "/stays",
      labelKey: "stays",
      icon: Home,
      subItems: [
        { href: "/stays", labelKey: "sub.allStays" },
        { href: "/stays/new", labelKey: "sub.addStay" },
        { href: "/stays?status=pending", labelKey: "sub.pendingValidation", badge: 186 },
        { href: "/stays?status=published", labelKey: "sub.published" },
        { href: "/stays?status=suspended", labelKey: "sub.suspended" },
        { href: "/stays?status=refused", labelKey: "sub.refused" },
        { href: "/stays/categories", labelKey: "sub.categories" },
        { href: "/stays/change-requests", labelKey: "sub.changeRequests" },
      ],
    },
    {
      id: "experiences",
      href: "/experiences",
      labelKey: "experiences",
      icon: Compass,
      subItems: [
        { href: "/experiences", labelKey: "sub.allExperiences" },
        { href: "/experiences/new", labelKey: "sub.addExperience" },
        { href: "/experiences?status=pending", labelKey: "sub.pendingValidation", badge: 46 },
        { href: "/experiences?status=published", labelKey: "sub.published" },
        { href: "/experiences?status=suspended", labelKey: "sub.suspended" },
        { href: "/experiences?status=refused", labelKey: "sub.refused" },
        { href: "/experiences/categories", labelKey: "sub.categories" },
        { href: "/experiences/change-requests", labelKey: "sub.changeRequests" },
      ],
    },
    {
      id: "trips",
      href: "/trips",
      labelKey: "trips",
      icon: Plane,
      subItems: [
        { href: "/trips", labelKey: "sub.allTrips" },
        { href: "/trips/new", labelKey: "sub.addTrip" },
        { href: "/trips?status=pending", labelKey: "sub.pendingValidation", badge: 24 },
        { href: "/trips?status=published", labelKey: "sub.published" },
        { href: "/trips?status=suspended", labelKey: "sub.suspended" },
        { href: "/trips?status=refused", labelKey: "sub.refused" },
        { href: "/trips/categories", labelKey: "sub.categories" },
        { href: "/trips/booking-requests", labelKey: "sub.bookingRequests" },
      ],
    },
    {
      id: "cars",
      href: "/cars",
      labelKey: "cars",
      icon: Car,
      subItems: [
        { href: "/cars", labelKey: "sub.allCars" },
        { href: "/cars/new", labelKey: "sub.addCar" },
        { href: "/cars/rentals", labelKey: "sub.rentals" },
        { href: "/cars?status=pending", labelKey: "sub.pendingValidation", badge: 186 },
        { href: "/cars/rentals?status=confirmed", labelKey: "sub.confirmed" },
        { href: "/cars/rentals?status=in_progress", labelKey: "sub.inProgress" },
        { href: "/cars/rentals?status=completed", labelKey: "sub.completed" },
        { href: "/cars/rentals?status=cancelled", labelKey: "sub.cancelled" },
        { href: "/cars/owners", labelKey: "sub.owners" },
        { href: "/cars/categories", labelKey: "sub.categories" },
        { href: "/cars/pricing", labelKey: "sub.pricing" },
        { href: "/cars/insurance", labelKey: "sub.insurance" },
      ],
    },
    {
      id: "moderation",
      href: "/moderation/providers",
      labelKey: "moderation",
      icon: ShieldCheck,
      badge: 124,
      subItems: [
        { href: "/moderation/providers", labelKey: "sub.allProviders" },
        { href: "/moderation/providers?category=host", labelKey: "sub.hosts" },
        { href: "/moderation/providers?category=hotel_hostel", labelKey: "sub.hotelsHostels" },
        { href: "/moderation/providers?category=travel_agency", labelKey: "sub.travelAgencies" },
        { href: "/moderation/providers?category=experience_company", labelKey: "sub.experienceCompanies" },
        { href: "/moderation/providers?category=rental_agency", labelKey: "sub.rentalAgencies" },
      ],
    },
    {
      id: "bookings",
      href: "/bookings",
      labelKey: "bookings",
      icon: Calendar,
      subItems: [
        { href: "/bookings", labelKey: "sub.allBookings" },
        { href: "/bookings?type=stay", labelKey: "sub.allStays" },
        { href: "/bookings?type=experience", labelKey: "sub.allExperiences" },
        { href: "/bookings?type=trip", labelKey: "sub.allTrips" },
        { href: "/bookings?type=car", labelKey: "sub.allCars" },
        { href: "/bookings?status=pending", labelKey: "sub.pending", badge: 42 },
        { href: "/bookings?status=confirmed", labelKey: "sub.confirmed" },
        { href: "/bookings?status=cancelled", labelKey: "sub.cancelled" },
        { href: "/bookings?status=refunded", labelKey: "sub.refunds" },
      ],
    },
    {
      id: "payments",
      href: "/payments",
      labelKey: "payments",
      icon: Wallet,
      subItems: [
        { href: "/payments", labelKey: "sub.overview" },
        { href: "/payments/wallets", labelKey: "sub.wallets" },
        { href: "/payments/transactions", labelKey: "sub.transactions" },
        { href: "/payments/commissions", labelKey: "sub.commissions" },
        { href: "/payments/payouts", labelKey: "sub.payouts" },
        { href: "/payments/refunds", labelKey: "sub.refunds" },
      ],
    },
    {
      id: "reviews",
      href: "/reviews",
      labelKey: "reviews",
      icon: Star,
      subItems: [
        { href: "/reviews", labelKey: "sub.allReviews" },
        { href: "/reviews?status=flagged", labelKey: "sub.flaggedReviews", badge: 8 },
        { href: "/reviews/reports", labelKey: "sub.userReports" },
        { href: "/reviews/disputes", labelKey: "sub.disputes" },
      ],
    },
    {
      id: "promotions",
      href: "/promotions",
      labelKey: "promotions",
      icon: Ticket,
      subItems: [
        { href: "/promotions", labelKey: "sub.coupons" },
        { href: "/promotions/featured", labelKey: "sub.featured" },
      ],
    },
    {
      id: "messages",
      href: "/messages",
      labelKey: "messages",
      icon: Mail,
      badge: 3,
      subItems: [
        { href: "/messages", labelKey: "sub.conversations" },
        { href: "/messages/notifications", labelKey: "sub.sentNotifications" },
        { href: "/messages/templates", labelKey: "sub.templates" },
      ],
    },
    {
      id: "stats",
      href: "/stats",
      labelKey: "stats",
      icon: BarChart3,
      subItems: [
        { href: "/stats", labelKey: "sub.overview" },
        { href: "/stats/providers", labelKey: "sub.byProvider" },
        { href: "/stats/services", labelKey: "sub.byService" },
        { href: "/stats/wilayas", labelKey: "sub.byWilaya" },
        { href: "/stats/revenue", labelKey: "sub.revenue" },
        { href: "/stats/reports", labelKey: "sub.reportsExports" },
      ],
    },
    {
      id: "settings",
      href: "/settings",
      labelKey: "settings",
      icon: Settings,
      subItems: [
        { href: "/settings", labelKey: "sub.general" },
        { href: "/settings/onboarding", labelKey: "sub.onboarding" },
        { href: "/settings/commissions", labelKey: "sub.commissions" },
        { href: "/settings/languages", labelKey: "sub.languages" },
        { href: "/settings/notifications", labelKey: "sub.notifications" },
        { href: "/settings/security", labelKey: "sub.security" },
        { href: "/settings/team", labelKey: "sub.team" },
        { href: "/settings/audit-log", labelKey: "sub.auditLog" },
      ],
    },
  ];

  // Auto-expand section containing current route
  useEffect(() => {
    if (!pathname) return;
    const currentSection = navItems.find((item) => {
      if (item.exact) return pathname === item.href;
      if (pathname.startsWith(item.href)) return true;
      if (item.subItems?.some((sub) => pathname.startsWith(sub.href.split("?")[0]))) {
        return true;
      }
      return false;
    });

    if (currentSection && currentSection.subItems) {
      setOpenSection(currentSection.id);
    }
  }, [pathname]);

  const handleParentClick = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      // Toggle accordion: only one section open at a time
      setOpenSection((prev) => (prev === item.id ? null : item.id));
    }
  };

  const normalizeStatusVal = (s?: string | null) => {
    if (!s) return s;
    const lower = s.toLowerCase();
    if (lower === "pending" || lower === "pending_review") return "pending";
    if (lower === "published" || lower === "approved") return "published";
    if (lower === "refused" || lower === "rejected") return "refused";
    return lower;
  };

  const isCurrentSubActive = (subHref: string) => {
    const [subPath, subQuery] = subHref.split("?");
    if (pathname !== subPath) return false;
    if (!subQuery) {
      // Base sub-item is active only if no status/type query params match other sub items
      return !searchParams.get("status") && !searchParams.get("type") && !searchParams.get("category");
    }
    const params = new URLSearchParams(subQuery);
    let allMatch = true;
    params.forEach((val, key) => {
      const currentVal = searchParams.get(key);
      if (key === "status") {
        if (normalizeStatusVal(currentVal) !== normalizeStatusVal(val)) allMatch = false;
      } else {
        if (currentVal !== val) allMatch = false;
      }
    });
    return allMatch;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container: Off-canvas drawer under 1024px (lg), fixed on desktop */}
      <aside
        className={`fixed inset-y-0 start-0 z-50 bg-primary text-white flex flex-col h-[100dvh] transition-all duration-300 border-e border-[#3A493B] shadow-xl ${
          collapsed ? "lg:w-20 w-[280px] max-w-[85vw]" : "w-[280px] sm:w-[260px] lg:w-[218px] max-w-[85vw]"
        } ${
          isMobileOpen
            ? "translate-x-0 opacity-100 visible"
            : "-translate-x-full lg:translate-x-0 rtl:translate-x-full lg:rtl:translate-x-0 max-lg:invisible max-lg:pointer-events-none"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`border-b border-[#3A493B]/80 transition-all ${
            collapsed
              ? "p-3 flex flex-col items-center gap-2"
              : "px-4 py-3.5 flex items-center justify-between"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden shrink-0 group select-none"
            title="DARNA Admin Console"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-900 border border-[#3A493B] flex items-center justify-center shrink-0">
              <Image
                src="/assets/logo.png"
                alt="DARNA"
                width={20}
                height={20}
                className="h-5 w-5 object-contain brightness-0 invert group-hover:scale-105 transition"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide leading-tight text-white">
                  DARNA
                </span>
                <span className="text-[10px] text-tertiary-300 leading-tight">
                  Voyagez en Algérie
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`hidden md:flex items-center justify-center rounded-lg bg-primary-900 hover:bg-[#3A493B] text-tertiary-300 hover:text-white transition cursor-pointer shadow-2xs border border-[#3A493B]/60 ${
              collapsed ? "w-7 h-6 mt-1" : "p-1"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation Area (Accordion) */}
        <nav
          className={`flex-1 overflow-y-auto space-y-1 py-2.5 text-[13px] darna-admin-scrollbar ${
            collapsed ? "px-2" : "px-2.5"
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasSub = item.subItems && item.subItems.length > 0;
            const isOpen = openSection === item.id;
            const isParentActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) ||
                (hasSub && item.subItems?.some((s) => pathname.startsWith(s.href.split("?")[0])));

            return (
              <div key={item.id} className="space-y-0.5">
                {/* Parent Row */}
                <div className="relative flex items-center">
                  <Link
                    href={item.href}
                    onClick={() => {
                      handleParentClick(item);
                      if (!hasSub && onMobileClose) onMobileClose();
                    }}
                    className={`flex-1 group relative flex items-center rounded-lg font-medium transition ${
                      isParentActive
                        ? "bg-primary-900/90 text-white font-semibold shadow-2xs"
                        : "text-neutral-300 hover:bg-primary-700/60 hover:text-white"
                    } ${
                      collapsed
                        ? "w-10 h-10 mx-auto justify-center px-0"
                        : "gap-2.5 px-2.5 py-2"
                    }`}
                    title={tNav(item.labelKey)}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-neutral-300 group-hover:text-white" />
                    {!collapsed && (
                      <span className="truncate flex-1 text-start">
                        {tNav(item.labelKey)}
                      </span>
                    )}

                    {/* Count Badge on Parent (e.g. Validation, Messages) */}
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                          collapsed ? "absolute -top-1 -end-1" : "ms-auto"
                        } ${
                          item.id === "moderation"
                            ? "bg-[#C96F4F] text-white"
                            : "bg-secondary text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Accordion Chevron Trigger for desktop */}
                  {hasSub && !collapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSection((prev) => (prev === item.id ? null : item.id));
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-md transition"
                      aria-label={isOpen ? "Collapse section" : "Expand section"}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Sub-items (Accordion smooth expand) */}
                {hasSub && isOpen && !collapsed && (
                  <div className="space-y-0.5 ps-3 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200 border-s border-[#3A493B]/70 ms-4">
                    {item.subItems!.map((sub) => {
                      const active = isCurrentSubActive(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onMobileClose}
                          className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs transition ${
                            active
                              ? "bg-secondary/30 text-white font-semibold"
                              : "text-neutral-300 hover:bg-primary-700/50 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                active ? "bg-secondary" : "bg-neutral-500 group-hover:bg-neutral-300"
                              }`}
                            />
                            <span className="truncate">{tNav(sub.labelKey)}</span>
                          </div>
                          {sub.badge !== undefined && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-tertiary-700/80 text-white tabular-nums">
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pinned Help Card at Bottom */}
        <div className="p-2.5 border-t border-[#3A493B]/80">
          <Link
            href="/help"
            onClick={onMobileClose}
            className={`block rounded-xl bg-primary-900/90 hover:bg-primary-900 border border-[#3A493B] transition p-2.5 group select-none shadow-xs ${
              collapsed ? "text-center" : ""
            }`}
            title="Consultez notre centre d'aide"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center justify-center shrink-0 text-secondary group-hover:scale-105 transition">
                <HelpCircle className="w-4 h-4" />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white leading-tight">
                    {tNav("needHelp")}
                  </span>
                  <span className="text-[10px] text-tertiary-300 leading-tight truncate">
                    {tNav("helpCenter")}
                  </span>
                </div>
              )}
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};
