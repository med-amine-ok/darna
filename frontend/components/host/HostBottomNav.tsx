"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "@/navigation";
import {
  Home,
  CalendarCheck,
  Calendar,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";

export default function HostBottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: "/host", label: "Today", icon: Home, exact: true },
    { href: "/host/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/host/calendar", label: "Calendar", icon: Calendar },
    { href: "/host/listings", label: "Listings", icon: LayoutGrid },
    { href: "/host/messages", label: "Messages", icon: MessageSquare },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
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
            <Icon size={22} className={active ? "text-primary" : "text-neutral-400"} />
            <span className="text-[10px] leading-none">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
