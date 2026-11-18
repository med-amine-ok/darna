import "server-only";
import type { User } from "@/types";
import { ApiError, api, apiOrNull } from "@/lib/api/client";
import { toPublicProfileUser, type ApiPublicUser } from "@/lib/api/account";
import { loadMe } from "@/lib/api/me";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";

/**
 * Accounts, backed by the Django API (backend apps/accounts).
 * Sign-in, sign-up and sign-out live in the route handlers app/api/auth/*;
 * this module holds the reads and self-service writes used by pages and actions.
 */
export { MIN_PASSWORD_LENGTH };

/** Public profile of any person (GET /users/{id}); null when unknown, hidden or the API is down. */
export async function getUserById(userId: string): Promise<User | null> {
  if (!userId) return null;
  try {
    const row = await apiOrNull<ApiPublicUser>(`/users/${encodeURIComponent(userId)}`);
    return row ? toPublicProfileUser(row) : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return null; // not a UUID
    console.error("[getUserById]", error);
    return null;
  }
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const rows = await Promise.all(Array.from(new Set(userIds)).map((id) => getUserById(id)));
  return rows.filter((u): u is User => u !== null);
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "WRONG_PASSWORD" | "WEAK_PASSWORD" | "NOT_FOUND" };

/** POST /auth/password/change: signs out every other device (BR-ACC-03). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "WEAK_PASSWORD" };
  try {
    await api("/auth/password/change", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "invalid_current_password") return { ok: false, reason: "WRONG_PASSWORD" };
      if (error.status === 400 || error.status === 422) return { ok: false, reason: "WEAK_PASSWORD" };
    }
    throw error;
  }
}

/** PATCH /me with the backend's field names; returns the refreshed user. */
export async function updateMyProfile(patch: Record<string, unknown>): Promise<User | null> {
  await api("/me", { method: "PATCH", body: patch });
  return (await loadMe())?.user ?? null;
}

/**
 * Add or remove a listing from the signed-in user's favourites
 * (PUT / DELETE /me/favorites/listing/{id}). Returns the new id list.
 */
export async function setUserFavorite(_userId: string, listingId: string, favorite: boolean): Promise<string[] | null> {
  try {
    await api(`/me/favorites/listing/${encodeURIComponent(listingId)}`, { method: favorite ? "PUT" : "DELETE" });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
  return (await loadMe())?.user.favoriteIds ?? null;
}
