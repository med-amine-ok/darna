import "server-only";

/**
 * First-line sign-in throttling in this server process, keyed per email and
 * per client IP. The authoritative lock lives in the Django API (BR-ACC-05:
 * 5 failures lock the account and the IP, answered as 429 login_locked); this
 * one only stops a burst before it reaches the backend.
 * Kept on globalThis so it survives dev hot reloads.
 */

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000; // failures older than this are forgotten
const LOCK_MS = 60 * 1000; // lock duration once MAX_FAILURES is reached

interface AttemptRecord {
  count: number;
  firstAt: number;
  lockedUntil?: number;
}

const globalForLimiter = globalThis as unknown as {
  __bladusAdminLoginAttempts?: Map<string, AttemptRecord>;
};
const attempts = (globalForLimiter.__bladusAdminLoginAttempts ??= new Map());

function read(key: string, now: number): AttemptRecord | undefined {
  const rec = attempts.get(key);
  if (!rec) return undefined;
  const lockExpired = rec.lockedUntil !== undefined && rec.lockedUntil <= now;
  const windowExpired = rec.lockedUntil === undefined && now - rec.firstAt > WINDOW_MS;
  if (lockExpired || windowExpired) {
    attempts.delete(key);
    return undefined;
  }
  return rec;
}

export function loginRateLimitKeys(email: string, ip: string): string[] {
  return [`email:${email.trim().toLowerCase()}`, `ip:${ip}`];
}

export function checkLoginRateLimit(keys: string[]): { allowed: boolean; retryAfterSecs?: number } {
  const now = Date.now();
  let retryAfter = 0;
  for (const key of keys) {
    const rec = read(key, now);
    if (rec?.lockedUntil && rec.lockedUntil > now) {
      retryAfter = Math.max(retryAfter, Math.ceil((rec.lockedUntil - now) / 1000));
    }
  }
  return retryAfter > 0 ? { allowed: false, retryAfterSecs: retryAfter } : { allowed: true };
}

export function recordFailedLogin(keys: string[]): void {
  const now = Date.now();
  for (const key of keys) {
    const rec = read(key, now) ?? { count: 0, firstAt: now };
    rec.count += 1;
    if (rec.count >= MAX_FAILURES) rec.lockedUntil = now + LOCK_MS;
    attempts.set(key, rec);
  }
}

export function recordSuccessfulLogin(keys: string[]): void {
  // Only the per-account counter is cleared; the per-IP counter keeps
  // counting so one valid login cannot reset a credential-stuffing run.
  for (const key of keys) {
    if (key.startsWith("email:")) attempts.delete(key);
  }
}
