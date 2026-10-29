import "server-only";

import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting and the audit trail.
 * First entry of X-Forwarded-For, then X-Real-IP, else "unknown".
 * (Only trustworthy behind a proxy that overwrites these headers.)
 */
export function getClientIp(): string {
  try {
    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
    const real = h.get("x-real-ip")?.trim();
    if (real) return real.slice(0, 64);
  } catch {
    // headers() is unavailable outside a request scope
  }
  return "unknown";
}
