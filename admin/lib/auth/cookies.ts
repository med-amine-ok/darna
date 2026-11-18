/**
 * Names and lifetimes of the admin sign-in cookies.
 *
 * Edge-safe (no "server-only", no next/headers) so middleware.ts can import it.
 * ADMIN_TOKEN_COOKIE must stay equal to API_TOKEN_COOKIE in lib/api/client.ts.
 */

/** httpOnly cookie with the complete Django staff session token. */
export const ADMIN_TOKEN_COOKIE = "bladus_admin_api_token";

/** httpOnly cookie with the step 1 token while the second factor (or the enrolment) is due. */
export const PENDING_TOKEN_COOKIE = "bladus_admin_pending_token";

/**
 * Set right after the authenticator enrolment while the recovery codes are on
 * screen: the login page must not jump to the panel before the staff member
 * has saved them (they are shown only once).
 */
export const RECOVERY_SHOWN_COOKIE = "bladus_admin_recovery_shown";

/**
 * When the session cookie was last renewed by a server action (epoch seconds).
 * Renewing it on every action made Next refresh the page after each one,
 * which re-ran the screens' loaders in an endless loop; now at most every
 * TOUCH_INTERVAL_SECONDS.
 */
export const TOUCHED_AT_COOKIE = "bladus_admin_touched_at";
export const TOUCH_INTERVAL_SECONDS = 5 * 60;

/** Staff sessions end after 30 minutes without a request (backend BR-ACC-03). */
export const STAFF_IDLE_SECONDS = 30 * 60;

/** Absolute lifetime of a staff session on the backend (8 hours). */
export const STAFF_SESSION_MAX_SECONDS = 8 * 60 * 60;

/** Time allowed to type the second factor or finish the enrolment. */
export const PENDING_TOKEN_SECONDS = 10 * 60;

/**
 * Options of the session cookie. Its maxAge is the idle timeout: middleware
 * renews it on every page request, so a browser left alone for 30 minutes
 * loses the cookie at the same time as the backend ends the session.
 */
export function tokenCookieOptions(maxAge: number = STAFF_IDLE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
