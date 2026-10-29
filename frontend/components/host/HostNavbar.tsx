"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/navigation";
import { User, Organization } from "@/types";
import Avatar from "@/components/Avatar";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import {
  BrandBellIcon,
  BrandMenuIcon,
  BrandBriefcaseIcon,
  BrandBuildingIcon,
  BrandMessageIcon,
  BrandUsersIcon,
  BrandSettingsIcon,
  BrandCompassIcon,
  BrandPlusIcon,
  BrandChevronDownIcon,
} from "@/components/icons";

interface HostNavbarProps {
  currentUser?: User | null;
  organization?: Organization | null;
}

export default function HostNavbar({ currentUser, organization }: HostNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgMenuRef = useRef<HTMLDivElement>(null);
  const manageMenuRef = useRef<HTMLDivElement>(null);

  const isIndividual = currentUser?.hostType === "individual" || !currentUser?.hostType;
  const isOrg =
    currentUser?.hostType === "agency" ||
    currentUser?.hostType === "hotel" ||
    currentUser?.hostType === "hostel";

  const isAgencyHost = currentUser?.hostType === "agency";

  const t = useTranslations("hostNav");
  const hostType: "individual" | "agency" | "hotel" | "hostel" = currentUser?.hostType || "individual";
  const orgMenuId = useId();
  const manageMenuId = useId();
  const userMenuId = useId();

  interface HostNavLink {
    href: string;
    label: string;
    exact?: boolean;
  }

  // Primary operational links - Miller's Law (4 daily/weekly items)
  const soloNavLinks: HostNavLink[] = [
    { href: "/host/listings", label: t("tabs.myListings") },
    { href: "/host/bookings", label: t("tabs.bookings") },
  ];

  const enterprisePrimaryLinks: HostNavLink[] = [
    { href: "/host", label: t("tabs.today"), exact: true },
    { href: "/host/bookings", label: t("tabs.bookings") },
    { href: "/host/calendar", label: t("tabs.calendar") },
    { href: "/host/listings", label: t("tabs.listings") },
  ];

  const primaryLinks = isIndividual ? soloNavLinks : enterprisePrimaryLinks;

  // Manage dropdown items (Team, Org Settings, and Trips for Agency)
  const isManageActive =
    pathname?.startsWith("/host/agency") || pathname?.startsWith("/host/settings");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setOrgMenuOpen(false);
      }
      if (manageMenuRef.current && !manageMenuRef.current.contains(event.target as Node)) {
        setManageMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setUserMenuOpen(false);
      setOrgMenuOpen(false);
      setManageMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  const isMessagesPage = pathname?.startsWith("/host/messages");
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

  const switchToTraveling = () => {
    try {
      localStorage.setItem("darna_mode", "traveler");
    } catch {}
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-tertiary/60 shadow-xs">
      <div
        className={`${
          isMessagesPage ? "w-full px-4 sm:px-6" : "max-w-7xl mx-auto px-4 sm:px-8"
        } py-2.5 sm:py-3 flex items-center justify-between gap-2`}
      >
        {/* Left: Brand + Interactive Org Badge */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link
            href={isIndividual ? "/host/listings" : "/host"}
            className={`flex items-center gap-2 select-none rounded-lg ${focusRing}`}
            title={t("homeTitle")}
          >
            <Image
              src="/assets/logo-horizontal.png"
              alt={t("logoAlt")}
              width={110}
              height={34}
              priority
              className="h-6 sm:h-7 w-auto object-contain"
            />
            <span className="px-2 py-0.5 bg-primary text-white rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              {t(`badge.${hostType}`)}
            </span>
          </Link>

          {/* Interactive Organization Badge & Dropdown (Proximity Law) */}
          {isOrg && organization && (
            <div className="relative hidden lg:block" ref={orgMenuRef}>
              <button
                type="button"
                onClick={() => setOrgMenuOpen(!orgMenuOpen)}
                className={`flex items-center gap-2 ps-3 pe-2 py-1 rounded-xl border-s border-tertiary/50 hover:bg-neutral-50 transition cursor-pointer select-none ${focusRing}`}
                title={t("orgDetails", { name: organization.name })}
                aria-haspopup="true"
                aria-expanded={orgMenuOpen}
                aria-controls={orgMenuId}
              >
                <span className="text-xs font-semibold text-primary truncate max-w-[140px]">
                  {organization.name}
                </span>
                
                <BrandChevronDownIcon
                  size={14}
                  aria-hidden="true"
                  className={`text-neutral-500 transition-transform ${
                    orgMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Org Dropdown Menu */}
              {orgMenuOpen && (
                <div id={orgMenuId} className="absolute start-3 top-10 w-64 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-2 z-50 text-xs text-neutral-700 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-tertiary/40">
                    <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider block">
                      {t("orgWorkspace")}
                    </span>
                    <div className="font-bold text-primary text-sm mt-0.5 truncate">
                      {organization.name}
                    </div>
                    <span className="text-[11px] text-neutral-600">
                      {t(`archetype.${hostType}`)}
                    </span>
                  </div>

                  <div className="py-1">
                    {isAgencyHost && (
                      <Link
                        href="/host/agency/trips"
                        onClick={() => setOrgMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-4 py-2 hover:bg-neutral-50 font-semibold text-primary ${focusRing}`}
                      >
                        <BrandCompassIcon size={15} className="text-secondary shrink-0" />
                        <span>{t("agencyTrips")}</span>
                      </Link>
                    )}

                    <Link
                      href="/host/agency/team"
                      onClick={() => setOrgMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 hover:bg-neutral-50 font-semibold text-primary ${focusRing}`}
                    >
                      <BrandUsersIcon size={15} className="text-secondary shrink-0" />
                      <span>{t("teamRoster")}</span>
                    </Link>

                    <Link
                      href="/host/agency/settings"
                      onClick={() => setOrgMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 hover:bg-neutral-50 font-semibold text-primary ${focusRing}`}
                    >
                      <BrandBuildingIcon size={15} className="text-secondary shrink-0" />
                      <span>{t("orgProfileSettings", { type: hostType })}</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Desktop Primary Nav Links (Max 4-5 items, uncluttered) */}
        <nav aria-label={t("primaryNav")} className="hidden md:flex items-center gap-1 bg-tertiary/20 p-1 rounded-full border border-tertiary/40">
          {primaryLinks.map((link) => {
            const active = isActive(link.href, link.exact);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition select-none ${focusRing} ${
                  active
                    ? "bg-white text-primary shadow-xs"
                    : "text-neutral-600 hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Manage / Workspace Overflow Dropdown for Enterprise/Org Hosts */}
          {isOrg && (
            <div className="relative" ref={manageMenuRef}>
              <button
                type="button"
                onClick={() => setManageMenuOpen(!manageMenuOpen)}
                aria-haspopup="true"
                aria-expanded={manageMenuOpen}
                aria-controls={manageMenuId}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition select-none cursor-pointer ${focusRing} ${
                  isManageActive || manageMenuOpen
                    ? "bg-white text-primary shadow-xs"
                    : "text-neutral-600 hover:text-primary"
                }`}
              >
                <span>{t("manage")}</span>
                <BrandChevronDownIcon
                  size={13}
                  aria-hidden="true"
                  className={`transition-transform duration-150 ${
                    manageMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {manageMenuOpen && (
                <div id={manageMenuId} className="absolute start-0 top-9 w-56 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-1.5 z-50 text-xs text-neutral-700 animate-in fade-in">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                    {t("workspaceOperations")}
                  </div>

                  {isAgencyHost && (
                    <Link
                      href="/host/agency/trips"
                      onClick={() => setManageMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 font-semibold transition ${focusRing} ${
                        pathname?.startsWith("/host/agency/trips")
                          ? "bg-primary/5 text-primary font-bold"
                          : "hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <BrandCompassIcon size={15} className="text-secondary shrink-0" />
                      <span>{t("tripsExpeditions")}</span>
                    </Link>
                  )}

                  <Link
                    href="/host/agency/team"
                    onClick={() => setManageMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 font-semibold transition ${focusRing} ${
                      pathname?.startsWith("/host/agency/team")
                        ? "bg-primary/5 text-primary font-bold"
                        : "hover:bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    <BrandUsersIcon size={15} className="text-secondary shrink-0" />
                    <span>{t("teamMembers")}</span>
                  </Link>

                  <Link
                    href="/host/agency/settings"
                    onClick={() => setManageMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 font-semibold transition ${focusRing} ${
                      pathname?.startsWith("/host/agency/settings")
                        ? "bg-primary/5 text-primary font-bold"
                        : "hover:bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    <BrandBuildingIcon size={15} className="text-secondary shrink-0" />
                    <span>{t("orgSettings", { type: hostType })}</span>
                  </Link>

                  <hr className="my-1 border-tertiary/30" />

                  <Link
                    href="/host/settings"
                    onClick={() => setManageMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 font-semibold transition ${focusRing} ${
                      pathname === "/host/settings"
                        ? "bg-primary/5 text-primary font-bold"
                        : "hover:bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    <BrandSettingsIcon size={15} className="text-secondary shrink-0" />
                    <span>{t("payoutsPreferences")}</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right: Switcher, Messages, Notifications & User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Switch to Traveling Mode */}
          <button
            type="button"
            onClick={switchToTraveling}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-tertiary/80 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-2xs btn-press ${focusRing}`}
            title={t("switchToTravelingTitle")}
          >
            <BrandBriefcaseIcon size={14} className="text-secondary" aria-hidden="true" />
            <span>{t("switchToTraveling")}</span>
          </button>

          {/* Messages icon button (Jakob's Law - separated from inventory tabs) */}
          <Link
            href="/host/messages"
            className={`relative p-2 rounded-full transition btn-press ${focusRing} ${
              pathname?.startsWith("/host/messages")
                ? "bg-primary/10 text-primary font-bold"
                : "hover:bg-neutral-100 text-neutral-700"
            }`}
            title={t("tabs.messages")}
            aria-label={t("hostMessages")}
            aria-current={isMessagesPage ? "page" : undefined}
          >
            <BrandMessageIcon size={18} aria-hidden="true" />
          </Link>

          <LanguageSwitcher />

          {/* Notifications */}
          <Link
            href="/notifications"
            className={`relative p-2 rounded-full hover:bg-neutral-100 text-neutral-700 transition btn-press ${focusRing}`}
            title={t("notifications")}
            aria-label={t("notifications")}
          >
            <BrandBellIcon size={18} aria-hidden="true" />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-white" />
          </Link>

          {/* Host User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`p-1 border border-tertiary rounded-full hover:shadow-darna transition flex items-center gap-1.5 bg-white btn-press ${focusRing}`}
              aria-label={t("hostMenu")}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              aria-controls={userMenuId}
            >
              <BrandMenuIcon size={16} aria-hidden="true" className="text-neutral-600 ms-1.5" />
              <Avatar src={currentUser?.image} size={28} />
            </button>

            {userMenuOpen && (
              <div id={userMenuId} className="absolute end-0 top-12 w-60 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-2 z-50 text-xs text-neutral-700 animate-in fade-in">
                <div className="px-4 py-2 border-b border-tertiary/40">
                  <div className="font-bold text-primary text-sm truncate">
                    {currentUser?.name || t("hostFallback")}
                  </div>
                  <div className="text-[11px] text-neutral-600 truncate">{currentUser?.email}</div>
                  {isOrg && organization && (
                    <div className="mt-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
                      {organization.name}
                    </div>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    href="/become-a-host/1"
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 font-bold text-accent-700 ${focusRing}`}
                  >
                    <BrandPlusIcon size={15} />
                    <span>{t("createListing")}</span>
                  </Link>

                  {isAgencyHost && (
                    <Link
                      href="/host/agency/trips/new"
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 font-semibold text-primary ${focusRing}`}
                    >
                      <BrandCompassIcon size={15} className="text-secondary" />
                      <span>{t("createCircuit")}</span>
                    </Link>
                  )}

                  <Link
                    href="/host/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 font-semibold text-neutral-700 ${focusRing}`}
                  >
                    <BrandSettingsIcon size={15} className="text-secondary" />
                    <span>{t("hostSettingsPayouts")}</span>
                  </Link>
                </div>

                <hr className="my-1 border-tertiary/30" />

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    switchToTraveling();
                  }}
                  className={`w-full text-start px-4 py-2 hover:bg-neutral-50 font-semibold text-secondary flex items-center gap-2 btn-press ${focusRing}`}
                >
                  <BrandBriefcaseIcon size={15} aria-hidden="true" />
                  <span>{t("switchToTraveling")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
