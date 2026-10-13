"use client";

import React, { useState } from "react";
import { Link, usePathname, useRouter } from "@/navigation";
import {
  Home,
  CalendarCheck,
  Calendar,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Compass,
  Users,
  Building2,
  Settings,
  Plus,
  Briefcase,
  X,
  LucideIcon,
} from "lucide-react";

interface HostBottomNavProps {
  hostType?: "individual" | "agency" | "hotel" | "hostel" | null;
}

interface HostTab {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export default function HostBottomNav({ hostType }: HostBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isIndividual = hostType === "individual" || !hostType;
  const isAgency = hostType === "agency";
  const orgLabel =
    hostType === "hotel" ? "Hotel" : hostType === "hostel" ? "Hostel" : "Agency";

  const soloTabs: HostTab[] = [
    { href: "/host/listings", label: "Listings", icon: LayoutGrid },
    { href: "/host/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/host/messages", label: "Messages", icon: MessageSquare },
  ];

  const enterpriseTabs: HostTab[] = [
    { href: "/host", label: "Today", icon: Home, exact: true },
    { href: "/host/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/host/calendar", label: "Calendar", icon: Calendar },
    { href: "/host/listings", label: "Listings", icon: LayoutGrid },
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

  return (
    <>
      {/* Mobile Slide-Up "More" Sheet */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setSheetOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="relative bg-white rounded-t-3xl border-t border-tertiary/70 p-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200">
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/40 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-neutral-300 mx-auto" />
                <span className="font-serif font-black text-primary text-base">
                  Host Workspace Navigation
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 text-sm">
              {/* Messages (for enterprise hosts) */}
              {!isIndividual && (
                <Link
                  href="/host/messages"
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                    pathname?.startsWith("/host/messages")
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <MessageSquare size={18} className="text-secondary" />
                  <span>Messages & Guest Inquiries</span>
                </Link>
              )}

              {/* Agency Trips Vertical */}
              {isAgency && (
                <Link
                  href="/host/agency/trips"
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                    pathname?.startsWith("/host/agency/trips")
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Compass size={18} className="text-secondary" />
                  <span>Agency Trips & Circuits</span>
                </Link>
              )}

              {/* Team Members */}
              {!isIndividual && (
                <Link
                  href="/host/agency/team"
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                    pathname?.startsWith("/host/agency/team")
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Users size={18} className="text-secondary" />
                  <span>Team Members & Roles</span>
                </Link>
              )}

              {/* Organization Settings */}
              {!isIndividual && (
                <Link
                  href="/host/agency/settings"
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                    pathname?.startsWith("/host/agency/settings")
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Building2 size={18} className="text-secondary" />
                  <span>{orgLabel} Profile & Settings</span>
                </Link>
              )}

              {/* Host Settings & Payouts */}
              <Link
                href="/host/settings"
                onClick={() => setSheetOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  pathname === "/host/settings"
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <Settings size={18} className="text-secondary" />
                <span>Host Settings & Payouts</span>
              </Link>

              <hr className="my-2 border-tertiary/40" />

              {/* Create Listing */}
              <Link
                href="/become-a-host/1"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-accent font-bold hover:bg-neutral-50 transition"
              >
                <Plus size={18} />
                <span>+ Create New Listing</span>
              </Link>

              {/* Switch to Traveling */}
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  try {
                    localStorage.setItem("darna_mode", "traveler");
                  } catch (e) {}
                  router.push("/");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary font-bold hover:bg-neutral-50 transition"
              >
                <Briefcase size={18} />
                <span>Switch to traveling mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-tertiary/60 h-16 flex items-center justify-around select-none pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.exact);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 transition ${
                active ? "text-primary font-bold scale-105" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Icon size={20} className={active ? "text-primary" : "text-neutral-400"} />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Tab */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 transition cursor-pointer ${
            isMoreActive || sheetOpen
              ? "text-primary font-bold scale-105"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
          aria-label="More workspace options"
        >
          <MoreHorizontal
            size={20}
            className={isMoreActive || sheetOpen ? "text-primary" : "text-neutral-400"}
          />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </nav>
    </>
  );
}
