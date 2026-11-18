import "server-only";

/**
 * Staff passwords are hashed and checked by the Django API only; this app
 * never stores or compares them. What stays here is the input policy used
 * before a password is sent (sign-in length cap, staff password rules of
 * POST /admin/auth/invitations/accept: 12 to 256 characters).
 */

export const MAX_PASSWORD_LEN = 256;
export const MIN_STAFF_PASSWORD_LEN = 12;

/** Trims nothing (spaces are part of a password) and caps the length. */
export function normalisePasswordInput(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_PASSWORD_LEN) : "";
}

/** True when a new staff password meets the backend's length rule. */
export function isAcceptableStaffPassword(value: string): boolean {
  return value.length >= MIN_STAFF_PASSWORD_LEN && value.length <= MAX_PASSWORD_LEN;
}
