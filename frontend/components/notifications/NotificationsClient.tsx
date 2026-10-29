"use client";

import React, { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { Notification } from "@/types";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/actions/notifications";
import { toast } from "react-toastify";
import {
  BrandBellIcon,
  BrandCalendarIcon,
  BrandMessageIcon,
  BrandTagIcon,
  BrandShieldIcon,
} from "@/components/icons";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

interface NotificationsClientProps {
  initialNotifications: Notification[];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, link?: string) => {
    const result = await markNotificationReadAction(id);
    if (!result.ok) {
      toast.error(t("updateFailed"));
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsReadAction();
    if (!result.ok) {
      toast.error(t("updateFailed"));
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success(t("allMarkedRead"));
  };

  // Group notifications by day.
  const now = new Date();
  const today = notifications.filter((n) => {
    const d = new Date(n.createdAt);
    return !Number.isNaN(d.getTime()) && isSameDay(d, now);
  });
  const earlier = notifications.filter((n) => !today.includes(n));

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60_000) return t("justNow");
    if (diffMs < 7 * 24 * 60 * 60_000) return format.relativeTime(date, now);
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <BrandCalendarIcon size={20} className="text-emerald-700" aria-hidden="true" />;
      case "message":
        return <BrandMessageIcon size={20} className="text-secondary" aria-hidden="true" />;
      case "price":
        return <BrandTagIcon size={20} className="text-accent-700" aria-hidden="true" />;
      case "system":
        return <BrandShieldIcon size={20} className="text-primary" aria-hidden="true" />;
      default:
        return <BrandBellIcon size={20} className="text-neutral-500" aria-hidden="true" />;
    }
  };

  const renderGroup = (headingId: string, heading: string, items: Notification[]) => (
    <section className="space-y-3" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-2">
        {heading}
      </h2>
      <ul className="bg-white rounded-3xl border border-tertiary divide-y divide-tertiary/30 overflow-hidden shadow-xs">
        {items.map((notif) => (
          <li key={notif.id}>
            <button
              type="button"
              onClick={() => handleMarkAsRead(notif.id, notif.link)}
              className={`w-full text-start p-4 sm:p-5 flex items-start gap-4 transition ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0 ${
                !notif.read ? "bg-tertiary/20 hover:bg-tertiary/30" : "hover:bg-neutral-50"
              }`}
            >
              <span className="p-2.5 rounded-2xl bg-white border border-tertiary/60 shrink-0 shadow-xs">
                {getIcon(notif.type)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm ${!notif.read ? "font-bold text-primary" : "font-semibold text-neutral-800"}`}
                  >
                    {notif.title}
                  </span>
                  <time dateTime={notif.createdAt} className="text-[11px] text-neutral-500 shrink-0">
                    {formatTime(notif.createdAt)}
                  </time>
                </span>
                <span className="block text-xs text-neutral-600 mt-0.5 leading-relaxed">{notif.message}</span>
              </span>
              {!notif.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-2">
                  <span className="sr-only">{t("unread")}</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">{t("title")}</h1>
          <p className="text-sm text-neutral-500 mt-1" aria-live="polite">
            {unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allCaughtUp")}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className={`text-xs sm:text-sm font-semibold text-secondary hover:text-primary transition rounded-md ${focusRing}`}
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center shadow-xs">
          <BrandBellIcon size={36} className="text-tertiary mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-base font-bold text-primary">{t("emptyTitle")}</h2>
          <p className="text-xs text-neutral-500 mt-1">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && renderGroup("notifications-today", t("today"), today)}
          {earlier.length > 0 && renderGroup("notifications-earlier", t("earlier"), earlier)}
        </div>
      )}
    </div>
  );
}
