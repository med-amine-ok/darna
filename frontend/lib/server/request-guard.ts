import "server-only";
import type { NextRequest } from "next/server";
import { TEST_MODE } from "@/lib/test-mode";

/**
 * Basic CSRF guard for JSON route handlers: the request must be JSON and, when
 * the browser sends an Origin header, it must match this host. (Server actions
 * get the same Origin check from Next.js itself.)
 */
export function isTrustedJsonRequest(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;

  const origin = request.headers.get("origin");
  if (!origin || TEST_MODE) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}
