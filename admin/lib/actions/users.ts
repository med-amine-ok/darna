"use server";

import * as data from "@/lib/data/users";
import { runAction, id, str, oneOf } from "@/lib/auth/run-action";
import type { GuestStatus, Permission } from "@/lib/types";

type ListParams = Parameters<typeof data.listUsers>[0];

const GUEST_STATUSES: readonly GuestStatus[] = ["active", "pending", "suspended", "banned", "deleted"];

/** Permission required to move a guest INTO the given status. */
function permissionForUserStatus(status: GuestStatus): Permission {
  if (status === "banned") return "users.ban";
  if (status === "deleted") return "users.delete";
  return "users.suspend";
}

export async function listUsers(params: ListParams = {}) {
  return runAction("users.view", () => data.listUsers(params ?? {}));
}

export async function getUserById(userId: string) {
  return runAction("users.view", () => data.getUserById(id(userId)));
}

export async function suspendUser(userId: string, reason: string) {
  return runAction("users.suspend", (actor) => data.suspendUser(id(userId), str(reason, "reason"), actor));
}

export async function unsuspendUser(userId: string) {
  return runAction("users.suspend", (actor) => data.unsuspendUser(id(userId), actor));
}

export async function banUser(userId: string, reason: string) {
  return runAction("users.ban", (actor) => data.banUser(id(userId), str(reason, "reason"), actor));
}

export async function deleteUser(userId: string) {
  return runAction("users.delete", (actor) => data.deleteUser(id(userId), actor));
}

export async function restoreUser(userId: string) {
  return runAction("users.delete", (actor) => data.restoreUser(id(userId), actor));
}

export async function updateUserStatus(userId: string, status: GuestStatus) {
  const permission = GUEST_STATUSES.includes(status) ? permissionForUserStatus(status) : "users.suspend";
  return runAction(permission, (actor) =>
    data.updateUserStatus(id(userId), oneOf(status, GUEST_STATUSES, "status"), actor)
  );
}
