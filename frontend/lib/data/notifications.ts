import "server-only";
import type { Notification, NotificationPreference } from "@/types";
import { api } from "@/lib/api/client";
import {
  toNotification,
  toPreference,
  type ApiNotificationPage,
} from "@/lib/api/notifications";

/**
 * Notifications of the signed-in user (backend /me/notifications). The API
 * only ever returns the caller's own rows; ``userId`` is the session user and
 * is used for mapping only.
 */
export interface NotificationPage {
  items: Notification[];
  unreadCount: number;
  nextCursor: string | null;
  hasMore: boolean;
  /** True when the API could not be reached (the page shows an error, not an empty inbox). */
  failed?: boolean;
}

const EMPTY_PAGE: NotificationPage = { items: [], unreadCount: 0, nextCursor: null, hasMore: false };

/** One cursor page, newest first. Answers an empty page when the API fails (pages never crash). */
export async function getNotificationPage(
  userId: string,
  options: { cursor?: string | null; limit?: number; unread?: boolean } = {},
): Promise<NotificationPage> {
  try {
    const answer = await api<ApiNotificationPage>("/me/notifications", {
      query: { cursor: options.cursor ?? undefined, limit: options.limit ?? 20, unread: options.unread ? "true" : undefined },
    });
    return {
      items: (answer?.results ?? []).map((row) => toNotification(row, userId)),
      unreadCount: answer?.unread_count ?? 0,
      nextCursor: answer?.next_cursor ?? null,
      hasMore: Boolean(answer?.has_more),
    };
  } catch (error) {
    console.error("[notifications] list failed", error);
    return { ...EMPTY_PAGE, failed: true };
  }
}

/** First page of my notifications (kept for older callers). */
export async function getNotifications(userId: string): Promise<Notification[]> {
  return (await getNotificationPage(userId)).items;
}

/** Marks one of my notifications read; false when it is not mine or unknown. Throws on server errors. */
export async function markNotificationAsRead(id: string, _userId?: string): Promise<boolean> {
  await api(`/me/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
  return true;
}

export async function markAllNotificationsAsRead(_userId?: string): Promise<void> {
  await api("/me/notifications/read-all", { method: "POST" });
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const answer = await api<{ results: NotificationPreference[] }>("/me/notification-preferences");
  return (answer?.results ?? []).map(toPreference);
}

/** Stores the switches sent (others unchanged); answers every switch after the change. */
export async function updateNotificationPreferences(
  items: Pick<NotificationPreference, "kind" | "channel" | "enabled">[],
): Promise<NotificationPreference[]> {
  const answer = await api<{ results: NotificationPreference[] }>("/me/notification-preferences", {
    method: "PUT",
    body: { results: items },
  });
  return (answer?.results ?? []).map(toPreference);
}
