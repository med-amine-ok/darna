import "server-only";
import { api } from "./client";

/** GET /auth/providers: sign-in options and phone rules set on the backend. */
export interface AuthProviders {
  googleEnabled: boolean;
  /** True when a phone must be confirmed with an SMS code (backend PHONE_OTP_REQUIRED). */
  phoneOtpRequired: boolean;
}

let cached: { value: AuthProviders; at: number } | null = null;
const MAX_AGE_MS = 60_000;

/**
 * The backend's sign-in settings, kept one minute in memory (they change only
 * when the server is reconfigured). When the API cannot be reached, phone
 * codes count as required, the safe answer.
 */
export async function getAuthProviders(): Promise<AuthProviders> {
  if (cached && Date.now() - cached.at < MAX_AGE_MS) return cached.value;
  try {
    const raw = await api<{ google_enabled: boolean; phone_otp_required?: boolean }>("/auth/providers", { anonymous: true });
    const value = { googleEnabled: raw.google_enabled, phoneOtpRequired: raw.phone_otp_required !== false };
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return { googleEnabled: false, phoneOtpRequired: true };
  }
}
