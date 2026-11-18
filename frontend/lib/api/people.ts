import "server-only";
import { cache } from "react";
import type { PublicUser } from "@/types";
import { ApiError, apiOrNull } from "./client";
import { isUuid, photoUrl } from "./catalog";

/** GET /users/{id} (accounts PublicUserSerializer): never email, phone or address. */
export interface ApiPublicUser {
  id: string;
  /** Public profile link name: /users/<handle> (ACC-06). */
  handle: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  spoken_languages: string[];
  joined_year: number;
  is_host: boolean;
  identity_verified: boolean;
  host_rating_avg: number | null;
  host_review_count: number;
  organizations: { slug: string; display_name: string; role: string; business_category?: string }[];
}

export function toPublicUserFromApi(raw: ApiPublicUser): PublicUser {
  return {
    id: raw.id,
    handle: raw.handle ?? undefined,
    name: raw.display_name,
    image: raw.avatar_url ? photoUrl(raw.avatar_url) : null,
    role: raw.is_host ? "host" : "guest",
    hostType: null,
    createdAt: `${raw.joined_year}-01-01T00:00:00.000Z`,
    bio: raw.bio || undefined,
    languages: raw.spoken_languages ?? [],
    isIdentityVerified: raw.identity_verified,
  };
}

/** A profile handle as the API accepts it (ACC-06): 3 to 30 of a-z, 0-9 and hyphens. */
const HANDLE_RE = /^[a-z0-9-]{3,30}$/i;

/**
 * A public profile by id or by handle, or null for unknown, suspended or
 * staff accounts (and when the API is down).
 */
export async function getPublicProfile(key: string): Promise<ApiPublicUser | null> {
  if (!isUuid(key) && !HANDLE_RE.test(key)) return null;
  try {
    return await apiOrNull<ApiPublicUser>(`/users/${encodeURIComponent(key.toLowerCase())}`, { anonymous: true });
  } catch (error) {
    if (!(error instanceof ApiError && error.status < 500)) console.error("[users.public]", error);
    return null;
  }
}

/** getPublicProfile, fetched once per request (shared by the profile layout, metadata and page). */
export const loadPublicProfile = cache((key: string) => getPublicProfile(key));
