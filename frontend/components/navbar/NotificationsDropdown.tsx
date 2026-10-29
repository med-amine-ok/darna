"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { Notification } from "@/types";
import {
  getMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notifications";
import { toast } from "react-toastify";
import { useDismiss } from "@/hook/useDismiss";
import {
  BrandBellIcon,
  BrandCalendarIcon,
  BrandMessageIcon,
  BrandTagIcon,
  BrandShieldIcon,
  BrandCheckIcon,
  BrandChevronRightIcon,
} from "@/components/icons";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function NotificationsDropdown() {
  const router = useRouter();
  const t = useTranslations("nav");
  const format = useFormatter();
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Load notifications
  useEffect(() => {
    let isMounted = true;
    async function fetchNotifs() {
      try {
        // Scoped to the logged-in user on the server; logged-out users get none.
        const result = await getMyNotificationsAction();
        if (isMounted) setNotifications(result.ok ? result.data : []);
      } catch {
        if (isMounted) setNotifications([]);
      }
    }
    fetchNotifs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close on outside click or Escape (focus returns to the bell).
  useDismiss(isOpen, dropdownRef, () => setIsOpen(false), triggerRef);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60_000) return t("justNow");
    if (diffMs < 7 * 24 * 60 * 60_000) return format.relativeTime(date, now);
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  const handleMarkAsRead = async (id: string, link?: string) => {
    const result = await markNotificationReadAction(id);
    if (!result.ok) {
      toast.error(t("notificationsUpdateFailed"));
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (link) {
      setIsOpen(false);
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    const result = await markAllNotificationsReadAction();
    setIsLoading(false);
    if (!result.ok) {
      toast.error(t("notificationsUpdateFailed"));
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success(t("allNotificationsRead"));
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push("/notifications");
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <BrandCalendarIcon size={16} className="text-emerald-700" />;
      case "message":
        return <BrandMessageIcon size={16} className="text-secondary" />;
      case "price":
        return <BrandTagIcon size={16} className="text-accent" />;
      case "system":
        return <BrandShieldIcon size={16} className="text-primary" />;
      default:
        return <BrandBellIcon size={16} className="text-primary" />;
    }
  };

  const triggerLabel =
    unreadCount > 0 ? t("notificationsWithUnread", { count: unreadCount }) : t("notifications");

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        title={t("notifications")}
        className={`relative p-2 rounded-full transition select-none btn-press cursor-pointer ${focusRing} ${
          isOpen ? "bg-black/10 text-primary" : "hover:bg-black/5 text-primary"
        }`}
      >
        <BrandBellIcon size={18} />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute top-1.5 end-1.5 flex h-2 w-2">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent ring-2 ring-white" />
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={`${panelId}-title`}
          className="absolute end-0 top-full mt-2.5 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-xl border border-tertiary/80 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-tertiary/40 bg-white/60">
            <div className="flex items-center gap-2">
              <h2 id={`${panelId}-title`} className="font-bold text-sm sm:text-base text-primary">
                {t("notifications")}
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent-700 text-[11px] font-bold">
                  {t("newCount", { count: unreadCount })}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleMarkAllRead}
                className={`text-xs font-semibold text-neutral-600 hover:text-accent-700 transition cursor-pointer flex items-center gap-1 rounded ${focusRing}`}
              >
                <BrandCheckIcon size={13} />
                <span>{t("markAllRead")}</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 px-6 text-center text-neutral-600 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/20 flex items-center justify-center mb-3">
                  <BrandBellIcon size={22} className="text-tertiary" />
                </div>
                <p className="text-xs font-semibold text-primary">{t("noNotifications")}</p>
                <p className="text-[11px] text-neutral-600 mt-0.5">{t("noNotificationsDesc")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-tertiary/30">
                {notifications.slice(0, 5).map((notif) => (
                  <li key={notif.id}>
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id, notif.link)}
                      className={`w-full text-start p-4 transition cursor-pointer flex items-start gap-3 relative hover:bg-neutral-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 ${
                        !notif.read ? "bg-accent/[0.04]" : "bg-transparent"
                      }`}
                    >
                      {/* Category Icon Badge */}
                      <span className="w-9 h-9 rounded-xl bg-white border border-tertiary/60 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                        {getCategoryIcon(notif.type)}
                      </span>

                      {/* Content */}
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold truncate ${!notif.read ? "text-primary" : "text-neutral-700"}`}
                          >
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-neutral-600 whitespace-nowrap shrink-0">
                            {formatTime(notif.createdAt || notif.timestamp)}
                          </span>
                        </span>
                        <span className="block text-[11px] text-neutral-600 line-clamp-2 mt-0.5 leading-snug">
                          {notif.message}
                        </span>
                      </span>

                      {/* Unread Indicator Dot */}
                      {!notif.read && (
                        <>
                          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                          <span className="sr-only">{t("unread")}</span>
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer with "See All" button */}
          <div className="p-3 border-t border-tertiary/40 bg-neutral-50/70 flex items-center justify-center">
            <button
              type="button"
              onClick={handleViewAll}
              className={`w-full py-2.5 px-4 rounded-xl bg-white border border-tertiary/80 hover:border-primary text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer btn-press ${focusRing}`}
            >
              <span>{t("seeAllNotifications")}</span>
              <BrandChevronRightIcon size={14} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
