/**
 * Per-user browser storage. Personal data lives on the server; logout wipes
 * the UI preferences and any legacy copies kept in localStorage, so a shared
 * computer never shows the previous user's data.
 */

/**
 * Become-a-host drafts now live on the server (PUT /host/onboarding/drafts);
 * this prefix is only kept so logout wipes copies left by older versions.
 */
const HOST_DRAFT_PREFIX = "darna_host_draft";

/** Keys (or key prefixes) that hold per-user data or legacy identity values. */
const USER_SCOPED_PREFIXES = [
  HOST_DRAFT_PREFIX,
  "darna_favorites",
  "darna_mode",
  "darna_agency_id",
  // Legacy client-side copies (onboarding config, wallets now live on the server only).
  "darna_onboarding_config_individual",
  "darna_onboarding_config_agency",
  "darna_onboarding_config_hotel",
  "darna_onboarding_config_hostel",
  "darna_host_wallets_v1",
  "darna_commission_rates_v1",
];

export function clearUserLocalData(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        USER_SCOPED_PREFIXES.some((p) => key === p || key.startsWith(`${p}:`))
      ) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

/** Ends the session on the server, wipes per-user browser data, goes home. */
export async function logoutAndRedirect(target: string = "/"): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  clearUserLocalData();
  window.location.href = target;
}
