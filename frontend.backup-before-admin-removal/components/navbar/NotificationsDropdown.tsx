"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "@/navigation";
import { Notification } from "@/types";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/data/notifications";
import { toast } from "react-toastify";
import {
  BrandBellIcon,
  BrandCalendarIcon,
  BrandMessageIcon,
  BrandTagIcon,
  BrandShieldIcon,
  BrandCheckIcon,
  BrandChevronRightIcon,
} from "@/components/icons";

function formatNotificationTime(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function NotificationsDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    let isMounted = true;
    async function fetchNotifs() {
      try {
        const data = await getNotifications();
        if (isMounted) setNotifications(data);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    }
    fetchNotifs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id: string, link?: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (link) {
      setIsOpen(false);
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setIsLoading(false);
    toast.success("All notifications marked as read");
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
        className={`relative p-2 rounded-full transition select-none btn-press cursor-pointer ${
          isOpen ? "bg-black/10 text-primary" : "hover:bg-black/5 text-primary"
        }`}
      >
        <BrandBellIcon size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 end-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent ring-2 ring-white" />
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute end-0 top-full mt-2.5 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-xl border border-tertiary/80 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-tertiary/40 bg-white/60">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-neutral-500 hover:text-accent transition cursor-pointer flex items-center gap-1"
              >
                <BrandCheckIcon size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-tertiary/30 no-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 px-6 text-center text-neutral-500 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/20 flex items-center justify-center text-neutral-400 mb-3">
                  <BrandBellIcon size={22} className="text-tertiary" />
                </div>
                <p className="text-xs font-semibold text-primary">No notifications yet</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  We will notify you about your bookings, messages, and offers here.
                </p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id, notif.link)}
                  className={`p-4 transition cursor-pointer flex items-start gap-3 relative hover:bg-neutral-50/80 ${
                    !notif.read ? "bg-accent/[0.04]" : "bg-transparent"
                  }`}
                >
                  {/* Category Icon Badge */}
                  <div className="w-9 h-9 rounded-xl bg-white border border-tertiary/60 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    {getCategoryIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold truncate ${!notif.read ? "text-primary" : "text-neutral-700"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap shrink-0">
                        {formatNotificationTime(notif.createdAt || notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-600 line-clamp-2 mt-0.5 leading-snug">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread Indicator Dot */}
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer with "See All" button */}
          <div className="p-3 border-t border-tertiary/40 bg-neutral-50/70 flex items-center justify-center">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-tertiary/80 hover:border-primary text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer btn-press"
            >
              <span>See all notifications</span>
              <BrandChevronRightIcon size={14} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
