"use client";

import React, { useState } from "react";
import { Link, useRouter, usePathname } from "@/navigation";
import {
  Menu,
  Search,
  Bell,
  CheckSquare,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Sparkles,
  ChevronDown,
  User,
  Check,
} from "lucide-react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { SessionPayload } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { useLocale, useTranslations } from "next-intl";

export interface HeaderProps {
  currentUser?: SessionPayload | null;
  onMobileMenuToggle: () => void;
  onOpenCommandPalette: () => void;
  approvalsCount?: number;
  onOpenHelp?: () => void;
  onStartTour?: () => void;
  isTrainingMode?: boolean;
  onToggleTrainingMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onMobileMenuToggle,
  onOpenCommandPalette,
  approvalsCount = 0,
  onOpenHelp,
  onStartTour,
  isTrainingMode = false,
  onToggleTrainingMode,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as "en" | "fr" | "ar";
  const tHeader = useTranslations("header");

  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([
    {
      id: "notif_1",
      title: "Nouvelle demande de validation",
      description: "Villa les Oliviers (Ahmed Benali) à Tizi Ouzou",
      time: "Il y a 10 min",
      read: false,
    },
    {
      id: "notif_2",
      title: "Voyage en attente d'approbation",
      description: "Expédition Tassili n'Ajjer par Sahara Tours",
      time: "Il y a 45 min",
      read: false,
    },
    {
      id: "notif_3",
      title: "Signalement d'avis client",
      description: "Commentaire signalé sur Hôtel El Aurassi",
      time: "Il y a 2 heures",
      read: false,
    },
  ]);

  const handleLogout = async () => {
    document.cookie = "darna_admin_session=; path=/; max-age=0";
    router.replace("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      onOpenCommandPalette();
    }
  };

