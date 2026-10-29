"use server";

import type { Notification } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/data/notifications";

/** Read-only: the current user's notifications (empty when logged out). */
export async function getMyNotificationsAction(): Promise<ActionResult<Notification[]>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  return actionOk(await getNotifications(user.id));
}

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof notificationId !== "string") return actionFail("INVALID_INPUT");
  const ok = await markNotificationAsRead(notificationId, user.id);
  return ok ? actionOk(null) : actionFail("NOT_FOUND");
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  await markAllNotificationsAsRead(user.id);
  return actionOk(null);
}
