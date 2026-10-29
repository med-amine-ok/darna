"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useRouter, usePathname } from "@/navigation";
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  ShieldAlert,
  LogOut,
  Sparkles,
  ChevronDown,
  User,
  Check,
} from "lucide-react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import type { AdminSessionValue } from "@/components/auth/AdminSessionProvider";
import { logoutAction } from "@/lib/actions/auth";
import { canAccessPath } from "@/lib/route-permissions";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";

export interface HeaderProps {
  currentUser?: AdminSessionValue | null;
  onMobileMenuToggle: () => void;
  onOpenCommandPalette: () => void;
  approvalsCount?: number;
  onOpenHelp?: () => void;
  onStartTour?: () => void;
  isTrainingMode?: boolean;
  onToggleTrainingMode?: () => void;
}

/** Sample notifications (UI demo only): text lives in header.sampleNotifications.<id>. */
const SAMPLE_NOTIFICATIONS = [
  { id: "newValidation", minutesAgo: 10 },
  { id: "tripPending", minutesAgo: 45 },
  { id: "reviewReported", minutesAgo: 120 },
] as const;

type SampleNotificationId = (typeof SAMPLE_NOTIFICATIONS)[number]["id"];

/** Route prefix → header.searchPlaceholders.<key> */
const SEARCH_PLACEHOLDER_KEYS: ReadonlyArray<readonly [string, string]> = [
  ["/trips", "trips"],
  ["/stays", "stays"],
  ["/experiences", "experiences"],
  ["/cars", "cars"],
  ["/bookings", "bookings"],
  ["/moderation", "moderation"],
];

