// TODO: replace with Supabase query
import { Notification } from "@/types";
import { mockNotifications } from "@/lib/mock-data/notifications";

let notificationsStore: Notification[] = [...mockNotifications];

export async function getNotifications(userId?: string): Promise<Notification[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  if (userId) {
    return notificationsStore.filter((n) => n.userId === userId);
  }
  return [...notificationsStore];
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  const notif = notificationsStore.find((n) => n.id === id);
  if (notif) {
    notif.read = true;
    return true;
  }
  return false;
}

export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  notificationsStore = notificationsStore.map((n) =>
    !userId || n.userId === userId ? { ...n, read: true } : n
  );
}
