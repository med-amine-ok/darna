import "server-only";
import type { User } from "@/types";

/** GET /users/{id} (backend accounts PublicUserSerializer): never email, phone or address. */
export interface ApiPublicUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  spoken_languages: string[];
  joined_year: number;
  is_host: boolean;
  identity_verified: boolean;
  host_rating_avg: number | null;
  host_review_count: number;
  organizations: { slug: string; display_name: string; role?: string }[];
}

/** Answer of /auth/login, /auth/signup, /auth/2fa/authenticate (openapi Session). */
export interface ApiSession {
  status: "authenticated" | "pending_flow";
  session_token?: string;
  pending_flows?: { id: string; is_pending: boolean }[];
}

/** One second factor (GET /auth/authenticators). */
export interface ApiAuthenticator {
  id: string;
  type: string;
  created_at: string;
  last_used_at: string | null;
}

/** Second factor shown on the settings screen. */
export interface Authenticator {
  id: string;
  type: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const toAuthenticator = (row: ApiAuthenticator): Authenticator => ({
  id: row.id,
  type: row.type,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
});

/**
 * Public profile -> the frontend User type, with only public fields filled
 * (callers project it with toPublicUser before it reaches the browser).
 */
export function toPublicProfileUser(row: ApiPublicUser): User {
  const joinedYear = Number.isFinite(row.joined_year) ? row.joined_year : new Date().getFullYear();
  return {
    id: row.id,
    name: row.display_name,
    email: "",
    image: row.avatar_url,
    role: row.is_host ? "host" : "guest",
    hostType: null,
    organizationId: null,
    createdAt: new Date(Date.UTC(joinedYear, 0, 1)).toISOString(),
    favoriteIds: [],
    bio: row.bio || undefined,
    languages: row.spoken_languages ?? [],
    isIdentityVerified: row.identity_verified,
    yearsHosting: row.is_host ? Math.max(0, new Date().getFullYear() - joinedYear) : undefined,
  };
}

/** Split a display name typed in one box into the backend's first and last names. */
export function splitName(name: string): { first_name_latin: string; last_name_latin: string } {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { first_name_latin: first.slice(0, 80), last_name_latin: rest.join(" ").slice(0, 80) };
}

const LANGUAGE_CODES: Record<string, string> = {
  arabic: "ar", arabe: "ar", "العربية": "ar",
  french: "fr", "français": "fr", francais: "fr", "الفرنسية": "fr",
  english: "en", anglais: "en", "الإنجليزية": "en",
  tamazight: "ber", berber: "ber", kabyle: "kab",
  spanish: "es", espagnol: "es", german: "de", allemand: "de", italian: "it", italien: "it",
};

/** Profile languages (names or codes) -> two-letter codes the backend accepts; unknown ones are dropped. */
export function toLanguageCodes(languages: string[]): string[] {
  const out = new Set<string>();
  for (const raw of languages) {
    const value = raw.trim().toLowerCase();
    const code = /^[a-z]{2}$/.test(value) ? value : LANGUAGE_CODES[value];
    if (code && /^[a-z]{2}$/.test(code)) out.add(code);
  }
  return Array.from(out).slice(0, 10);
}

/**
 * A phone typed by a person -> E.164 (+213...). Algerian local numbers
 * (0XXXXXXXXX) get the country code; returns "" when it cannot be read.
 */
export function toE164(raw: string): string {
  const compact = raw.replace(/[\s().-]/g, "");
  if (!compact) return "";
  let e164 = compact;
  if (e164.startsWith("00")) e164 = `+${e164.slice(2)}`;
  else if (/^0\d{8,9}$/.test(e164)) e164 = `+213${e164.slice(1)}`;
  else if (/^\d{9,15}$/.test(e164) && e164.startsWith("213")) e164 = `+${e164}`;
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : "";
}

/**
 * httpOnly cookie holding the step-1 token of a sign-in waiting for its
 * second factor (BR-ACC-04). Short-lived; never readable by scripts.
 */
export const MFA_PENDING_COOKIE = "bladus_mfa_pending";
export const MFA_PENDING_MAX_AGE_SECONDS = 5 * 60;
