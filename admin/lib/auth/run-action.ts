import "server-only";

import { isRedirectError } from "next/dist/client/components/redirect";
import { isNotFoundError } from "next/dist/client/components/not-found";
import type { ActionResult } from "@/lib/actions/result";
import type { AdminActor, Permission } from "@/lib/types";
import { AuthError, ForbiddenError, requireAdmin, requirePermission } from "./current-admin";
import { DomainError, ValidationError } from "@/lib/data/errors";
import { hasPermission } from "@/lib/permissions";
import { MAX_MONEY_DZD, isValidCommissionRate } from "@/lib/pricing";
import { MIN_REASON_LENGTH } from "@/lib/domain/transitions";

export class InvalidInputError extends Error {
  readonly code = "invalid" as const;
}

/**
 * Standard server-action pipeline:
 *   1. resolve the admin from the verified session cookie (store lookup,
 *      must exist and be active, CURRENT role from the store);
 *   2. enforce `permission` (null = any signed-in admin);
 *   3. run the data-layer call with the server-derived actor.
 */
export async function runAction<T>(
  permission: Permission | null,
  fn: (actor: AdminActor) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const actor = permission ? await requirePermission(permission) : await requireAdmin();
    return { ok: true, data: await fn(actor) };
  } catch (err) {
    if (isRedirectError(err) || isNotFoundError(err)) throw err;
    if (err instanceof AuthError) return { ok: false, code: "unauthenticated", error: err.message };
    if (err instanceof ForbiddenError) return { ok: false, code: "forbidden", error: err.message };
    if (err instanceof InvalidInputError || err instanceof ValidationError) {
      return { ok: false, code: "invalid", error: err.message };
    }
    if (err instanceof DomainError) return { ok: false, code: "conflict", error: err.message };
    const message = err instanceof Error ? err.message : "Unexpected error";
    // lib/permissions.assertCan (defense in depth inside lib/data)
    if (message.startsWith("Unauthorized:")) return { ok: false, code: "forbidden", error: message };
    console.error("[server action]", err);
    return { ok: false, code: "failed", error: message };
  }
}

// ---- Minimal input validation helpers (inputs come from the network) ----

export function str(value: unknown, field: string, maxLen = 2000): string {
  if (typeof value !== "string") throw new InvalidInputError(`Invalid ${field}`);
  if (value.length > maxLen) throw new InvalidInputError(`${field} is too long`);
  return value;
}

export function id(value: unknown, field = "id"): string {
  const s = str(value, field, 200);
  if (!s.trim()) throw new InvalidInputError(`Missing ${field}`);
  return s;
}

export function num(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidInputError(`Invalid ${field}`);
  return value;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new InvalidInputError(`Invalid ${field}`);
  }
  return value as T;
}

export function obj<T extends object>(value: unknown, field: string): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidInputError(`Invalid ${field}`);
  }
  return value as T;
}

/** Integer DZD amount in [min, max] (rejects NaN, Infinity, floats, out of range). */
export function dzd(value: unknown, field: string, min = 1, max = MAX_MONEY_DZD): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidInputError(`Invalid ${field}`);
  if (!Number.isInteger(value)) throw new InvalidInputError(`${field} must be a whole number of DZD`);
  if (value < min || value > max) throw new InvalidInputError(`${field} must be between ${min} and ${max} DZD`);
  return value;
}

/** Commission rate: 0..100 with at most 2 decimals. */
export function rate(value: unknown, field: string): number {
  if (!isValidCommissionRate(value)) {
    throw new InvalidInputError(`${field} must be a percentage between 0 and 100 with at most 2 decimals`);
  }
  return value;
}

/** Mandatory free-text justification (reject / suspend / ban / refund…). */
export function reason(value: unknown, field = "reason", maxLen = 1000): string {
  const s = str(value, field, maxLen).trim();
  if (s.length < MIN_REASON_LENGTH) throw new InvalidInputError(`A ${field} of at least ${MIN_REASON_LENGTH} characters is required`);
  return s;
}

/** Throws ForbiddenError unless the actor's role also grants `permission`. */
export function requireAlso(actor: AdminActor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) throw new ForbiddenError(permission);
}
