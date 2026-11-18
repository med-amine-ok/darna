import "server-only";
import type { Notification, NotificationPreference, NotificationType } from "@/types";

/** GET /me/notifications row (backend notifications.serializers.NotificationSerializer). */
export interface ApiNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  params: Record<string, unknown>;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ApiNotificationPage {
  results: ApiNotification[];
  next_cursor: string | null;
  has_more: boolean;
  unread_count: number;
}

/** Backend kind family -> the icon family the frontend shows. */
export function notificationTypeOf(kind: string): NotificationType {
  const family = kind.split(".")[0];
  if (family === "booking" || family === "refund") return "booking";
  if (family === "message") return "message";
  if (family === "review") return "review";
  if (family === "wallet") return "price";
  return "system";
}

/** Only same-site paths are followed (the backend sends "/trips/{id}", "/messages/{id}"...). */
function safeLink(link: string | null): string | undefined {
  return link && link.startsWith("/") && !link.startsWith("//") ? link : undefined;
}

export function toNotification(row: ApiNotification, userId: string): Notification {
  return {
    id: row.id,
    userId,
    type: notificationTypeOf(row.kind),
    kind: row.kind,
    title: row.title,
    message: row.body,
    link: safeLink(row.link),
    read: Boolean(row.read_at),
    createdAt: row.created_at,
  };
}

export function toPreference(row: { kind: string; channel: string; enabled: boolean; locked: boolean }): NotificationPreference {
  return {
    kind: row.kind,
    channel: row.channel === "sms" || row.channel === "push" ? row.channel : "email",
    enabled: Boolean(row.enabled),
    locked: Boolean(row.locked),
  };
}
