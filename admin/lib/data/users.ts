// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { GuestUser, GuestStatus, PaginatedResult } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface UserFilterParams {
  status?: string; // "all" | GuestStatus
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

export async function listUsers(
  params: UserFilterParams = {}
): Promise<PaginatedResult<GuestUser>> {
  await delay(180);

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;

  let filtered = [...store.users];

  // 1. Status Filter
  if (params.status && params.status !== "all") {
    filtered = filtered.filter((u) => u.status === params.status);
  }

  // 2. Role Filter
  if (params.role && params.role !== "all") {
    filtered = filtered.filter((u) => u.role === params.role);
  }

  // 3. Verifications
  if (params.emailVerified !== undefined) {
    filtered = filtered.filter((u) => u.emailVerified === params.emailVerified);
  }
  if (params.idVerified !== undefined) {
    filtered = filtered.filter((u) => u.idVerified === params.idVerified);
  }

  // 4. Wilaya
  if (params.wilayaCode && params.wilayaCode !== "all") {
    filtered = filtered.filter((u) => u.wilayaCode === params.wilayaCode);
  }

  // 5. Search
  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((u) => {
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = (u.phone || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone;
    });
  }

  // 6. Metrics
  if (params.minBookings && params.minBookings > 0) {
    filtered = filtered.filter((u) => u.bookingsCount >= params.minBookings!);
  }
  if (params.minSpend && params.minSpend > 0) {
    filtered = filtered.filter((u) => u.totalSpentDzd >= params.minSpend!);
  }
  if (params.isFlagged !== undefined) {
    filtered = filtered.filter((u) => u.isFlagged === params.isFlagged);
  }

  // Facets
  const facets: Record<string, Record<string, number>> = {
    status: {
      all: store.users.length,
      active: store.users.filter((u) => u.status === "active").length,
      suspended: store.users.filter((u) => u.status === "suspended").length,
      banned: store.users.filter((u) => u.status === "banned").length,
      deleted: store.users.filter((u) => u.status === "deleted").length,
    },
    role: {
      all: store.users.length,
      guest: store.users.filter((u) => u.role === "guest").length,
      both: store.users.filter((u) => u.role === "both").length,
    },
  };

  // Sorting
  const sortBy = params.sortBy || "joined";
  const order = params.sortOrder === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === "bookings") return (a.bookingsCount - b.bookingsCount) * order;
    if (sortBy === "spend") return (a.totalSpentDzd - b.totalSpentDzd) * order;
    if (sortBy === "activity") return (new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime()) * order;
    return (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()) * order;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    facets,
  };
}

export async function getUserById(id: string): Promise<GuestUser | null> {
  await delay(150);
  const user = store.users.find((u) => u.id === id);
  return user ? { ...user } : null;
}

export async function suspendUser(
  id: string,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<GuestUser> {
  assertCan(actor.role, "users.suspend");
  await delay(200);

  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const prev = { ...store.users[idx] };
  store.users[idx] = {
    ...store.users[idx],
    status: "suspended",
    adminNotes: [...store.users[idx].adminNotes, `Suspended: ${reason}`],
  };

  await logAudit(
    actor,
    "USER_SUSPEND",
    "user",
    id,
    `Suspended user ${prev.name}: ${reason}`,
    prev,
    store.users[idx]
  );

  return store.users[idx];
}

export async function unsuspendUser(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<GuestUser> {
  assertCan(actor.role, "users.suspend");
  await delay(200);

  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const prev = { ...store.users[idx] };
  store.users[idx] = {
    ...store.users[idx],
    status: "active",
  };

  await logAudit(
    actor,
    "USER_UNSUSPEND",
    "user",
    id,
    `Reactivated user ${prev.name}`,
    prev,
    store.users[idx]
  );

  return store.users[idx];
}

export async function banUser(
  id: string,
  reason: string,
  actor: { id: string; name: string; role: any }
): Promise<GuestUser> {
  assertCan(actor.role, "users.ban");
  await delay(200);

  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const prev = { ...store.users[idx] };
  store.users[idx] = {
    ...store.users[idx],
    status: "banned",
    adminNotes: [...store.users[idx].adminNotes, `Banned: ${reason}`],
  };

  await logAudit(
    actor,
    "USER_BAN",
    "user",
    id,
    `Banned user ${prev.name}: ${reason}`,
    prev,
    store.users[idx]
  );

  return store.users[idx];
}

export async function deleteUser(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<GuestUser> {
  assertCan(actor.role, "users.delete");
  await delay(200);

  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const prev = { ...store.users[idx] };
  store.users[idx] = {
    ...store.users[idx],
    status: "deleted",
  };

  await logAudit(
    actor,
    "USER_DELETE",
    "user",
    id,
    `Soft deleted user ${prev.name}`,
    prev,
    store.users[idx]
  );

  return store.users[idx];
}

export async function restoreUser(
  id: string,
  actor: { id: string; name: string; role: any }
): Promise<GuestUser> {
  assertCan(actor.role, "users.delete");
  await delay(200);

  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const prev = { ...store.users[idx] };
  store.users[idx] = {
    ...store.users[idx],
    status: "active",
  };

  await logAudit(
    actor,
    "USER_RESTORE",
    "user",
    id,
    `Restored soft-deleted user ${prev.name}`,
    prev,
    store.users[idx]
  );

  return store.users[idx];
}