  const markAllNotificationsAsRead = () => {
    setUnreadNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = unreadNotifications.filter((n) => !n.read).length;

  const getPlaceholder = () => {
    if (pathname.startsWith("/trips")) {
      return locale === "fr"
        ? "Rechercher un voyage, une destination, un organisateur..."
        : locale === "ar"
        ? "البحث عن رحلة، وجهة، أو منظم..."
        : "Search a trip, destination, organiser...";
    }
    if (pathname.startsWith("/stays")) {
      return locale === "fr"
        ? "Rechercher un hébergement, un hôte, une ville..."
        : locale === "ar"
        ? "البحث عن سكن، مضيف، أو مدينة..."
        : "Search an accommodation, host, city...";
    }
    if (pathname.startsWith("/experiences")) {
      return locale === "fr"
        ? "Rechercher une expérience, un guide, une ville..."
        : locale === "ar"
        ? "البحث عن تجربة، مرشد، أو مدينة..."
        : "Search an experience, guide, city...";
    }
    if (pathname.startsWith("/cars")) {
      return locale === "fr"
        ? "Rechercher une voiture, une ville, une catégorie..."
        : locale === "ar"
        ? "البحث عن سيارة، مدينة، أو فئة..."
        : "Search a car, city, category...";
    }
    if (pathname.startsWith("/bookings")) {
      return locale === "fr"
        ? "Rechercher une réservation, un client, un hébergement..."
        : locale === "ar"
        ? "البحث عن حجز، عميل، أو سكن..."
        : "Search a booking, customer, accommodation...";
    }
    if (pathname.startsWith("/moderation")) {
      return locale === "fr"
        ? "Rechercher un prestataire, une agence, un hôtel..."
        : locale === "ar"
        ? "البحث عن مقدم خدمة، وكالة، أو فندق..."
        : "Search a provider, agency, hotel...";
    }
    return locale === "fr"
      ? "Rechercher un hébergement, un voyage, une expérience, une agence, un hôtel, une voiture..."
      : locale === "ar"
      ? "البحث عن سكن، رحلة، تجربة، وكالة، فندق، سيارة..."
      : "Search an accommodation, trip, experience, agency, hotel, car...";
  };

  const userRole = currentUser?.role || "super_admin";
  const roleName =
    userRole === "super_admin"
      ? locale === "fr"
        ? "Super administrateur"
        : locale === "ar"
        ? "مسؤول فائق"
        : "Super Administrator"
      : ROLE_LABELS[userRole]?.[locale] || "Super administrateur";

  const userName = currentUser?.name || "Admin";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
      {/* Left: Mobile Toggle & Wide Search Field */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-xl border border-tertiary/70 text-neutral-700 hover:bg-neutral-100 transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Field matching Mockup */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute start-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full ps-10 pe-16 py-2 rounded-xl bg-darnaBg/70 hover:bg-darnaBg border border-tertiary-300/80 focus:border-primary focus:bg-white focus:outline-none text-xs text-neutral-800 placeholder-neutral-400 transition shadow-2xs"
            />
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="absolute end-2 hidden sm:inline-flex items-center font-mono text-[10px] bg-white border border-tertiary-200 px-1.5 py-0.5 rounded text-neutral-500 hover:border-secondary hover:text-neutral-700 shadow-2xs transition"
              title="Ouvrir la palette de commandes (⌘K)"
            >
              ⌘K
            </button>
          </div>
        </form>
      </div>

      {/* Right Controls: Training Mode, Language Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Training Mode Banner Indicator */}
        {isTrainingMode && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C96F4F]/15 border border-[#C96F4F]/30 text-[#C96F4F] text-[11px] font-bold">
            <ShieldAlert className="w-3 h-3" />
            <span>
              {locale === "fr"
                ? "Mode entraînement"
                : locale === "ar"
                ? "وضع التدريب"
                : "Training Mode"}
            </span>
          </span>
        )}

        {/* Language Switcher */}
        <LocaleSwitcher />

        {/* Notification Bell with Count Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-xl text-neutral-600 hover:text-primary hover:bg-neutral-100 transition relative"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-neutral-700" />
            {unreadCount > 0 && (
              <span className="absolute top-1 end-1 min-w-[16px] h-4 px-1 rounded-full bg-[#C96F4F] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute end-0 mt-2 w-80 rounded-2xl bg-white border border-tertiary-200 shadow-darna-dropdown p-3 z-40 animate-in fade-in zoom-in-95 text-start">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] text-secondary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Tout marquer comme lu</span>
                  </button>
                )}
              </div>
              <div className="space-y-2 mt-2 max-h-72 overflow-y-auto">
                {unreadNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-2.5 rounded-xl border text-xs transition ${
                      notif.read
                        ? "bg-neutral-50/70 border-neutral-100 text-neutral-500"
                        : "bg-tertiary-50 border-tertiary-200/80 text-neutral-800 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">{notif.title}</span>
                      <span className="text-[10px] text-neutral-400">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-0.5">{notif.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Block with Avatar, Name, Role and Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 ps-2.5 border-s border-tertiary-200/80 cursor-pointer focus:outline-none group"
          >
            <Avatar src={currentUser?.avatar || "/assets/avatar.png"} size={32} />
            <div className="hidden sm:block text-start leading-tight">
              <span className="block text-xs font-bold text-primary group-hover:text-secondary transition">
                {userName}
              </span>
              <span className="text-[10px] text-neutral-500 font-medium">
                {roleName}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition" />
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute end-0 mt-2 w-52 rounded-2xl bg-white border border-tertiary-200 shadow-darna-dropdown p-1.5 z-40 animate-in fade-in zoom-in-95 text-start">
              <div className="px-3 py-2 border-b border-neutral-100">
                <p className="text-xs font-bold text-primary">{userName}</p>
                <p className="text-[10px] text-secondary font-semibold">{roleName}</p>
              </div>

              <Link
                href="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              >
                <User className="w-3.5 h-3.5 text-neutral-500" />
                <span>Mon profil & Sécurité</span>
              </Link>

              {onToggleTrainingMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onToggleTrainingMode();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#C96F4F]" />
                  <span>
                    {isTrainingMode ? "Quitter le mode formation" : "Mode formation"}
                  </span>
                </button>
              )}

              {onStartTour && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onStartTour();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-secondary" />
                  <span>Visite guidée</span>
                </button>
              )}

              <Link
                href="/help"
                onClick={() => setIsUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-secondary" />
                <span>Centre d'aide</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-accent hover:bg-accent/10 transition text-start cursor-pointer border-t border-neutral-100 mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{tHeader("signOut")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
