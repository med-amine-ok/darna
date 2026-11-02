"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCurrentAdmin } from "@/components/auth/AdminSessionProvider";
import { canAccessPath } from "@/lib/route-permissions";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { AnimatePresence, m } from "framer-motion";
import { dur, ease, spring } from "@/lib/motion";
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
  X,
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

const ALL_NAV_ITEMS: readonly NavItem[] = [
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
      { href: "/moderation/providers", labelKey: "sub.providers" },
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

function normalizeStatusVal(s?: string | null) {
  if (!s) return s;
  const lower = s.toLowerCase();
  if (lower === "pending" || lower === "pending_review") return "pending";
  if (lower === "published" || lower === "approved") return "published";
  if (lower === "refused" || lower === "rejected") return "refused";
  return lower;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const t = useTranslations("sidebar");
  const format = useFormatter();
  const permissions = useCurrentAdmin()?.permissions;

  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  // The collapsed rail only applies on desktop; the mobile drawer always shows labels.
  const isCollapsed = collapsed && !isMobileOpen;

  // Mobile drawer = modal dialog: focus trap, Escape closes, scroll lock, focus restore.
  const asideRef = useDialogA11y<HTMLElement>(isMobileOpen, { onEscape: onMobileClose });

  // Restore collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("darna_admin_sidebar_collapsed");
      if (saved) setCollapsed(saved === "true");
    } catch {}
  }, []);

  // Close the mobile drawer on route change (only reacts to navigation, not to opening it).
  const mobileOpenRef = useRef(isMobileOpen);
  const onMobileCloseRef = useRef(onMobileClose);
  useEffect(() => {
    mobileOpenRef.current = isMobileOpen;
    onMobileCloseRef.current = onMobileClose;
  });
  useEffect(() => {
    if (mobileOpenRef.current) onMobileCloseRef.current?.();
  }, [pathname, searchParams]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("darna_admin_sidebar_collapsed", String(next));
    } catch {}
  };

  // Only show what the current role can open (the pages enforce it server-side).
  // A section whose landing page is restricted but has accessible sub-pages
  // keeps its entry and links to the first accessible sub-page.
  const navItems: NavItem[] = useMemo(() => {
    const perms = permissions ?? [];
    return ALL_NAV_ITEMS.map((item) => ({
      ...item,
      subItems: item.subItems?.filter((sub) => canAccessPath(sub.href, perms)),
    }))
      .filter((item) => canAccessPath(item.href, perms) || (item.subItems?.length ?? 0) > 0)
      .map((item) =>
        canAccessPath(item.href, perms) ? item : { ...item, href: item.subItems![0].href.split("?")[0] }
      );
  }, [permissions]);

  // Auto-expand section containing current route
  useEffect(() => {
    if (!pathname) return;
    const currentSection = navItems.find((item) => {
      if (item.exact) return pathname === item.href;
      if (pathname.startsWith(item.href)) return true;
      return item.subItems?.some((sub) => pathname.startsWith(sub.href.split("?")[0])) ?? false;
    });

    if (currentSection && currentSection.subItems) {
      setOpenSection(currentSection.id);
    }
  }, [pathname, navItems]);

  const handleParentClick = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      // Toggle accordion: only one section open at a time
      setOpenSection((prev) => (prev === item.id ? null : item.id));
    }
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
      {/* Mobile backdrop (blurred ink) */}
      <div
        onClick={onMobileClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 backdrop-ink lg:hidden transition-opacity duration-base ease-out ${
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar: off-canvas drawer (modal dialog) under 1024px (lg), fixed ink rail on desktop */}
      <aside
        ref={asideRef}
        role={isMobileOpen ? "dialog" : undefined}
        aria-modal={isMobileOpen ? true : undefined}
        aria-label={isMobileOpen ? t("menuLabel") : undefined}
        data-collapsed={collapsed ? "true" : "false"}
        className={`fixed inset-y-0 start-0 z-50 bg-primary-800 text-white flex flex-col h-[100dvh] transition-[transform,width,visibility] duration-base ease-out focus:outline-none max-lg:shadow-e5 max-lg:rounded-e-3xl overflow-hidden ${
          collapsed ? "lg:w-20 w-[280px] max-w-[85vw]" : "w-[280px] sm:w-[260px] lg:w-[218px] max-w-[85vw]"
        } ${
          isMobileOpen
            ? "translate-x-0 visible"
            : "-translate-x-full lg:translate-x-0 rtl:translate-x-full lg:rtl:translate-x-0 max-lg:invisible max-lg:pointer-events-none"
        }`}
      >
        {/* Brand header (aligned with the 64px top bar) */}
        <div
          className={`h-16 shrink-0 border-b border-white/[0.07] ${
            isCollapsed ? "px-2 flex items-center justify-center gap-1" : "px-4 flex items-center justify-between"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden shrink-0 group select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300"
            title={t("consoleTitle")}
          >
            <div className="w-8 h-8 rounded-[10px] bg-white/[0.06] ring-1 ring-inset ring-white/10 flex items-center justify-center shrink-0">
              <Image
                src="/assets/logo.png"
                alt="BLADUS"
                width={20}
                height={20}
                className="h-5 w-5 object-contain brightness-0 invert group-hover:scale-105 transition-transform duration-fast ease-out"
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-serif text-[1.0625rem] leading-none text-white">BLADUS</span>
                <span className="text-[11px] text-tertiary-300/90 leading-tight mt-1">{t("tagline")}</span>
              </div>
            )}
          </Link>

          {/* Desktop collapse / expand */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`hidden lg:flex items-center justify-center rounded-lg text-tertiary-300 hover:text-white hover:bg-white/[0.08] transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 ${
              isCollapsed ? "w-6 h-8" : "w-7 h-7"
            }`}
            title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
            aria-label={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            )}
          </button>

          {/* Mobile close button */}
          {isMobileOpen && onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-tertiary-300 hover:text-white hover:bg-white/[0.08] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300"
              aria-label={t("closeMenu")}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Scrollable navigation (accordion: one section open at a time) */}
        <nav
          aria-label={t("mainNavigation")}
          className={`flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 py-3 text-[13px] darna-admin-scrollbar ${
            isCollapsed ? "px-2" : "px-2.5"
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const label = tNav(item.labelKey);
            const hasSub = Boolean(item.subItems && item.subItems.length > 0);
            const isOpen = openSection === item.id;
            const subListId = `sidebar-sub-${item.id}`;
            const isParentActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) ||
                (hasSub && item.subItems!.some((s) => pathname.startsWith(s.href.split("?")[0])));

            return (
              <div key={item.id}>
                {/* Parent row */}
                <div className="relative flex items-center">
                  {/* Sliding active pill (shared layout across sections) */}
                  {isParentActive && (
                    <m.span
                      layoutId="sidebar-active-pill"
                      transition={spring.layout}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[10px] bg-white/[0.09] ring-1 ring-inset ring-white/[0.06]"
                    >
                      <span className="absolute start-0 top-2 bottom-2 w-[3px] rounded-e-full bg-accent-400" />
                    </m.span>
                  )}
                  <Link
                    href={item.href}
                    onClick={() => {
                      handleParentClick(item);
                      if (!hasSub && onMobileClose) onMobileClose();
                    }}
                    aria-current={(!hasSub || isCollapsed) && isParentActive ? "page" : undefined}
                    className={`relative flex-1 min-w-0 group flex items-center rounded-[10px] font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 ${
                      isParentActive ? "text-white" : "text-tertiary-200/85 hover:bg-white/[0.05] hover:text-white"
                    } ${isCollapsed ? "w-11 h-11 mx-auto justify-center px-0" : "gap-2.5 ps-3 pe-2 py-2 min-h-[38px]"}`}
                    title={isCollapsed ? label : undefined}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors duration-fast ${
                        isParentActive ? "text-accent-300" : "text-tertiary-300/80 group-hover:text-white"
                      }`}
                      aria-hidden="true"
                    />
                    {isCollapsed ? (
                      <span className="sr-only">{label}</span>
                    ) : (
                      <span className="flex-1 min-w-0 text-start leading-tight line-clamp-2 break-words" title={label}>
                        {label}
                      </span>
                    )}

                    {/* Count badge on parent (Validation, Messages) */}
                    {item.badge !== undefined && (
                      <>
                        <span
                          aria-hidden="true"
                          className={`shrink-0 min-w-[20px] h-[18px] px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold leading-none tabular-nums text-white ${
                            isCollapsed ? "absolute -top-0.5 -end-0.5 ring-2 ring-primary-800" : ""
                          } ${item.id === "moderation" ? "bg-accent-600" : "bg-secondary-700"}`}
                        >
                          {format.number(item.badge)}
                        </span>
                        <span className="sr-only">{t("pendingBadge", { count: item.badge })}</span>
                      </>
                    )}
                  </Link>

                  {/* Accordion chevron */}
                  {hasSub && !isCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSection((prev) => (prev === item.id ? null : item.id));
                      }}
                      className="relative shrink-0 w-7 h-7 flex items-center justify-center text-tertiary-300/80 hover:text-white rounded-md transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300"
                      aria-label={t("toggleSection", { section: label })}
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? subListId : undefined}
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 transition-transform duration-base ease-out ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {/* Sub-items: smooth reveal */}
                <AnimatePresence initial={false}>
                  {hasSub && isOpen && !isCollapsed && (
                    <m.div
                      key="sub"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1, transition: { duration: dur.base, ease: ease.out } }}
                      exit={{ height: 0, opacity: 0, transition: { duration: dur.fast, ease: ease.standard } }}
                      className="overflow-hidden"
                    >
                      <ul id={subListId} className="ms-[21px] ps-2.5 py-1 space-y-px border-s border-white/[0.08]">
                        {item.subItems!.map((sub) => {
                          const active = isCurrentSubActive(sub.href);
                          const subLabel = tNav(sub.labelKey);
                          return (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                onClick={onMobileClose}
                                aria-current={active ? "page" : undefined}
                                title={subLabel}
                                className={`group relative flex items-center justify-between gap-2 px-2.5 py-1.5 min-h-[32px] rounded-lg text-[12.5px] transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 ${
                                  active
                                    ? "bg-white/[0.07] text-white font-semibold"
                                    : "text-tertiary-200/75 hover:bg-white/[0.04] hover:text-white"
                                }`}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span
                                    aria-hidden="true"
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-fast ${
                                      active ? "bg-accent-400" : "bg-white/20 group-hover:bg-white/50"
                                    }`}
                                  />
                                  <span className="truncate">{subLabel}</span>
                                </span>
                                {sub.badge !== undefined && (
                                  <>
                                    <span
                                      aria-hidden="true"
                                      className="shrink-0 min-w-[20px] h-[18px] px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold leading-none bg-white/[0.1] text-tertiary-100 tabular-nums"
                                    >
                                      {format.number(sub.badge)}
                                    </span>
                                    <span className="sr-only">{t("pendingBadge", { count: sub.badge })}</span>
                                  </>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Pinned help card */}
        <div className="p-2.5 border-t border-white/[0.07]">
          <Link
            href="/help"
            onClick={onMobileClose}
            className={`block rounded-xl bg-white/[0.05] hover:bg-white/[0.09] ring-1 ring-inset ring-white/[0.06] transition-colors duration-fast p-2.5 group select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 ${
              isCollapsed ? "text-center" : ""
            }`}
            title={tNav("helpCenter")}
          >
            <div className={`flex items-center gap-2.5 ${isCollapsed ? "justify-center" : ""}`}>
              <div className="w-7 h-7 rounded-lg bg-secondary-400/15 flex items-center justify-center shrink-0 text-secondary-300 group-hover:scale-105 transition-transform duration-fast ease-out">
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
              </div>
              {isCollapsed ? (
                <span className="sr-only">{tNav("needHelp")}</span>
              ) : (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white leading-tight">{tNav("needHelp")}</span>
                  <span className="text-[11px] text-tertiary-300/90 leading-tight truncate">{tNav("helpCenter")}</span>
                </div>
              )}
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};
