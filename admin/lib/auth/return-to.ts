import "server-only";

import { locales, defaultLocale, type Locale } from "@/i18n";

export function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

/**
 * Validates a post-login `returnTo`. Only same-origin relative paths are
 * accepted: must start with "/", must not start with "//" or "/\" (protocol-
 * relative / backslash tricks), no backslashes or control characters at all.
 * Query string and hash are preserved. Anything else -> `/{locale}`.
 */
export function safeReturnTo(raw: unknown, locale: Locale): string {
  const fallback = `/${locale}`;
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("\\")) return fallback;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return fallback;
  }
  try {
    const base = "http://darna-admin.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    const path = url.pathname;
    // Never bounce back to the login page itself.
    if (/^\/(?:(?:en|fr|ar)\/)?login\/?$/.test(path)) return fallback;
    return `${path}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
