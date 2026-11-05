"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { m } from "framer-motion";
import { Link, usePathname, useRouter } from "@/navigation";
import { User, Organization } from "@/types";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import { Avatar, DropdownMenu, cn, focusRing } from "@/components/ui";
import type { DropdownItem } from "@/components/ui";
import { spring } from "@/lib/motion";
import { canHostOffer } from "@/lib/catalog-types";
import { switchWorkspaceAction } from "@/app/actions/organizations";
import { toast } from "react-toastify";
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
  /** Active workspace type (server host context); falls back to the user's host type. */
  hostType?: "individual" | "agency" | "hotel" | "hostel" | null;
  workspaces?: { id: string; name: string; businessCategory?: string }[];
}

interface HostNavLink {
  href: string;
  label: string;
  exact?: boolean;
}

/**
 * Host workspace header: warm paper glass, pill nav with a sliding active indicator.
 * Collapse rules (audit bug: 195px overflow at 820px): the text "Switch to traveling"
 * button only shows from xl (it is always in the user menu), the org switcher from lg,
 * and the pill nav can scroll inside itself instead of pushing the page wider.
 */
export default function HostNavbar({ currentUser, organization, hostType: workspaceType, workspaces = [] }: HostNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("hostNav");

  // What each workspace may publish comes from lib/catalog-types.ts (HOST_ALLOWED_OFFERS).
  const hostType: "individual" | "agency" | "hotel" | "hostel" = workspaceType || currentUser?.hostType || "individual";
  const isIndividual = hostType === "individual";
  const isOrg = !isIndividual;
  const isAgencyHost = canHostOffer(hostType, "trip");

  const soloNavLinks: HostNavLink[] = [
    { href: "/host/listings", label: t("tabs.myListings") },
    { href: "/host/bookings", label: t("tabs.bookings") },
  ];
  // Agencies: experiences (listings) + trips. Hotels/hostels: their property and room types.
  const enterprisePrimaryLinks: HostNavLink[] = [
    { href: "/host", label: t("tabs.today"), exact: true },
    { href: "/host/bookings", label: t("tabs.bookings") },
    { href: "/host/calendar", label: t("tabs.calendar") },
    { href: "/host/listings", label: isAgencyHost ? t("tabs.experiences") : t("tabs.property") },
    ...(isAgencyHost ? [{ href: "/host/agency/trips", label: t("tabs.trips") }] : []),
  ];
  const primaryLinks = isIndividual ? soloNavLinks : enterprisePrimaryLinks;

  const isActive = (href: string, exact = false) => (exact ? pathname === href : !!pathname?.startsWith(href));
  const isManageActive = !!(
    (pathname?.startsWith("/host/agency") && !pathname?.startsWith("/host/agency/trips")) ||
    pathname?.startsWith("/host/settings")
  );
  const isMessagesPage = !!pathname?.startsWith("/host/messages");

  const switchToTraveling = () => {
    try {
      localStorage.setItem("darna_mode", "traveler");
    } catch {}
    router.push("/");
  };

  const icon = (I: typeof BrandUsersIcon) => <I size={16} aria-hidden="true" className="text-secondary-700" />;

  const manageItems: DropdownItem[] = [
    { type: "label", label: t("workspaceOperations") },
    { label: t("teamMembers"), href: "/host/agency/team", icon: icon(BrandUsersIcon) },
    { label: t("orgSettings", { type: hostType }), href: "/host/agency/settings", icon: icon(BrandBuildingIcon) },
    { type: "separator" },
    { label: t("payoutsPreferences"), href: "/host/settings", icon: icon(BrandSettingsIcon) },
  ];

  const orgItems: DropdownItem[] = organization
    ? [
        { type: "label", label: t("orgWorkspace") },
        ...(isAgencyHost
          ? [{ label: t("agencyTrips"), href: "/host/agency/trips", icon: icon(BrandCompassIcon) } as DropdownItem]
          : []),
        { label: t("teamRoster"), href: "/host/agency/team", icon: icon(BrandUsersIcon) },
        { label: t("orgProfileSettings", { type: hostType }), href: "/host/agency/settings", icon: icon(BrandBuildingIcon) },
      ]
    : [];

  // Workspace switcher: shown when the user belongs to more than one organization.
  const otherWorkspaces = workspaces.filter((w) => w.id !== organization?.id);
  const switchTo = async (id: string) => {
    const result = await switchWorkspaceAction(id);
    if (!result.ok) {
      toast.error(t("switchFailed"));
      return;
    }
    router.push("/host");
    router.refresh();
  };
  const workspaceItems: DropdownItem[] = otherWorkspaces.length
    ? [
        { type: "label", label: t("switchWorkspace") },
        ...otherWorkspaces.map(
          (w) =>
            ({
              label: w.name,
              description: w.businessCategory ? t(`badge.${w.businessCategory}`) : undefined,
              onSelect: () => void switchTo(w.id),
              icon: icon(BrandBuildingIcon),
            }) as DropdownItem
        ),
        { type: "separator" },
      ]
    : [];

  const userItems: DropdownItem[] = [
    {
      type: "label",
      label: (
        <span className="block min-w-0 normal-case tracking-normal">
          <span className="block truncate text-sm font-semibold text-primary-900">{currentUser?.name || t("hostFallback")}</span>
          <span className="block truncate text-meta font-normal text-primary-600">{currentUser?.email}</span>
          {isOrg && organization && (
            <span className="mt-0.5 block truncate text-meta font-semibold text-secondary-700">{organization.name}</span>
          )}
        </span>
      ),
    },
    { type: "separator" },
    ...workspaceItems,
    {
      label: isAgencyHost ? t("createExperience") : isIndividual ? t("createListing") : t("addProperty"),
      href: isAgencyHost ? "/host/listings/new?offer=experience" : "/host/listings/new",
      icon: <BrandPlusIcon size={16} aria-hidden="true" className="text-accent-700" />,
    },
    ...(isAgencyHost
      ? [{ label: t("createTrip"), href: "/host/agency/trips/new", icon: icon(BrandCompassIcon) } as DropdownItem]
      : []),
    { label: t("hostSettingsPayouts"), href: "/host/settings", icon: icon(BrandSettingsIcon) },
    { type: "separator" },
    { label: t("switchToTraveling"), onSelect: switchToTraveling, icon: icon(BrandBriefcaseIcon) },
  ];

  const pillClass = (active: boolean) =>
    cn(
      "relative inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 lg:px-3.5 text-meta font-semibold select-none whitespace-nowrap",
      "transition-colors duration-fast ease-standard",
      focusRing,
      active ? "text-primary-900" : "text-primary-600 hover:text-primary-900"
    );

  const indicator = (
    <m.span
      layoutId="host-nav-indicator"
      transition={spring.layout}
      aria-hidden="true"
      className="absolute inset-0 -z-10 rounded-full bg-white shadow-e1"
    />
  );

  const iconBtn = (active: boolean) =>
    cn(
      "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard",
      focusRing,
      active ? "bg-primary/[0.08] text-primary-900" : "text-primary-700 hover:bg-primary/[0.06]"
    );

  return (
    <header className="sticky top-0 z-header glass border-b border-primary/[0.08]">
      <div
        className={cn(
          isMessagesPage ? "w-full px-4 sm:px-6" : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
          "flex h-16 items-center justify-between gap-2 md:gap-3"
        )}
      >
        {/* Brand + workspace badge + org switcher */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 lg:gap-3">
          <Link
            href={isIndividual ? "/host/listings" : "/host"}
            className={cn("flex items-center gap-2 rounded-xl select-none", focusRing)}
            title={t("homeTitle")}
          >
            <Image
              src="/assets/logo-horizontal.png"
              alt={t("logoAlt")}
              width={110}
              height={34}
              priority
              className="h-6 w-auto object-contain sm:h-7"
            />
            <span className="hidden h-6 items-center rounded-full bg-primary-800 px-2.5 sm:inline-flex md:hidden lg:inline-flex text-[0.6875rem] font-semibold text-white">
              {t(`badge.${hostType}`)}
            </span>
          </Link>

          {isOrg && organization && (
            <DropdownMenu
              align="start"
              ariaLabel={t("orgDetails", { name: organization.name })}
              wrapperClassName="hidden xl:inline-block"
              trigger={
                <button
                  type="button"
                  title={t("orgDetails", { name: organization.name })}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border-s border-primary/[0.08] ps-3 pe-2 text-meta font-semibold text-primary-800 hover:bg-primary/[0.05]",
                    "transition-colors duration-fast ease-standard",
                    focusRing
                  )}
                >
                  <span dir="auto" className="max-w-[10rem] truncate">{organization.name}</span>
                  <BrandChevronDownIcon size={14} aria-hidden="true" className="text-primary-500" />
                </button>
              }
              items={orgItems}
            />
          )}
        </div>

        {/* Primary nav (md+) */}
        <nav
          aria-label={t("primaryNav")}
          className="hidden min-w-0 md:flex"
        >
          <div className="isolate flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none rounded-full bg-primary/[0.05] p-1 ring-1 ring-inset ring-primary/[0.06]">
            {primaryLinks.map((link) => {
              const active = isActive(link.href, link.exact);
              return (
                <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={pillClass(active)}>
                  {active && indicator}
                  {link.label}
                </Link>
              );
            })}
            {isOrg && (
              <DropdownMenu
                align="start"
                ariaLabel={t("manage")}
                trigger={
                  <button type="button" className={pillClass(isManageActive)}>
                    {isManageActive && indicator}
                    <span>{t("manage")}</span>
                    <BrandChevronDownIcon size={13} aria-hidden="true" />
                  </button>
                }
                items={manageItems}
              />
            )}
          </div>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={switchToTraveling}
            title={t("switchToTravelingTitle")}
            className={cn(
              "hidden h-10 items-center gap-1.5 rounded-full bg-white px-4 text-meta font-semibold text-primary-800 shadow-e1 2xl:inline-flex",
              "transition-shadow duration-fast ease-standard hover:shadow-e2",
              focusRing
            )}
          >
            <BrandBriefcaseIcon size={15} aria-hidden="true" className="text-secondary-700" />
            <span>{t("switchToTraveling")}</span>
          </button>

          <Link
            href="/host/messages"
            title={t("tabs.messages")}
            aria-label={t("hostMessages")}
            aria-current={isMessagesPage ? "page" : undefined}
            className={iconBtn(isMessagesPage)}
          >
            <BrandMessageIcon size={19} aria-hidden="true" />
          </Link>

          <LanguageSwitcher />

          <Link href="/notifications" title={t("notifications")} aria-label={t("notifications")} className={iconBtn(false)}>
            <BrandBellIcon size={19} aria-hidden="true" />
            <span aria-hidden="true" className="absolute end-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-darnaBg" />
          </Link>

          <DropdownMenu
            align="end"
            ariaLabel={t("hostMenu")}
            className="w-80 max-w-[calc(100vw-1.5rem)]"
            wrapperClassName="ms-1"
            trigger={
              <button
                type="button"
                aria-label={t("hostMenu")}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-full bg-white ps-3 pe-1 shadow-e1",
                  "transition-shadow duration-fast ease-standard hover:shadow-e2",
                  focusRing
                )}
              >
                <BrandMenuIcon size={16} aria-hidden="true" className="text-primary-600" />
                <Avatar name={currentUser?.name || t("hostFallback")} src={currentUser?.image} size="sm" decorative />
              </button>
            }
            items={userItems}
          />
        </div>
      </div>
    </header>
  );
}
