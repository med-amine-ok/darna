"use server";

import type { NotificationPreference } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { ApiError } from "@/lib/api/client";
import { failFromError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/server/session";
import {
  getNotificationPage,
  getNotificationPreferences,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateNotificationPreferences,
  type NotificationPage,
} from "@/lib/data/notifications";

/** Read-only: one page of the current user's notifications plus the unread badge count. */
export async function getMyNotificationsAction(cursor?: string | null): Promise<ActionResult<NotificationPage>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  const safeCursor = typeof cursor === "string" && cursor.length <= 512 ? cursor : null;
  const page = await getNotificationPage(user.id, { cursor: safeCursor });
  if (page.failed) return actionFail("SERVER_ERROR");
  return actionOk(page);
}

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (typeof notificationId !== "string" || !notificationId || notificationId.length > 64) {
    return actionFail("INVALID_INPUT");
  }
  try {
    await markNotificationAsRead(notificationId, user.id);
    return actionOk(null);
  } catch (error) {
    return failFromError(error, "notifications.read");
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  try {
    await markAllNotificationsAsRead(user.id);
    return actionOk(null);
  } catch (error) {
    return failFromError(error, "notifications.readAll");
  }
}

const CHANNELS = new Set(["email", "sms", "push"]);

/** Changes some switches; locked ones (critical email and SMS) are refused by the backend. */
export async function updateNotificationPreferencesAction(
  items: Pick<NotificationPreference, "kind" | "channel" | "enabled">[],
): Promise<ActionResult<NotificationPreference[]>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!Array.isArray(items) || items.length === 0 || items.length > 200) return actionFail("INVALID_INPUT");
  const clean = items
    .filter(
      (item) =>
        item &&
        typeof item.kind === "string" &&
        item.kind.length <= 48 &&
        CHANNELS.has(item.channel) &&
        typeof item.enabled === "boolean",
    )
    .map((item) => ({ kind: item.kind, channel: item.channel, enabled: item.enabled }));
  if (clean.length !== items.length) return actionFail("INVALID_INPUT");
  try {
    return actionOk(await updateNotificationPreferences(clean));
  } catch (error) {
    if (error instanceof ApiError && error.code === "preference_locked") return actionFail("PREFERENCE_LOCKED");
    return failFromError(error, "notifications.preferences");
  }
}

/** Read-only: every switch (kind x channel). */
export async function getNotificationPreferencesAction(): Promise<ActionResult<NotificationPreference[]>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  try {
    return actionOk(await getNotificationPreferences());
  } catch (error) {
    return failFromError(error, "notifications.preferences");
  }
}
