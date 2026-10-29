"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/navigation";
import { useDialogA11y } from "@/hook/useDialogA11y";
import {
  BrandCloseIcon,
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

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function HostBottomNav({ hostType }: HostBottomNavProps) {
  const t = useTranslations("hostNav");
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTitleId = useId();
  const sheetRef = useDialogA11y<HTMLDivElement>(sheetOpen, { onEscape: () => setSheetOpen(false) });

  const isIndividual = hostType === "individual" || !hostType;
  const isAgency = hostType === "agency";
  const orgType = hostType || "agency";

  const soloTabs: HostTab[] = [
    { href: "/host/listings", label: t("tabs.listings"), icon: BrandGridIcon },
    { href: "/host/bookings", label: t("tabs.bookings"), icon: BrandBookingsIcon },
    { href: "/host/messages", label: t("tabs.messages"), icon: BrandMessageIcon },
  ];

  const enterpriseTabs: HostTab[] = [
    { href: "/host", label: t("tabs.today"), icon: BrandHomeIcon, exact: true },
    { href: "/host/bookings", label: t("tabs.bookings"), icon: BrandBookingsIcon },
    { href: "/host/calendar", label: t("tabs.calendar"), icon: BrandCalendarIcon },
    { href: "/host/listings", label: t("tabs.listings"), icon: BrandGridIcon },
  ];

  const tabs: HostTab[] = isIndividual ? soloTabs : enterpriseTabs;

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  const isMoreActive =
    pathname?.startsWith("/host/agency") ||
    pathname === "/host/settings" ||
    (!isIndividual && pathname?.startsWith("/host/messages"));

  // Hide bottom navigation on host messages (full-screen messaging app)
  if (pathname?.includes("/host/messages")) {
    return null;
  }

  const sheetLinkClass = (active: boolean | undefined) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${focusRing} ${
      active ? "bg-primary/10 text-primary font-bold" : "hover:bg-neutral-50 text-neutral-700"
    }`;

  return (
    <>
      {/* Mobile slide-up "More" sheet */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
            aria-hidden="true"
            onClick={() => setSheetOpen(false)}
          />

          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
            className="relative bg-white rounded-t-3xl border-t border-tertiary/70 p-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/40 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-neutral-300 mx-auto" aria-hidden="true" />
                <h2 id={sheetTitleId} className="font-serif font-black text-primary text-base">
                  {t("mobileNav")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className={`p-1 rounded-full hover:bg-neutral-100 text-neutral-600 ${focusRing}`}
                aria-label={t("closeMenu")}
              >
                <BrandCloseIcon size={18} aria-hidden="true" />
              </button>
            </div>

            <nav aria-labelledby={sheetTitleId} className="space-y-1 text-sm">
              {!isIndividual && (
                <Link
                  href="/host/messages"
                  onClick={() => setSheetOpen(false)}
                  className={sheetLinkClass(pathname?.startsWith("/host/messages"))}
                >
                  <BrandMessageIcon size={18} className="text-secondary" aria-hidden="true" />
                  <span>{t("messagesInquiries")}</span>
                </Link>
              )}

              {isAgency && (
                <Link
                  href="/host/agency/trips"
                  onClick={() => setSheetOpen(false)}
                  className={sheetLinkClass(pathname?.startsWith("/host/agency/trips"))}
                >
                  <BrandCompassIcon size={18} className="text-secondary" aria-hidden="true" />
                  <span>{t("agencyTrips")}</span>
                </Link>
              )}

              {!isIndividual && (
                <Link
                  href="/host/agency/team"
                  onClick={() => setSheetOpen(false)}
                  className={sheetLinkClass(pathname?.startsWith("/host/agency/team"))}
                >
                  <BrandUsersIcon size={18} className="text-secondary" aria-hidden="true" />
                  <span>{t("teamRoles")}</span>
                </Link>
              )}

              {!isIndividual && (
                <Link
                  href="/host/agency/settings"
                  onClick={() => setSheetOpen(false)}
                  className={sheetLinkClass(pathname?.startsWith("/host/agency/settings"))}
                >
                  <BrandBuildingIcon size={18} className="text-secondary" aria-hidden="true" />
                  <span>{t("orgProfileSettings", { type: orgType })}</span>
                </Link>
              )}

              <Link
                href="/host/settings"
                onClick={() => setSheetOpen(false)}
                className={sheetLinkClass(pathname === "/host/settings")}
              >
                <BrandSettingsIcon size={18} className="text-secondary" aria-hidden="true" />
                <span>{t("hostSettingsPayouts")}</span>
              </Link>

              <hr className="my-2 border-tertiary/40" />

              <Link
                href="/become-a-host/1"
                onClick={() => setSheetOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-accent-700 font-bold hover:bg-neutral-50 transition ${focusRing}`}
              >
                <BrandPlusIcon size={18} aria-hidden="true" />
                <span>{t("createListing")}</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  try {
                    localStorage.setItem("darna_mode", "traveler");
                  } catch {}
                  router.push("/");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary font-bold hover:bg-neutral-50 transition ${focusRing}`}
              >
                <BrandBriefcaseIcon size={18} aria-hidden="true" />
                <span>{t("switchToTravelingMode")}</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Persistent bottom bar */}
      <nav
        aria-label={t("primaryNav")}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-tertiary/60 h-16 flex items-center justify-around select-none pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.exact);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 transition ${focusRing} ${
                active ? "text-primary font-bold scale-105" : "text-neutral-600 hover:text-neutral-800"
              }`}
            >
              <Icon size={20} aria-hidden="true" className={active ? "text-primary" : "text-neutral-500"} />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label={t("moreOptions")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 transition cursor-pointer ${focusRing} ${
            isMoreActive || sheetOpen
              ? "text-primary font-bold scale-105"
              : "text-neutral-600 hover:text-neutral-800"
          }`}
        >
          <BrandMoreIcon
            size={20}
            aria-hidden="true"
            className={isMoreActive || sheetOpen ? "text-primary" : "text-neutral-500"}
          />
          <span className="text-[10px] leading-none" aria-hidden="true">
            {t("tabs.more")}
          </span>
        </button>
      </nav>
    </>
  );
}
