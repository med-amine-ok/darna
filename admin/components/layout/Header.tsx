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
    "w-full flex items-center gap-2.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium text-primary-800 hover:bg-primary/[0.05] transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";

  return (
    <header className="sticky top-0 z-30 glass border-b border-primary/[0.07] px-3.5 sm:px-6 h-16 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
      {/* Start: Mobile Toggle & Search Field */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-2xl">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-white shadow-e1 text-primary-800 hover:shadow-e2 transition duration-fast shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          aria-label={tHeader("openNavigation")}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Global Search Field */}
        <form onSubmit={handleSearchSubmit} role="search" className="relative flex-1 min-w-0">
          <div className="relative flex items-center">
            <Search
              className="w-4 h-4 text-primary-500 absolute start-3.5 pointer-events-none shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tHeader(`searchPlaceholders.${placeholderKey}`)}
              aria-label={tHeader("searchLabel")}
              className="w-full h-10 ps-10 pe-10 sm:pe-16 rounded-xl bg-white/80 hover:bg-white shadow-e1 border-0 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/[0.08] text-base sm:text-sm text-primary-900 placeholder:text-primary-500 transition duration-fast ease-standard truncate"
            />
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="absolute end-2 hidden sm:inline-flex items-center h-6 text-[11px] font-semibold bg-darnaBg-300/80 px-1.5 rounded-md text-primary-600 hover:text-primary-900 hover:bg-darnaBg-400 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
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
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-100 text-accent-800 text-[11px] font-semibold ring-1 ring-inset ring-accent-200">
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
            className="w-10 h-10 flex items-center justify-center rounded-xl text-primary-700 hover:text-primary-900 hover:bg-primary/[0.06] transition-colors duration-fast relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            title={tUi("notifications")}
            aria-label={unreadCount > 0 ? tHeader("notificationsUnread", { count: unreadCount }) : tUi("notifications")}
            aria-haspopup="dialog"
            aria-expanded={isNotificationsOpen}
            aria-controls={isNotificationsOpen ? notificationsPanelId : undefined}
          >
            <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 end-1.5 min-w-[16px] h-4 px-1 rounded-full bg-accent-600 text-white text-[11px] font-semibold tabular-nums flex items-center justify-center ring-2 ring-darnaBg"
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
              className="absolute end-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white shadow-e3 p-3 z-40 animate-in fade-in zoom-in-95 origin-top-right rtl:origin-top-left text-start"
            >
              <div className="flex items-center justify-between pb-2 border-b border-primary/[0.08]">
                <h2 id={notificationsTitleId} className="text-sm font-semibold text-primary-900">
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
                      className={`relative p-2.5 ps-4 rounded-xl text-xs transition-colors duration-fast ${
                        read ? "text-primary-600" : "bg-darnaBg-100 text-primary-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {!read && <span aria-hidden="true" className="absolute start-1.5 top-4 w-1.5 h-1.5 rounded-full bg-accent-500" />}
                        <span className="font-semibold text-primary-900">
                          {!read && <span className="sr-only">{tHeader("unread")}: </span>}
                          {tHeader(`sampleNotifications.${notif.id}.title`)}
                        </span>
                        <span className="text-[11px] text-primary-500 shrink-0 tabular-nums">
                          {format.relativeTime(now.getTime() - notif.minutesAgo * 60_000, now)}
                        </span>
                      </div>
                      <p className="text-xs text-primary-600 mt-0.5">
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
            className="flex items-center gap-2.5 ps-2.5 border-s border-primary/[0.08] cursor-pointer rounded-e-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            <Avatar src={currentUser?.avatar || "/assets/avatar.png"} size={32} />
            <span className="sr-only sm:hidden">{userName}</span>
            <div className="hidden sm:block text-start leading-tight">
              <span className="block text-xs font-semibold text-primary-900 group-hover:text-secondary-700 transition-colors duration-fast">
                {userName}
              </span>
              <span className="text-[11px] text-primary-500 font-medium">{roleName}</span>
            </div>
            <ChevronDown
              aria-hidden="true"
              className={`w-3.5 h-3.5 text-primary-500 group-hover:text-primary-800 transition duration-fast ${
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
              className="absolute end-0 mt-2 w-56 rounded-2xl bg-white shadow-e3 p-1.5 z-40 animate-in fade-in zoom-in-95 origin-top-right rtl:origin-top-left text-start"
            >
              <div className="px-3 py-2 border-b border-primary/[0.08]">
                <p className="text-sm font-semibold text-primary-900">{userName}</p>
                <p className="text-[11px] text-secondary-700 font-semibold">{roleName}</p>
              </div>

              {/* Language Switcher for mobile (< 640px) */}
              <div className="sm:hidden px-3 py-2 border-b border-primary/[0.08] flex items-center justify-between">
                <span className="text-xs font-semibold text-primary-600">{tHeader("language")}</span>
                <LocaleSwitcher />
              </div>

              {canAccessPath("/settings", currentUser?.permissions ?? []) && (
                <Link href="/settings" onClick={closePopover} className={menuItemClass}>
                  <User className="w-3.5 h-3.5 text-primary-500" aria-hidden="true" />
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
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-accent-700 hover:bg-accent/10 transition text-start cursor-pointer border-t border-primary/[0.08] mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
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
