import "server-only";
import type { HostType, User } from "@/types";
import { ApiError, api, rowsOf } from "./client";

/** GET /me (backend apps/accounts MeSerializer). */
export interface ApiMe {
  id: string;
  email: string | null;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  first_name_latin: string;
  last_name_latin: string;
  full_name_ar: string;
  display_name: string;
  bio: string;
  spoken_languages: string[];
  home_commune: unknown;
  address_line: string;
  preferred_locale: "en" | "fr" | "ar";
  status: string;
  is_admin: boolean;
  is_host: boolean;
  has_mfa: boolean;
  date_joined: string;
  handle?: string | null;
  date_of_birth?: string | null;
  profile_completed_at?: string | null;
  /** Required steps of 'complete your profile' still to do: name, phone, date_of_birth (ACC-11). */
  profile_missing?: string[];
  avatar_url?: string | null;
}

/** One entry of GET /me/workspaces (backend hosts.serializers.workspace_data). */
export interface ApiWorkspace {
  host_account_id: string;
  kind: "individual" | "organization";
  host_type: HostType | null;
  organization_id: string | null;
  organization_slug: string | null;
  display_name: string;
  role: "owner" | "admin" | "manager" | null;
  verification_status: string;
  is_active: boolean;
  permissions: string[];
  allowed_verticals: string[];
  can_create_trips: boolean;
}

export interface ApiWorkspaces {
  results: ApiWorkspace[];
  active_host_account_id: string | null;
}

/** The workspace this session acts for: the one marked active, else the first. */
export function activeWorkspace(workspaces: ApiWorkspace[]): ApiWorkspace | null {
  return workspaces.find((w) => w.is_active) ?? workspaces[0] ?? null;
}

/** Map the backend profile and workspaces onto the frontend User type. */
export function toUser(me: ApiMe, workspaces: ApiWorkspace[], favoriteIds: string[]): User {
  const active = activeWorkspace(workspaces);
  return {
    id: me.id,
    name: me.display_name || [me.first_name_latin, me.last_name_latin].filter(Boolean).join(" ") || me.email || "",
    email: me.email ?? "",
    image: me.avatar_url ?? null,
    role: me.is_admin ? "admin" : workspaces.length > 0 ? "host" : "guest",
    hostType: active?.host_type ?? null,
    organizationId: active?.organization_id ?? null,
    createdAt: me.date_joined,
    handle: me.handle ?? undefined,
    dateOfBirth: me.date_of_birth ?? null,
    profileComplete: Boolean(me.profile_completed_at),
    profileMissing: me.profile_missing ?? [],
    emailVerified: me.email_verified ? me.date_joined : null,
    favoriteIds,
    bio: me.bio || undefined,
    phone: me.phone ?? undefined,
    address: me.address_line || undefined,
    languages: me.spoken_languages ?? [],
    isIdentityVerified: me.phone_verified,
    phoneVerified: me.phone_verified,
    hasMfa: me.has_mfa,
    fullNameAr: me.full_name_ar || undefined,
  };
}

export interface MeBundle {
  me: ApiMe;
  workspaces: ApiWorkspace[];
  user: User;
}

/**
 * Load the signed-in person from the API with ``token`` (default: the
 * session cookie). Null when the token is missing, expired or revoked.
 */
export async function loadMe(token?: string | null): Promise<MeBundle | null> {
  try {
    const me = await api<ApiMe>("/me", { token: token ?? undefined });
    const [workspaces, favorites] = await Promise.all([
      api<ApiWorkspaces>("/me/workspaces", { token: token ?? undefined }).catch(() => ({ results: [], active_host_account_id: null })),
      api<unknown>("/me/favorites", { token: token ?? undefined, query: { limit: 50 } }).catch(() => []),
    ]);
    const favoriteIds = rowsOf<{ target_id?: string; id?: string }>(favorites)
      .map((row) => row.target_id ?? row.id ?? "")
      .filter(Boolean);
    return { me, workspaces: workspaces.results, user: toUser(me, workspaces.results, favoriteIds) };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}
