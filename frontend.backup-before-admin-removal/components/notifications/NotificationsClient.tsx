"use client";

import React, { useState } from "react";
import { useRouter } from "@/navigation";
import { Notification } from "@/types";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/data/notifications";
import { toast } from "react-toastify";
import {
  BrandBellIcon,
  BrandCalendarIcon,
  BrandMessageIcon,
  BrandTagIcon,
  BrandShieldIcon,
} from "@/components/icons";

interface NotificationsClientProps {
  initialNotifications: Notification[];
}

export default function NotificationsClient({
  initialNotifications,
}: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, link?: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read.");
  };

  // Group notifications by recency
  const today = notifications.slice(0, 2);
  const earlier = notifications.slice(2);

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <BrandCalendarIcon size={20} className="text-emerald-700" />;
      case "message":
        return <BrandMessageIcon size={20} className="text-secondary" />;
      case "price":
        return <BrandTagIcon size={20} className="text-accent" />;
      case "system":
        return <BrandShieldIcon size={20} className="text-primary" />;
      default:
        return <BrandBellIcon size={20} className="text-neutral-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            Notifications
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
              : "You're all caught up!"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs sm:text-sm font-semibold text-secondary hover:text-primary transition"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center shadow-xs">
          <BrandBellIcon size={36} className="text-tertiary mx-auto mb-3" />
          <h3 className="text-base font-bold text-primary">No notifications</h3>
          <p className="text-xs text-neutral-500 mt-1">
            When you receive booking confirmations, host messages, or price alerts, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today Group */}
          {today.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-2">
                Today
              </div>
              <div className="bg-white rounded-3xl border border-tertiary divide-y divide-tertiary/30 overflow-hidden shadow-xs">
                {today.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id, notif.link)}
                    className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer transition select-none ${
                      !notif.read ? "bg-tertiary/20 hover:bg-tertiary/30" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="p-2.5 rounded-2xl bg-white border border-tertiary/60 shrink-0 shadow-xs">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-sm ${!notif.read ? "font-bold text-primary" : "font-semibold text-neutral-800"}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Earlier Group */}
          {earlier.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-2">
                Earlier This Week
              </div>
              <div className="bg-white rounded-3xl border border-tertiary divide-y divide-tertiary/30 overflow-hidden shadow-xs">
                {earlier.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id, notif.link)}
                    className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer transition select-none ${
                      !notif.read ? "bg-tertiary/20 hover:bg-tertiary/30" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="p-2.5 rounded-2xl bg-white border border-tertiary/60 shrink-0 shadow-xs">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-sm ${!notif.read ? "font-bold text-primary" : "font-semibold text-neutral-800"}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          {new Date(notif.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
