"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/navigation";
import {
  Menu,
  Search,
  CheckSquare,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Sparkles,
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
  const locale = useLocale() as "en" | "fr" | "ar";
  const tHeader = useTranslations("header");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    document.cookie = "darna_admin_session=; path=/; max-age=0";
    router.replace("/login");
  };

  const userRole = currentUser?.role || "moderator";
  const roleName = ROLE_LABELS[userRole]?.[locale] || "Moderator";
  const userName = currentUser?.name || "Nadia";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary/60 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
      {/* Left: Mobile Toggle & Quick Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-xl border border-tertiary/70 text-neutral-700 hover:bg-neutral-100 transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Button -> opens Command Palette */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-darnaBg/70 border border-tertiary/70 text-xs text-neutral-500 hover:border-secondary hover:text-neutral-700 transition shadow-2xs text-start"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span>{tHeader("searchPlaceholder")}</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-500 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Training Mode Pill / Toggle */}
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

        {/* Page Help '?' Button */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="p-2 rounded-xl text-neutral-600 hover:text-primary hover:bg-neutral-100 transition relative"
          title={
            locale === "fr"
              ? "Aide et guide des tâches (?)"
              : locale === "ar"
              ? "المساعدة ودليل المهام (?)"
              : "Page Help & Task Guides (?)"
          }
          aria-label="Open Page Help"
        >
          <HelpCircle className="w-4 h-4 text-secondary" />
        </button>

        {/* Approvals Check Icon with Badge */}
        <Link
          href="/approvals"
          className="relative p-2 rounded-xl text-neutral-600 hover:text-primary hover:bg-neutral-100 transition"
          title={tHeader("approvalsTooltip")}
        >
          <CheckSquare className="w-4 h-4" />
          {approvalsCount > 0 && (
            <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-[#C96F4F] ring-2 ring-white" />
          )}
        </Link>

        {/* User Profile Badge & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 ps-2.5 border-s border-tertiary/60 cursor-pointer focus:outline-none"
          >
            <Avatar src={currentUser?.avatar || "/assets/avatar.png"} size={32} />
            <div className="hidden sm:block text-start">
              <span className="block text-xs font-bold text-primary leading-tight">
                {userName}
              </span>
              <span className="text-[10px] text-secondary font-semibold flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> {roleName}
              </span>
            </div>
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute end-0 mt-2 w-52 rounded-2xl bg-white border border-tertiary/80 shadow-darna-dropdown p-1.5 z-40 animate-in fade-in zoom-in-95 text-start">
              <div className="px-3 py-2 border-b border-neutral-100 sm:hidden">
                <p className="text-xs font-bold text-primary">{userName}</p>
                <p className="text-[10px] text-secondary font-semibold">{roleName}</p>
              </div>

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
                  <span>
                    {locale === "fr"
                      ? "Visite guidée"
                      : locale === "ar"
                      ? "جولة التعريف بالمنصة"
                      : "Product Tour"}
                  </span>
                </button>
              )}

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
                    {isTrainingMode
                      ? locale === "fr"
                        ? "Quitter l'entraînement"
                        : locale === "ar"
                        ? "إنهاء التدريب"
                        : "Exit Training"
                      : locale === "fr"
                      ? "Activer mode entraînement"
                      : locale === "ar"
                      ? "تفعيل وضع التدريب"
                      : "Start Training Mode"}
                  </span>
                </button>
              )}

              <Link
                href="/where-did-it-go"
                onClick={() => setIsUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              >
                <span>
                  {locale === "fr"
                    ? "Où est passée ma page ?"
                    : locale === "ar"
                    ? "أين ذهبت صفحتي؟"
                    : "Where did it go?"}
                </span>
              </Link>

              <Link
                href="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              >
                <span>{tHeader("accountSettings")}</span>
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
