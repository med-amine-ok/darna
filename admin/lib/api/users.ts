import "server-only";

import type { DataRequest, GuestStatus, GuestUser } from "@/lib/types";

export type { DataRequest };
import { dzd, type ApiMoney } from "./mapping";

/** Backend AdminUser (apps/accounts/serializers.py AdminUserSerializer). */
export interface ApiAdminUser {
  id: string;
  display_name: string;
  email: string | null;
  phone_e164: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  status: "active" | "suspended" | "banned" | "deleted";
  is_host: boolean;
  host_account_ids: string[];
  booking_count: number;
  total_booked: ApiMoney | null;
  open_flags: number;
  date_joined: string;
  last_login_at: string | null;
  deleted_at: string | null;
}

/** Backend DataSubjectRequestAdmin. */
export interface ApiDataRequest {
  id: string;
  kind: string;
  status: string;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
  export_url: string | null;
  user: { id: string; display_name: string } | null;
  notes: string | null;
  handled_by: { id: string; display_name: string } | null;
}


export function toGuestUser(raw: ApiAdminUser): GuestUser {
  const status: GuestStatus = raw.deleted_at ? "deleted" : raw.status;
  return {
    id: raw.id,
    name: raw.display_name || raw.email || raw.phone_e164 || raw.id.slice(0, 8),
    email: raw.email || "",
    phone: raw.phone_e164 || undefined,
    status,
    // AdminUser does not say whether the person also books as a guest: a host shows as "both".
    role: raw.is_host ? "both" : "guest",
    emailVerified: raw.email_verified,
    idVerified: raw.phone_verified,
    preferredLanguage: "fr",
    bookingsCount: raw.booking_count ?? 0,
    totalSpentDzd: dzd(raw.total_booked),
    walletBalanceDzd: 0,
    reviewsWrittenCount: 0,
    favoritesCount: 0,
    joinedAt: raw.date_joined,
    lastActiveAt: raw.last_login_at || raw.date_joined,
    isFlagged: (raw.open_flags ?? 0) > 0,
    adminNotes: [],
  };
}

export function toDataRequest(raw: ApiDataRequest): DataRequest {
  return {
    id: raw.id,
    kind: raw.kind,
    status: raw.status,
    dueAt: raw.due_at,
    createdAt: raw.created_at,
    completedAt: raw.completed_at,
    userId: raw.user?.id ?? null,
    userName: raw.user?.display_name || "",
    notes: raw.notes,
    handledBy: raw.handled_by?.display_name ?? null,
  };
}
