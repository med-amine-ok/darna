import "server-only";

/**
 * Server-only auth configuration. Nothing in this file may ever be imported
 * from a Client Component (enforced by `server-only`).
 */

export const SESSION_COOKIE_NAME = "darna_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

export const JWT_ISSUER = "urn:darna:admin";
export const JWT_AUDIENCE = "urn:darna:admin-panel";

// Development-only fallback so `next dev` works without a .env.local.
// Never used in production: getSessionSecret() throws instead.
const DEV_ONLY_FALLBACK_SECRET = "darna-admin-dev-only-insecure-fallback-secret";

let cachedKey: Uint8Array | null = null;

export function getSessionSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const fromEnv = process.env.ADMIN_AUTH_SECRET;
  let secret: string;
  if (fromEnv && fromEnv.length >= 32) {
    secret = fromEnv;
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_AUTH_SECRET is missing or shorter than 32 characters. Refusing to sign/verify admin sessions in production."
    );
  } else {
    secret = fromEnv || DEV_ONLY_FALLBACK_SECRET;
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}
