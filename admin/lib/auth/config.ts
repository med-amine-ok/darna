import "server-only";

/**
 * Server-only auth configuration. Staff sign-in, the second factor and the
 * session itself live in the Django API (/admin/auth/*); this app only keeps
 * the opaque session token in an httpOnly cookie (see ./cookies.ts).
 */

export {
  ADMIN_TOKEN_COOKIE as SESSION_COOKIE_NAME,
  PENDING_TOKEN_COOKIE,
  STAFF_IDLE_SECONDS,
  STAFF_SESSION_MAX_SECONDS as SESSION_TTL_SECONDS,
  PENDING_TOKEN_SECONDS,
  tokenCookieOptions,
} from "./cookies";
