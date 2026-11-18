import "server-only";

import { api, apiOrNull } from "@/lib/api/client";
import { emptyPage, fetchPage, logReadError, write } from "@/lib/api/mapping";
import { toDataRequest, toGuestUser, type ApiAdminUser, type ApiDataRequest, type DataRequest } from "@/lib/api/users";
import type { AdminActor, GuestStatus, GuestUser, PaginatedResult } from "@/lib/types";
import { DomainError } from "./errors";

/**
 * Guests and hosts as people, from the Django API (/admin/users,
 * /admin/data-requests). Filters, ordering and pages are done by the backend;
 * actions are audited there (ids and statuses only, BR-STF-02).
 */

export interface UserFilterParams {
  status?: string; // "all" | GuestStatus (comma list allowed)
  role?: string; // "all" | "guest" | "host" | "both"
  emailVerified?: boolean;
  idVerified?: boolean;
  wilayaCode?: string;
  search?: string;
  minBookings?: number;
  minSpend?: number;
  isFlagged?: boolean;
  sortBy?: "joined" | "bookings" | "spend" | "activity";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const BACKEND_STATUSES = ["active", "suspended", "banned", "deleted"];

function statusQuery(status?: string): string | undefined {
  if (!status || status === "all") return undefined;
  const wanted = status.split(",").map((s) => s.trim()).filter((s) => BACKEND_STATUSES.includes(s));
  return wanted.length ? wanted.join(",") : undefined;
}

function roleQuery(role?: string): boolean | undefined {
  if (role === "host" || role === "both") return true;
  if (role === "guest") return false;
  return undefined;
}

async function statusFacets(): Promise<Record<string, number>> {
  const statuses = ["active", "suspended", "banned", "deleted"];
  try {
    const counts = await Promise.all(
      statuses.map((s) => api<{ count: number }>("/admin/users", { query: { status: s, page_size: 1 } })),
    );
    const out: Record<string, number> = { all: 0 };
    statuses.forEach((s, i) => {
      out[s] = counts[i]?.count ?? 0;
      out.all += out[s];
    });
    return out;
  } catch (error) {
    logReadError("admin users facets", error);
    return {};
  }
}

export async function listUsers(params: UserFilterParams = {}): Promise<PaginatedResult<GuestUser>> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 12;
  const ordering = `${params.sortOrder === "asc" ? "" : "-"}${params.sortBy || "joined"}`;
  try {
    const [result, status] = await Promise.all([
      fetchPage<ApiAdminUser, GuestUser>("/admin/users", toGuestUser, {
        page,
        pageSize,
        query: {
          status: statusQuery(params.status),
          is_host: roleQuery(params.role),
          email_verified: params.emailVerified,
          phone_verified: params.idVerified,
          wilaya: params.wilayaCode && params.wilayaCode !== "all" ? params.wilayaCode : undefined,
          q: params.search?.trim() || undefined,
          min_bookings: params.minBookings && params.minBookings > 0 ? params.minBookings : undefined,
          min_spend_minor: params.minSpend && params.minSpend > 0 ? Math.round(params.minSpend * 100) : undefined,
          flagged: params.isFlagged,
          ordering,
        },
      }),
      statusFacets(),
    ]);
    return { ...result, facets: { status } };
  } catch (error) {
    logReadError("admin users", error);
    return { ...emptyPage<GuestUser>(page, pageSize), facets: {} };
  }
}

export async function getUserById(id: string): Promise<GuestUser | null> {
  try {
    const raw = await apiOrNull<ApiAdminUser>(`/admin/users/${encodeURIComponent(id)}`);
    return raw ? toGuestUser(raw) : null;
  } catch (error) {
    logReadError("admin user", error);
    return null;
  }
}

type UserAction = "suspend" | "unsuspend" | "ban" | "restore";

async function act(id: string, action: UserAction, reason?: string): Promise<GuestUser> {
  const raw = await write(() =>
    api<ApiAdminUser>(`/admin/users/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      body: reason ? { reason } : undefined,
    }),
  );
  return toGuestUser(raw);
}

/** Suspend with a reason (10 characters or more); every session of the user ends at once. */
export async function suspendUser(id: string, reason: string, _actor: AdminActor): Promise<GuestUser> {
  return act(id, "suspend", reason);
}

export async function unsuspendUser(id: string, _actor: AdminActor): Promise<GuestUser> {
  return act(id, "unsuspend");
}

export async function banUser(id: string, reason: string, _actor: AdminActor): Promise<GuestUser> {
  return act(id, "ban", reason);
}

/** Soft delete; anonymisation follows (BR-PRV-02). */
export async function deleteUser(id: string, _actor: AdminActor): Promise<GuestUser> {
  await write(() => api(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }));
  const after = await getUserById(id);
  return after ?? ({ id, status: "deleted" } as GuestUser);
}

export async function restoreUser(id: string, _actor: AdminActor): Promise<GuestUser> {
  return act(id, "restore");
}

/**
 * Move a user to `status` with the matching backend action. Suspend and ban
 * need a reason: the screens use suspendUser / banUser for those.
 */
export async function updateUserStatus(
  id: string,
  status: GuestStatus,
  actor: AdminActor,
  reason?: string,
): Promise<GuestUser> {
  const current = await getUserById(id);
  if (!current) throw new DomainError("User not found");
  if (status === current.status) return current;
  switch (status) {
    case "active":
      return current.status === "deleted" ? restoreUser(id, actor) : unsuspendUser(id, actor);
    case "suspended":
      return act(id, "suspend", reason);
    case "banned":
      return act(id, "ban", reason);
    case "deleted":
      return deleteUser(id, actor);
    default:
      throw new DomainError(`Cannot move a user to ${status}`);
  }
}

// ---- Data protection requests (BR-PRV-02) ----

export async function listDataRequests(
  params: { status?: string; kind?: string; page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<DataRequest>> {
  try {
    return await fetchPage<ApiDataRequest, DataRequest>("/admin/data-requests", toDataRequest, {
      page: params.page,
      pageSize: params.pageSize,
      query: {
        status: params.status && params.status !== "all" ? params.status : undefined,
        kind: params.kind && params.kind !== "all" ? params.kind : undefined,
      },
    });
  } catch (error) {
    logReadError("admin data requests", error);
    return emptyPage<DataRequest>(params.page, params.pageSize);
  }
}

/** Close a request: completed (a deletion anonymises) or rejected, with notes of 10 characters or more. */
export async function completeDataRequest(
  id: string,
  outcome: "completed" | "rejected",
  notes: string,
  _actor: AdminActor,
): Promise<DataRequest> {
  const raw = await write(() =>
    api<ApiDataRequest>(`/admin/data-requests/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      body: { outcome, notes },
    }),
  );
  return toDataRequest(raw);
}
