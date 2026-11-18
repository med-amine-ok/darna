"use server";

import * as data from "@/lib/data/users";
import { runAction, id, obj, oneOf, reason, str } from "@/lib/auth/run-action";
import type { GuestStatus, Permission } from "@/lib/types";

type ListParams = data.UserFilterParams;

const GUEST_STATUSES: readonly GuestStatus[] = ["active", "suspended", "banned", "deleted"];

/** Permission required to move a user INTO the given status. */
function permissionForUserStatus(status: GuestStatus): Permission {
  if (status === "banned") return "users.ban";
  if (status === "deleted") return "users.delete";
  return "users.suspend";
}

export async function listUsers(params: ListParams = {}) {
  return runAction("users.view", () => data.listUsers(obj<ListParams>(params ?? {}, "params")));
}

export async function getUserById(userId: string) {
  return runAction("users.view", () => data.getUserById(id(userId)));
}

export async function suspendUser(userId: string, suspendReason: string) {
  return runAction("users.suspend", (actor) => data.suspendUser(id(userId), reason(suspendReason), actor));
}

export async function unsuspendUser(userId: string) {
  return runAction("users.suspend", (actor) => data.unsuspendUser(id(userId), actor));
}

export async function banUser(userId: string, banReason: string) {
  return runAction("users.ban", (actor) => data.banUser(id(userId), reason(banReason), actor));
}

export async function deleteUser(userId: string) {
  return runAction("users.delete", (actor) => data.deleteUser(id(userId), actor));
}

export async function restoreUser(userId: string) {
  return runAction("users.delete", (actor) => data.restoreUser(id(userId), actor));
}

export async function updateUserStatus(userId: string, status: GuestStatus, statusReason?: string) {
  const permission = GUEST_STATUSES.includes(status) ? permissionForUserStatus(status) : "users.suspend";
  return runAction(permission, (actor) =>
    data.updateUserStatus(
      id(userId),
      oneOf(status, GUEST_STATUSES, "status"),
      actor,
      statusReason ? str(statusReason, "reason", 2000) : undefined,
    ),
  );
}

export async function listDataRequests(params: { status?: string; kind?: string; page?: number } = {}) {
  return runAction("privacy.handle_requests", () => data.listDataRequests(obj(params ?? {}, "params")));
}

export async function completeDataRequest(requestId: string, outcome: string, notes: string) {
  return runAction("privacy.handle_requests", (actor) =>
    data.completeDataRequest(
      id(requestId),
      oneOf(outcome, ["completed", "rejected"] as const, "outcome"),
      reason(notes, "notes", 5000),
      actor,
    ),
  );
}
