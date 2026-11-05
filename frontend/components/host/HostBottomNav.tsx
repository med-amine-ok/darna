"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";
import { Link, usePathname, useRouter } from "@/navigation";
import { Sheet, cn, focusRingInset } from "@/components/ui";
import { spring } from "@/lib/motion";
import { canHostOffer } from "@/lib/catalog-types";
import {
  BrandHomeIcon,
  BrandBookingsIcon,
  BrandCalendarIcon,
  BrandGridIcon,
  BrandMessageIcon,
  BrandMoreIcon,
  BrandCompassIcon,
  BrandUsersIcon,
  BrandBuildingIcon,
  BrandSettingsIcon,
  BrandPlusIcon,
  BrandBriefcaseIcon,
  BrandChevronRightIcon,
  IconProps,
} from "@/components/icons";

interface HostBottomNavProps {
  hostType?: "individual" | "agency" | "hotel" | "hostel" | null;
}

interface HostTab {
  href: string;
  label: string;
  icon: React.FC<IconProps>;
  exact?: boolean;
}

/** Phone tab bar for host mode: glass, sliding pill behind the active icon, "More" opens a kit Sheet. */
export default function HostBottomNav({ hostType }: HostBottomNavProps) {
  const t = useTranslations("hostNav");
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isIndividual = hostType === "individual" || !hostType;
  // Agencies publish experiences + trips, hotels/hostels their property (lib/catalog-types.ts).
  const isAgency = canHostOffer(hostType, "trip");
  const orgType = hostType || "agency";

  const soloTabs: HostTab[] = [
    { href: "/host/listings", label: t("tabs.listings"), icon: BrandGridIcon },
    { href: "/host/bookings", label: t("tabs.bookings"), icon: BrandBookingsIcon },
    { href: "/host/messages", label: t("tabs.messages"), icon: BrandMessageIcon },
  ];
  const enterpriseTabs: HostTab[] = isAgency
    ? [
        { href: "/host", label: t("tabs.today"), icon: BrandHomeIcon, exact: true },
        { href: "/host/bookings", label: t("tabs.bookings"), icon: BrandBookingsIcon },
        { href: "/host/listings", label: t("tabs.experiences"), icon: BrandGridIcon },
        { href: "/host/agency/trips", label: t("tabs.trips"), icon: BrandCompassIcon },
      ]
    : [
        { href: "/host", label: t("tabs.today"), icon: BrandHomeIcon, exact: true },
        { href: "/host/bookings", label: t("tabs.bookings"), icon: BrandBookingsIcon },
        { href: "/host/calendar", label: t("tabs.calendar"), icon: BrandCalendarIcon },
        { href: "/host/listings", label: t("tabs.property"), icon: BrandGridIcon },
      ];
  const tabs = isIndividual ? soloTabs : enterpriseTabs;

  const isActive = (href: string, exact = false) => (exact ? pathname === href : !!pathname?.startsWith(href));
  const isMoreActive =
    (!!pathname?.startsWith("/host/agency") && !(isAgency && pathname?.startsWith("/host/agency/trips"))) ||
    (isAgency && !!pathname?.startsWith("/host/calendar")) ||
    pathname === "/host/settings" ||
    (!isIndividual && !!pathname?.startsWith("/host/messages"));

  if (pathname?.includes("/host/messages")) return null;

  const close = () => setSheetOpen(false);

  const sheetLink = (href: string, label: string, Icon: React.FC<IconProps>, active: boolean) => (
    <Link
      href={href}
      onClick={close}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-body font-medium transition-colors duration-fast ease-standard",
        focusRingInset,
        active ? "bg-primary/[0.07] text-primary-900" : "text-primary-800 hover:bg-primary/[0.04]"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-secondary-800">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <BrandChevronRightIcon size={16} aria-hidden="true" className="text-primary-400 rtl:rotate-180" />
    </Link>
  );

  const tabClass = (active: boolean) =>
    cn(
      "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl touch-manipulation select-none",
      "transition-colors duration-fast ease-standard",
      focusRingInset,
      active ? "text-primary-900" : "text-primary-600 hover:text-primary-800"
    );

  const pill = (
    <m.span
      layoutId="host-bottom-indicator"
      transition={spring.layout}
      aria-hidden="true"
      className="absolute inset-x-1.5 inset-y-1 -z-10 rounded-2xl bg-primary/[0.07]"
    />
  );

  return (
    <>
      <Sheet isOpen={sheetOpen} onClose={close} title={t("mobileNav")} size="sm">
        <nav aria-label={t("mobileNav")} className="space-y-1 pb-2">
          {!isIndividual &&
            sheetLink("/host/messages", t("messagesInquiries"), BrandMessageIcon, !!pathname?.startsWith("/host/messages"))}
          {isAgency &&
            sheetLink("/host/calendar", t("tabs.calendar"), BrandCalendarIcon, !!pathname?.startsWith("/host/calendar"))}
          {!isIndividual &&
            sheetLink("/host/agency/team", t("teamRoles"), BrandUsersIcon, !!pathname?.startsWith("/host/agency/team"))}
          {!isIndividual &&
            sheetLink(
              "/host/agency/settings",
              t("orgProfileSettings", { type: orgType }),
              BrandBuildingIcon,
              !!pathname?.startsWith("/host/agency/settings")
            )}
          {sheetLink("/host/settings", t("hostSettingsPayouts"), BrandSettingsIcon, pathname === "/host/settings")}

          <div className="my-2 h-px bg-primary/[0.08]" aria-hidden="true" />

          <Link
            href={isAgency ? "/host/listings/new?offer=experience" : "/host/listings/new"}
            onClick={close}
            className={cn(
              "flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-body font-semibold text-accent-700 hover:bg-accent-50",
              focusRingInset
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
              <BrandPlusIcon size={18} aria-hidden="true" />
            </span>
            {isAgency ? t("createExperience") : isIndividual ? t("createListing") : t("addProperty")}
          </Link>
          {isAgency && (
            <Link
              href="/host/agency/trips/new"
              onClick={close}
              className={cn(
                "flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-body font-semibold text-accent-700 hover:bg-accent-50",
                focusRingInset
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                <BrandCompassIcon size={18} aria-hidden="true" />
              </span>
              {t("createTrip")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              close();
              try {
                localStorage.setItem("darna_mode", "traveler");
              } catch {}
              router.push("/");
            }}
            className={cn(
              "flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-start text-body font-medium text-primary-800 hover:bg-primary/[0.04]",
              focusRingInset
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tertiary-100 text-primary-700">
              <BrandBriefcaseIcon size={18} aria-hidden="true" />
            </span>
            {t("switchToTravelingMode")}
          </button>
        </nav>
      </Sheet>

      <nav
        aria-label={t("primaryNav")}
        className="glass fixed inset-x-0 bottom-0 z-header border-t border-primary/[0.08] pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="isolate mx-auto flex h-16 max-w-xl items-stretch px-1.5 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href, tab.exact);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                {active && pill}
                <Icon size={21} strokeWidth={active ? 2.1 : 1.75} aria-hidden="true" />
                <span className={cn("text-[0.6875rem] leading-none", active ? "font-semibold" : "font-medium")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label={t("moreOptions")}
            className={tabClass(isMoreActive || sheetOpen)}
          >
            {isMoreActive && pill}
            <BrandMoreIcon size={21} aria-hidden="true" />
            <span aria-hidden="true" className="text-[0.6875rem] font-medium leading-none">
              {t("tabs.more")}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
