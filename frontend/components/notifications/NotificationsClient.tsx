"use client";

/**
 * Notifications inbox: grouped by day (Today / Earlier) on white e1 cards, a type icon on a
 * palette tint, a terracotta unread dot, and "Mark all as read" that clears the dots and
 * tints one after another. The header (eyebrow, serif title, status line) comes from the
 * account shell on the page.
 */

import React, { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
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
  BrandCheckDoubleIcon,
  BrandChevronRightIcon,
} from "@/components/icons";
import { AccountHeader } from "@/components/profile/AccountShell";
import { Button, KitEmptyState, cn, focusRingInset } from "@/components/ui";
import { STAGGER, spring } from "@/lib/motion";

interface NotificationsClientProps {
  initialNotifications: Notification[];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const typeStyles: Record<string, { tile: string; Icon: typeof BrandBellIcon }> = {
  booking: { tile: "bg-secondary-100 text-secondary-800", Icon: BrandCalendarIcon },
  message: { tile: "bg-tertiary-200 text-tertiary-900", Icon: BrandMessageIcon },
  price: { tile: "bg-accent-100 text-accent-800", Icon: BrandTagIcon },
  system: { tile: "bg-primary/[0.08] text-primary-800", Icon: BrandShieldIcon },
};
const fallbackStyle = { tile: "bg-primary/[0.06] text-primary-700", Icon: BrandBellIcon };

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);
  const [justCleared, setJustCleared] = useState(false);

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
    setMarkingAll(true);
    const result = await markAllNotificationsReadAction();
    setMarkingAll(false);
    if (!result.ok) {
      toast.error(t("updateFailed"));
      return;
    }
    setJustCleared(true);
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

  const renderGroup = (headingId: string, heading: string, items: Notification[], offset: number) => (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="mb-3 flex items-center gap-2 px-1 text-eyebrow uppercase font-semibold text-secondary-700"
      >
        <span aria-hidden="true" className="h-px w-5 bg-secondary-600/60" />
        {heading}
        <span className="font-medium normal-case tracking-normal text-primary-500 tabular-nums">· {items.length}</span>
      </h2>
      <ul className="overflow-hidden rounded-2xl bg-white shadow-e1 divide-y divide-primary/[0.06]">
        {items.map((notif, i) => {
          const { tile, Icon } = typeStyles[notif.type] ?? fallbackStyle;
          const delay = justCleared ? (offset + i) * STAGGER : 0;
          return (
            <li key={notif.id} className="relative">
              {/* Unread tint fades out (opacity only) when the item is read. */}
              <AnimatePresence initial={false}>
                {!notif.read && (
                  <m.span
                    key="tint"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { delay, duration: 0.35 } }}
                    className="pointer-events-none absolute inset-0 bg-accent-50"
                  />
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => handleMarkAsRead(notif.id, notif.link)}
                className={cn(
                  "group relative flex w-full items-start gap-4 p-4 text-start transition-colors duration-fast ease-standard hover:bg-primary/[0.03] sm:p-5",
                  focusRingInset
                )}
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tile)}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={cn(
                        "text-body",
                        !notif.read ? "font-semibold text-primary-900" : "font-medium text-primary-800"
                      )}
                    >
                      {notif.title}
                    </span>
                    <time dateTime={notif.createdAt} className="shrink-0 text-meta text-primary-500 tabular-nums">
                      {formatTime(notif.createdAt)}
                    </time>
                  </span>
                  <span className="mt-1 block text-meta leading-relaxed text-primary-600 [text-wrap:pretty]">
                    {notif.message}
                  </span>
                </span>
                <span className="relative mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <AnimatePresence initial={false}>
                    {!notif.read ? (
                      <m.span
                        key="dot"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0, opacity: 0, transition: { ...spring.press, delay } }}
                        className="absolute h-2.5 w-2.5 rounded-full bg-accent-600 shadow-[0_0_0_4px_rgba(201,111,79,0.16)]"
                      >
                        <span className="sr-only">{t("unread")}</span>
                      </m.span>
                    ) : notif.link ? (
                      <BrandChevronRightIcon
                        key="go"
                        size={16}
                        aria-hidden="true"
                        className="absolute text-primary-400 transition-transform duration-fast ease-out group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      />
                    ) : null}
                  </AnimatePresence>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <>
      <AccountHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={
          <span aria-live="polite">{unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allCaughtUp")}</span>
        }
        actions={
          unreadCount > 0 || justCleared ? (
            <Button
              variant="tertiary"
              size="sm"
              onClick={unreadCount > 0 ? handleMarkAllRead : undefined}
              loading={markingAll}
              success={justCleared && unreadCount === 0}
              leadingIcon={<BrandCheckDoubleIcon size={17} />}
            >
              {t("markAllRead")}
            </Button>
          ) : undefined
        }
      />

      <div className="mt-8 sm:mt-10">
        {notifications.length === 0 ? (
          <div className="rounded-3xl bg-white shadow-e1">
            <KitEmptyState variant="generic" title={t("emptyTitle")} description={t("emptyBody")} />
          </div>
        ) : (
          <div className="space-y-8">
            {today.length > 0 && renderGroup("notifications-today", t("today"), today, 0)}
            {earlier.length > 0 && renderGroup("notifications-earlier", t("earlier"), earlier, today.length)}
          </div>
        )}
      </div>
    </>
  );
}
