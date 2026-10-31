"use client";

import type { IconProps } from "@/components/icons/BrandIcons";
import React, { useState, useEffect, useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { Notification } from "@/types";
import {
  getMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notifications";
import { toast } from "react-toastify";
import { Popover, Illustration, cn, focusRing, focusRingInset } from "@/components/ui";
import {
  BrandBellIcon,
  BrandCalendarIcon,
  BrandMessageIcon,
  BrandTagIcon,
  BrandShieldIcon,
  BrandCheckIcon,
  BrandChevronRightIcon,
} from "@/components/icons";

type Group = "today" | "week" | "earlier";

const typeStyle: Record<string, { tint: string; Icon: React.ComponentType<IconProps> }> = {
  booking: { tint: "bg-secondary-50 text-secondary-700", Icon: BrandCalendarIcon },
  message: { tint: "bg-tertiary-100 text-primary-700", Icon: BrandMessageIcon },
  price: { tint: "bg-accent-50 text-accent-700", Icon: BrandTagIcon },
  system: { tint: "bg-primary/[0.06] text-primary-800", Icon: BrandShieldIcon },
};

/** Bell + popover: notifications grouped by day (Today · This week · Earlier) with unread dots. */
export default function NotificationsDropdown() {
  const router = useRouter();
  const t = useTranslations("nav");
  const format = useFormatter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Scoped to the logged-in user on the server; logged-out users get none.
        const result = await getMyNotificationsAction();
        if (isMounted) setNotifications(result.ok ? result.data : []);
      } catch {
        if (isMounted) setNotifications([]);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dateOf = (n: Notification) => {
    const d = new Date(n.createdAt || n.timestamp || "");
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60_000) return t("justNow");
    if (diffMs < 7 * 24 * 60 * 60_000) return format.relativeTime(date, now);
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  const groups = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = startOfToday.getTime() - 6 * 24 * 60 * 60_000;
    const out: Record<Group, Notification[]> = { today: [], week: [], earlier: [] };
    for (const n of notifications.slice(0, 8)) {
      const d = dateOf(n);
      const key: Group = d && d >= startOfToday ? "today" : d && d.getTime() >= weekAgo ? "week" : "earlier";
      out[key].push(n);
    }
    return (["today", "week", "earlier"] as Group[]).filter((g) => out[g].length).map((g) => ({ key: g, items: out[g] }));
  }, [notifications]);

  const handleOpenItem = async (id: string, link?: string) => {
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

  const groupLabel = { today: t("groupToday"), week: t("groupThisWeek"), earlier: t("groupEarlier") };

  return (
    <Popover
      ariaLabel={t("notifications")}
      align="end"
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl p-0 shadow-e4"
      trigger={
        <button
          type="button"
          aria-label={unreadCount > 0 ? t("notificationsWithUnread", { count: unreadCount }) : t("notifications")}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-full text-primary-900 cursor-pointer select-none",
            "transition-colors duration-fast ease-standard hover:bg-primary/[0.06] aria-expanded:bg-primary/[0.08]",
            focusRing
          )}
        >
          <BrandBellIcon size={19} />
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute end-2.5 top-2.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent-500 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-600 ring-2 ring-darnaBg" />
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-center justify-between gap-3 border-b border-primary/[0.08] px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-title font-normal text-primary-900">{t("notifications")}</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">{t("newCount", { count: unreadCount })}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={isLoading}
            onClick={handleMarkAllRead}
            className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-meta font-semibold text-primary-700 cursor-pointer hover:text-primary-900 disabled:opacity-50", focusRing)}
          >
            <BrandCheckIcon size={14} />
            {t("markAllRead")}
          </button>
        )}
      </div>

      <div className="max-h-[420px] overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <Illustration variant="messages" size={104} />
            <p className="mt-3 text-sm font-semibold text-primary-900">{t("noNotifications")}</p>
            <p className="mt-1 max-w-[30ch] text-meta text-primary-600">{t("noNotificationsDesc")}</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={groupLabel[group.key]} className="py-1.5">
              <h3 className="px-5 pb-1 pt-2 text-eyebrow uppercase font-semibold text-primary-500">{groupLabel[group.key]}</h3>
              <ul>
                {group.items.map((n) => {
                  const style = typeStyle[n.type] ?? { tint: "bg-primary/[0.06] text-primary-800", Icon: BrandBellIcon };
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenItem(n.id, n.link)}
                        className={cn(
                          "relative flex w-full items-start gap-3 px-5 py-3 text-start cursor-pointer transition-colors duration-fast ease-standard hover:bg-primary/[0.03]",
                          focusRingInset
                        )}
                      >
                        <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", style.tint)}>
                          <style.Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cn("truncate text-sm", n.read ? "font-medium text-primary-700" : "font-semibold text-primary-900")}>{n.title}</span>
                            <span className="shrink-0 whitespace-nowrap text-[11px] text-primary-500">{formatTime(dateOf(n))}</span>
                          </span>
                          <span className="mt-0.5 block text-meta leading-snug text-primary-600 line-clamp-2">{n.message}</span>
                        </span>
                        {!n.read && (
                          <>
                            <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-600" />
                            <span className="sr-only">{t("unread")}</span>
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="border-t border-primary/[0.08] p-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/notifications");
          }}
          className={cn(
            "flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold text-primary-900 cursor-pointer transition-colors duration-fast hover:bg-primary/[0.05]",
            focusRingInset
          )}
        >
          {t("seeAllNotifications")}
          <BrandChevronRightIcon size={16} className="rtl:rotate-180" />
        </button>
      </div>
    </Popover>
  );
}
