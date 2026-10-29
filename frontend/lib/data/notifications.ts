// TODO: replace with Supabase query
import "server-only";
import { Notification } from "@/types";
import { clone, delay } from "./_store";
import { notificationsTable } from "./_tables";

/** Notifications always belong to exactly one user — there is no unscoped read. */
export async function getNotifications(userId: string): Promise<Notification[]> {
  await delay(30);
  return clone(notificationsTable.filter((n) => n.userId === userId));
}

/** Marks a notification read only if it belongs to `userId`. */
export async function markNotificationAsRead(id: string, userId: string): Promise<boolean> {
  await delay(20);
  const notif = notificationsTable.find((n) => n.id === id && n.userId === userId);
  if (!notif) return false;
  notif.read = true;
  return true;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await delay(20);
  for (const n of notificationsTable) {
    if (n.userId === userId) n.read = true;
  }
}
