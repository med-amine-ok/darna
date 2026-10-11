"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/navigation";
import { User, Organization } from "@/types";
import Avatar from "@/components/Avatar";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import {
  Bell,
  Menu,
  Briefcase,
  Building2,
} from "lucide-react";

interface HostNavbarProps {
  currentUser?: User | null;
  organization?: Organization | null;
}

export default function HostNavbar({ currentUser, organization }: HostNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAgency = currentUser?.hostType === "agency" || Boolean(organization);

  const navLinks = [
    { href: "/host", label: "Today", exact: true },
    { href: "/host/bookings", label: "Bookings" },
    { href: "/host/calendar", label: "Calendar" },
    { href: "/host/listings", label: "Listings" },
    { href: "/host/messages", label: "Messages" },
    { href: "/host/agency/team", label: "Team" },
    { href: "/host/agency/settings", label: "Agency" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-tertiary/60 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
        {/* Left: Brand + Identity */}
        <div className="flex items-center gap-4">
          <Link href="/host" className="flex items-center gap-2.5">
            <Image
              src="/assets/logo-horizontal.png"
              alt="DARNA"
              width={120}
              height={38}
              priority
              className="h-7 sm:h-8 w-auto object-contain"
            />
            <span className="px-2 py-0.5 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
              Host Mode
            </span>
          </Link>

          {/* Agency Badge if agency host */}
          {organization && (
            <div className="hidden lg:flex items-center gap-2 ps-3 border-s border-tertiary/50">
              <div className="relative w-6 h-6 rounded-md overflow-hidden bg-neutral-100">
                <Image
                  src={organization.logo || "/assets/logo-vertical.png"}
                  alt={organization.name}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xs font-semibold text-primary truncate max-w-[150px]">
                {organization.name}
              </span>
            </div>
          )}
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-tertiary/20 p-1 rounded-full border border-tertiary/40">
          {navLinks.map((link) => {
            const active = isActive(link.href, link.exact);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition select-none ${
                  active
                    ? "bg-white text-primary shadow-xs"
                    : "text-neutral-600 hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Switcher, Notifications & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Switch to Traveling Mode */}
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem("darna_mode", "traveler");
              } catch (e) {}
              router.push("/");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-tertiary/80 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-2xs btn-press"
            title="Switch to guest traveler mode"
          >
            <Briefcase size={15} className="text-secondary" />
            <span className="hidden sm:inline">Switch to traveling</span>
          </button>

          <LanguageSwitcher />

          {/* Notifications */}
          <Link
            href="/notifications"
            className="relative p-2 rounded-full hover:bg-neutral-100 text-primary transition btn-press"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-white" />
          </Link>

          {/* Host User Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 border border-tertiary rounded-full hover:shadow-darna transition flex items-center gap-2 bg-white btn-press"
              aria-label="Host menu"
            >
              <Menu size={16} className="text-neutral-600 ms-1.5" />
              <Avatar src={currentUser?.image} size={28} />
            </button>

            {menuOpen && (
              <div className="absolute end-0 top-12 w-56 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/60 py-2 z-50 text-xs text-neutral-700 animate-in fade-in">
                <div className="px-4 py-2 border-b border-tertiary/40">
                  <div className="font-bold text-primary">{currentUser?.name || "Host"}</div>
                  <div className="text-[11px] text-neutral-400 truncate">{currentUser?.email}</div>
                </div>

                <Link
                  href="/host/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 hover:bg-neutral-50 font-semibold"
                >
                  Host Settings & Payouts
                </Link>

                <Link
                  href="/become-a-host/1"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 hover:bg-neutral-50 font-semibold text-accent"
                >
                  + Create New Listing
                </Link>

                <hr className="my-1 border-tertiary/30" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/");
                  }}
                  className="w-full text-start px-4 py-2 hover:bg-neutral-50 font-semibold text-secondary flex items-center gap-1.5 btn-press"
                >
                  <Briefcase size={14} />
                  <span>Switch to traveling</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