type OpenPopover = "notifications" | "user" | null;

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onMobileMenuToggle,
  onOpenCommandPalette,
  onStartTour,
  isTrainingMode = false,
  onToggleTrainingMode,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const tHeader = useTranslations("header");
  const tTraining = useTranslations("training");
  const tRoles = useTranslations("roles");
  const tUi = useTranslations("ui");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });

  const uid = useId();
  const notificationsPanelId = `${uid}-notifications`;
  const notificationsTitleId = `${uid}-notifications-title`;
  const userMenuId = `${uid}-user-menu`;

  const [searchQuery, setSearchQuery] = useState("");
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [readIds, setReadIds] = useState<ReadonlySet<SampleNotificationId>>(() => new Set());

  const notificationsWrapRef = useRef<HTMLDivElement>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null);
  const userWrapRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);

  const isNotificationsOpen = openPopover === "notifications";
  const isUserMenuOpen = openPopover === "user";

  const closePopover = useCallback(() => setOpenPopover(null), []);

  // Escape closes the open popover and returns focus to its trigger; a click outside closes it.
  useEffect(() => {
    if (!openPopover) return;
    const wrap = openPopover === "notifications" ? notificationsWrapRef.current : userWrapRef.current;
    const trigger = openPopover === "notifications" ? notificationsTriggerRef.current : userTriggerRef.current;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpenPopover(null);
      trigger?.focus();
    }
    function onPointerDown(e: PointerEvent) {
      if (wrap && !wrap.contains(e.target as Node)) setOpenPopover(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPopover]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      onOpenCommandPalette();
    }
  };

  const markAllNotificationsAsRead = () => {
    setReadIds(new Set(SAMPLE_NOTIFICATIONS.map((n) => n.id)));
  };

  const unreadCount = SAMPLE_NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length;

  const placeholderKey =
    SEARCH_PLACEHOLDER_KEYS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "default";

  const userRole = currentUser?.role;
  const roleName = userRole ? tRoles(userRole) : "";
  const userName = currentUser?.name || tHeader("adminFallback");

  const menuItemClass =
    "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary-200/80 px-3.5 sm:px-6 h-14 flex items-center justify-between gap-2.5 sm:gap-4 shadow-2xs shrink-0">
      {/* Start: Mobile Toggle & Search Field */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-2xl">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl border border-tertiary/70 text-neutral-700 hover:bg-neutral-100 transition shrink-0"
          aria-label={tHeader("openNavigation")}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Global Search Field */}
        <form onSubmit={handleSearchSubmit} role="search" className="relative flex-1 min-w-0">
          <div className="relative flex items-center">
            <Search
              className="w-4 h-4 text-neutral-400 absolute start-3 pointer-events-none shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tHeader(`searchPlaceholders.${placeholderKey}`)}
              aria-label={tHeader("searchLabel")}
              className="w-full ps-9 pe-10 sm:pe-16 py-1.5 sm:py-2 rounded-xl bg-darnaBg/70 hover:bg-darnaBg border border-tertiary-300/80 focus:border-primary focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/40 text-base sm:text-xs text-neutral-800 placeholder-neutral-500 transition shadow-2xs truncate"
            />
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="absolute end-2 hidden sm:inline-flex items-center font-mono text-[10px] bg-white border border-tertiary-200 px-1.5 py-0.5 rounded text-neutral-600 hover:border-secondary hover:text-neutral-800 shadow-2xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              title={tHeader("openCommandPalette")}
            >
              <span dir="ltr" aria-hidden="true">⌘K</span>
              <span className="sr-only">{tHeader("openCommandPalette")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* End Controls: Training Mode, Language Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Training Mode Indicator */}
        {isTrainingMode && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/15 border border-accent-500/30 text-accent-800 text-[11px] font-bold">
            <ShieldAlert className="w-3 h-3" aria-hidden="true" />
            <span>{tTraining("badge")}</span>
          </span>
        )}

        {/* Language Switcher - hidden on mobile, placed inside avatar menu */}
        <div className="hidden sm:block">
          <LocaleSwitcher />
        </div>

        {/* Notification Bell with Count Badge */}
        <div className="relative" ref={notificationsWrapRef}>
          <button
            ref={notificationsTriggerRef}
            type="button"
            onClick={() => setOpenPopover(isNotificationsOpen ? null : "notifications")}
            className="p-2 rounded-xl text-neutral-600 hover:text-primary hover:bg-neutral-100 transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            title={tUi("notifications")}
            aria-label={unreadCount > 0 ? tHeader("notificationsUnread", { count: unreadCount }) : tUi("notifications")}
            aria-haspopup="dialog"
            aria-expanded={isNotificationsOpen}
            aria-controls={isNotificationsOpen ? notificationsPanelId : undefined}
          >
            <Bell className="w-4 h-4 text-neutral-700" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 end-1 min-w-[16px] h-4 px-1 rounded-full bg-accent-700 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
              >
                {format.number(unreadCount)}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {isNotificationsOpen && (
            <div
              id={notificationsPanelId}
              role="dialog"
              aria-labelledby={notificationsTitleId}
              className="absolute end-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white border border-tertiary-200 shadow-darna-dropdown p-3 z-40 animate-in fade-in zoom-in-95 text-start"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h2 id={notificationsTitleId} className="text-xs font-bold text-primary">
                  {tUi("notifications")}
                </h2>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] text-secondary-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  >
                    <Check className="w-3 h-3" aria-hidden="true" />
                    <span>{tHeader("markAllRead")}</span>
                  </button>
                )}
              </div>
              <ul className="space-y-2 mt-2 max-h-72 overflow-y-auto">
                {SAMPLE_NOTIFICATIONS.map((notif) => {
                  const read = readIds.has(notif.id);
                  return (
                    <li
                      key={notif.id}
                      className={`p-2.5 rounded-xl border text-xs transition ${
                        read
                          ? "bg-neutral-50/70 border-neutral-100 text-neutral-600"
                          : "bg-tertiary-50 border-tertiary-200/80 text-neutral-800 font-medium"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-primary">
                          {!read && <span className="sr-only">{tHeader("unread")}: </span>}
                          {tHeader(`sampleNotifications.${notif.id}.title`)}
                        </span>
                        <span className="text-[10px] text-neutral-500 shrink-0">
                          {format.relativeTime(now.getTime() - notif.minutesAgo * 60_000, now)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        {tHeader(`sampleNotifications.${notif.id}.description`)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* User Block with Avatar, Name, Role and Dropdown */}
        <div className="relative" ref={userWrapRef}>
          <button
            ref={userTriggerRef}
            type="button"
            onClick={() => setOpenPopover(isUserMenuOpen ? null : "user")}
            aria-haspopup="dialog"
            aria-expanded={isUserMenuOpen}
            aria-controls={isUserMenuOpen ? userMenuId : undefined}
            className="flex items-center gap-2.5 ps-2.5 border-s border-tertiary-200/80 cursor-pointer rounded-e-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            <Avatar src={currentUser?.avatar || "/assets/avatar.png"} size={32} />
            <span className="sr-only sm:hidden">{userName}</span>
            <div className="hidden sm:block text-start leading-tight">
              <span className="block text-xs font-bold text-primary group-hover:text-secondary-700 transition">
                {userName}
              </span>
              <span className="text-[10px] text-neutral-500 font-medium">{roleName}</span>
            </div>
            <ChevronDown
              aria-hidden="true"
              className={`w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-700 transition ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* User Menu Popover */}
          {isUserMenuOpen && (
            <div
              id={userMenuId}
              role="dialog"
              aria-label={tHeader("accountMenu", { name: userName })}
              className="absolute end-0 mt-2 w-56 rounded-2xl bg-white border border-tertiary-200 shadow-darna-dropdown p-1.5 z-40 animate-in fade-in zoom-in-95 text-start"
            >
              <div className="px-3 py-2 border-b border-neutral-100">
                <p className="text-xs font-bold text-primary">{userName}</p>
                <p className="text-[10px] text-secondary-700 font-semibold">{roleName}</p>
              </div>

              {/* Language Switcher for mobile (< 640px) */}
              <div className="sm:hidden px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-600">{tHeader("language")}</span>
                <LocaleSwitcher />
              </div>

              {canAccessPath("/settings", currentUser?.permissions ?? []) && (
                <Link href="/settings" onClick={closePopover} className={menuItemClass}>
                  <User className="w-3.5 h-3.5 text-neutral-500" aria-hidden="true" />
                  <span>{tHeader("myProfileSecurity")}</span>
                </Link>
              )}

              {onToggleTrainingMode && (
                <button
                  type="button"
                  onClick={() => {
                    closePopover();
                    onToggleTrainingMode();
                  }}
                  className={menuItemClass}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-accent-600" aria-hidden="true" />
                  <span>{isTrainingMode ? tTraining("stop") : tTraining("start")}</span>
                </button>
              )}

              {onStartTour && (
                <button
                  type="button"
                  onClick={() => {
                    closePopover();
                    onStartTour();
                  }}
                  className={menuItemClass}
                >
                  <Sparkles className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                  <span>{tHeader("guidedTour")}</span>
                </button>
              )}

              <Link href="/help" onClick={closePopover} className={menuItemClass}>
                <HelpCircle className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                <span>{tHeader("helpCenter")}</span>
              </Link>

              {/* Server action: deletes the httpOnly session cookie, audits, redirects to /{locale}/login */}
              <form action={logoutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-accent-700 hover:bg-accent/10 transition text-start cursor-pointer border-t border-neutral-100 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{tHeader("signOut")}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
