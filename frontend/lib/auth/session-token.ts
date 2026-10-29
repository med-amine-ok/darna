/**
 * Signed session token (HMAC-SHA256 via Web Crypto).
 *
 * This module is runtime-agnostic: it only uses `crypto.subtle`, `TextEncoder`
 * and `btoa`/`atob`, so the same code verifies the cookie in the Edge
 * middleware and in Node (server components, route handlers, server actions).
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 *
 * Do NOT import "server-only" here: the middleware bundle imports this file.
 * Nothing in here is secret except the key, which is read from the environment.
 */
import type { HostType } from "@/types";

export const SESSION_COOKIE = "darna_session";
/** 30 days */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  /** Random session id — used for server-side revocation on logout. */
  sid: string;
  userId: string;
  hostType: HostType | null;
  organizationId: string | null;
  /** Expiry, seconds since epoch. */
  exp: number;
}

const DEV_FALLBACK_SECRET = "darna-dev-only-insecure-session-secret-change-me";

let warnedAboutFallback = false;

function getSessionSecret(): string {
  const secret = process.env.DARNA_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DARNA_SESSION_SECRET is missing or shorter than 32 characters. Set it in the environment."
    );
  }
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      "[darna] DARNA_SESSION_SECRET is not set — using an insecure development fallback secret."
    );
  }
  return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;

function getKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  if (!cachedKey || cachedKey.secret !== secret) {
    cachedKey = {
      secret,
      key: crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      ),
    };
  }
  return cachedKey.key;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await getKey();
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${bytesToBase64Url(sig)}`;
}

function isHostType(value: unknown): value is HostType {
  return value === "individual" || value === "agency" || value === "hotel" || value === "hostel";
}

/**
 * Verifies signature and expiry. Returns null for anything malformed,
 * tampered with or expired. Never throws for bad input.
 */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(sig),
      encoder.encode(body)
    );
    if (!valid) return null;

    const parsed = JSON.parse(decoder.decode(base64UrlToBytes(body))) as Partial<SessionPayload>;
    if (
      typeof parsed.sid !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp * 1000 <= Date.now()) return null;

    return {
      sid: parsed.sid,
      userId: parsed.userId,
      hostType: isHostType(parsed.hostType) ? parsed.hostType : null,
      organizationId: typeof parsed.organizationId === "string" ? parsed.organizationId : null,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
