import "server-only";
import { cookies, headers } from "next/headers";

/**
 * Server-side client of the BLADUS Django API (backend/, /api/v1).
 *
 * Every page, server action and route handler reads and writes data through
 * this module (and the lib/data/* functions built on it). The browser never
 * talks to Django directly and never sees the API token: it lives in the
 * httpOnly cookie API_TOKEN_COOKIE (a staff session: /admin/auth/login + second factor) and is added here as a Bearer header.
 *
 * Behaviour (see the frontend-api-integration-patterns skill):
 * - errors are normalised into ApiError (status, stable code, field errors);
 * - reads (GET) retry network failures and 5xx with exponential backoff;
 *   writes are retried only when they carry an Idempotency-Key;
 * - every request has a timeout, so a stuck backend never hangs a page;
 * - 204 answers return null.
 */

/**
 * Next.js signals "this page depends on the request" by throwing from
 * cookies()/headers() during the build; those errors carry a `digest` and
 * must reach Next.js, or the page is wrongly built as a fixed page. Only a
 * plain "no request here" error may be swallowed.
 */
export function rethrowNextSignal(error: unknown): void {
  if (error && typeof error === "object" && "digest" in error) throw error;
}

export const API_BASE = (process.env.BACKEND_API_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "");

/** httpOnly cookie holding the Django session token (never readable by scripts). */
export const API_TOKEN_COOKIE = "bladus_admin_api_token";

const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiFieldErrors {
  [field: string]: string[] | ApiFieldErrors;
}

/** A failed call to the API, with the backend's stable error code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ApiFieldErrors | null;
  readonly payload: unknown;

  constructor(message: string, status: number, code: string, errors: ApiFieldErrors | null = null, payload: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.payload = payload;
  }
}

export type Query = Record<string, string | number | boolean | null | undefined | Array<string | number>>;

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Use this token instead of the session cookie (right after login, before the cookie exists). */
  token?: string | null;
  /** Send no token at all (public endpoints that must not depend on who asks, e.g. sitemap). */
  anonymous?: boolean;
  /** Makes a write safe to retry (06-api-design: Idempotency-Key). */
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Retries for GET (default 2). Writes ignore this unless idempotencyKey is set. */
  retries?: number;
  /** Extra headers (for example If-None-Match). */
  headers?: Record<string, string>;
}

/** The API token of the current request, or null outside a request or when signed out. */
export function currentApiToken(): string | null {
  try {
    return cookies().get(API_TOKEN_COOKIE)?.value || null;
  } catch (error) {
    rethrowNextSignal(error);
    return null; // called outside a request scope
  }
}

/** Locale for Accept-Language: the next-intl cookie, then the request's own header, else French. */
function currentLocale(): string {
  try {
    const fromCookie = cookies().get("NEXT_LOCALE")?.value;
    if (fromCookie) return fromCookie;
    const fromPath = headers().get("x-next-intl-locale");
    if (fromPath) return fromPath;
  } catch (error) {
    rethrowNextSignal(error);
    /* outside a request */
  }
  return "fr";
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return url.toString();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  return !(error instanceof Error && error.name === "AbortError");
}

async function once<T>(path: string, options: ApiOptions): Promise<T> {
  const method = options.method ?? "GET";
  const token = options.anonymous ? null : options.token ?? currentApiToken();
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": currentLocale(),
    ...options.headers,
  };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (options.idempotencyKey) requestHeaders["Idempotency-Key"] = options.idempotencyKey;
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers: requestHeaders, body, signal, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ApiError("The server took too long to answer.", 504, "timeout");
    }
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError("The server cannot be reached.", 503, "backend_unreachable");
  }

  if (response.status === 204 || response.status === 304) return null as T;
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const data = (payload && typeof payload === "object" ? payload : {}) as {
      code?: string;
      message?: string;
      detail?: string;
      errors?: ApiFieldErrors;
    };
    throw new ApiError(
      data.message || data.detail || `Request failed (${response.status})`,
      response.status,
      data.code || (response.status === 401 ? "not_authenticated" : `http_${response.status}`),
      data.errors ?? null,
      payload,
    );
  }
  return payload as T;
}

/** Call the API and return the parsed JSON body (null for 204). Throws ApiError on failure. */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const canRetry = method === "GET" || Boolean(options.idempotencyKey);
  let retries = canRetry ? options.retries ?? 2 : 0;
  let delay = 250;
  for (;;) {
    try {
      return await once<T>(path, options);
    } catch (error) {
      if (retries <= 0 || !isRetryable(error)) throw error;
      retries -= 1;
      await sleep(delay + Math.random() * 100);
      delay *= 2;
    }
  }
}

/** Like api() but answers null on 404 (for "find one" reads). */
export async function apiOrNull<T>(path: string, options: ApiOptions = {}): Promise<T | null> {
  try {
    return await api<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
}

/** The rows of a list answer, whatever its page shape ({results}, {count, results}, {results, meta}) or a bare array. */
export function rowsOf<T>(answer: unknown): T[] {
  if (Array.isArray(answer)) return answer as T[];
  if (answer && typeof answer === "object" && Array.isArray((answer as { results?: unknown }).results)) {
    return (answer as { results: T[] }).results;
  }
  return [];
}

/** Total count of a list answer, whatever its page shape. */
export function totalOf(answer: unknown): number {
  if (Array.isArray(answer)) return answer.length;
  const data = (answer ?? {}) as { count?: number; meta?: { total_count?: number }; results?: unknown[] };
  return data.count ?? data.meta?.total_count ?? data.results?.length ?? 0;
}

/**
 * Read every page of a list endpoint (page-number pagination), up to maxPages.
 * For small host-side lists; public search pages should pass page and page_size instead.
 */
export async function apiAll<T>(path: string, options: ApiOptions = {}, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const answer = await api<unknown>(path, { ...options, query: { page_size: 50, ...options.query, page } });
    const rows = rowsOf<T>(answer);
    out.push(...rows);
    const total = totalOf(answer);
    if (rows.length === 0 || out.length >= total) break;
  }
  return out;
}

/** A fresh Idempotency-Key for one user action. */
export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
