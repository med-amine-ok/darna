/**
 * Client-safe result envelope returned by every server action in lib/actions.
 * Server actions never throw across the network boundary (Next.js would
 * replace the message in production); they return `{ ok: false, ... }` and
 * the client calls `unwrap()` to get the data or a typed ActionError.
 */

export type ActionErrorCode = "unauthenticated" | "forbidden" | "invalid" | "conflict" | "failed";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; error: string };

export class ActionError extends Error {
  constructor(message: string, readonly code: ActionErrorCode) {
    super(message);
    this.name = "ActionError";
  }
}

export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  if (result.code === "unauthenticated" && typeof window !== "undefined") {
    // Session expired / revoked: reloading lets the panel layout + middleware
    // send the user to the login page with a returnTo.
    window.location.reload();
  }
  throw new ActionError(result.error, result.code);
}
