import "server-only";

import { ApiError, api, rowsOf, totalOf, type ApiOptions } from "./client";
import { AuthError } from "@/lib/auth/current-admin";
import { DomainError, ValidationError } from "@/lib/data/errors";
import type { PaginatedResult } from "@/lib/types";

/**
 * Small helpers shared by the admin data modules wired to the Django API
 * (finance, ledger, bookings, listings, categories, promotions, reviews,
 * analytics). Mappers of one area live in lib/api/<area>.ts.
 */

/** Money as the API sends it: integer centimes and a currency. */
export interface ApiMoney {
  amount_minor: number;
  currency: string;
}

/** Centimes (or a Money dict) to whole-ish dinars, as the admin types use. Null-safe. */
export function dzd(value: ApiMoney | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const minor = typeof value === "number" ? value : value.amount_minor;
  if (!Number.isFinite(minor)) return 0;
  return minor / 100;
}

/** Dinars to integer centimes for writes. */
export function minor(amountDzd: number): number {
  return Math.round(amountDzd * 100);
}

/** A Money input body for writes. */
export function moneyInput(amountDzd: number): ApiMoney {
  return { amount_minor: minor(amountDzd), currency: "DZD" };
}

/** Plain text of the first field error, if any (for the user-facing message). */
function firstFieldError(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;
  for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return `${field}: ${String(value[0])}`;
    if (value && typeof value === "object") {
      const nested = firstFieldError(value);
      if (nested) return `${field}.${nested}`;
    }
  }
  return null;
}

/**
 * Turns an ApiError into the error classes runAction already maps:
 * 401 -> unauthenticated, 403 -> forbidden, 400/422 -> invalid, 404/409 -> conflict.
 * Other errors pass through (runAction answers "failed").
 */
export function toActionError(error: unknown): unknown {
  if (!(error instanceof ApiError)) return error;
  if (error.status === 401) return new AuthError();
  // runAction maps messages starting with "Unauthorized:" to the forbidden code.
  if (error.status === 403) return new Error(`Unauthorized: ${error.message} (${error.code})`);
  if (error.status === 400 || error.status === 422) {
    return new ValidationError(firstFieldError(error.errors) ?? error.message);
  }
  if (error.status === 404 || error.status === 409 || error.status === 410) return new DomainError(error.message);
  return error;
}

/** Runs an API write and rethrows its failure in the shape runAction understands. */
export async function write<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toActionError(error);
  }
}

/** Logs a failed read without the token or personal data. */
export function logReadError(where: string, error: unknown): void {
  const detail = error instanceof ApiError ? `${error.status} ${error.code}` : error instanceof Error ? error.message : "unknown";
  console.error(`[api read] ${where}: ${detail}`);
}

/** An empty page, for reads that failed (the page shows its empty or error state). */
export function emptyPage<T>(page = 1, pageSize = 20): PaginatedResult<T> {
  return { rows: [], total: 0, page, pageSize, totalPages: 1 };
}

/**
 * Reads one page of a DRF list endpoint (`{count, page, page_size, results}`)
 * and maps its rows. pageSize is capped at 50 (the backend maximum).
 */
export async function fetchPage<Raw, Row>(
  path: string,
  map: (raw: Raw) => Row,
  params: { page?: number; pageSize?: number; query?: ApiOptions["query"] } = {},
): Promise<PaginatedResult<Row>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 20));
  const answer = await api<unknown>(path, { query: { ...params.query, page, page_size: pageSize } });
  const total = totalOf(answer);
  return {
    rows: rowsOf<Raw>(answer).map(map),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Value of a list filter, without the "all" sentinel the screens use. */
export function filterValue(value: string | undefined | null): string | undefined {
  if (!value || value === "all") return undefined;
  return value;
}
