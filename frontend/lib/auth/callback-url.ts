/**
 * Open-redirect guard for `callbackUrl` style parameters.
 *
 * Only same-origin relative paths are allowed: the value must start with a
 * single "/" and must not start with "//" or "/\" (both are treated as
 * protocol-relative URLs by browsers). Anything else (absolute URLs,
 * `javascript:` URLs, empty values) falls back to the locale home page.
 *
 * Client-safe: used by the login page, modals and the middleware.
 */
export function safeCallbackUrl(raw: string | null | undefined, locale: string = "en"): string {
  const fallback = `/${locale}`;
  if (!raw || typeof raw !== "string") return fallback;

  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Reject control characters / whitespace tricks such as "/\t/evil.com"
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;

  return value;
}
