/**
 * Per-user browser storage. Anything personal kept in localStorage is keyed
 * by user id and wiped on logout, so a shared computer never shows the
 * previous user's drafts.
 */

const HOST_DRAFT_PREFIX = "darna_host_draft";

export function hostDraftKey(userId: string): string {
  return `${HOST_DRAFT_PREFIX}:${userId}`;
}

export function readHostDraft(userId: string | null | undefined): Record<string, unknown> | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(hostDraftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeHostDraft(userId: string, draft: Record<string, unknown>): void {
  try {
    localStorage.setItem(hostDraftKey(userId), JSON.stringify(draft));
  } catch {
    // storage full / disabled — drafts are best-effort
  }
}

export function clearHostDraft(userId: string): void {
  try {
    localStorage.removeItem(hostDraftKey(userId));
  } catch {}
}

/** Keys (or key prefixes) that hold per-user data or legacy identity values. */
const USER_SCOPED_PREFIXES = [
  HOST_DRAFT_PREFIX,
  "darna_favorites",
  "darna_mode",
  "darna_agency_id",
  // Legacy client-side wallet copies (wallets now live on the server only).
  "darna_host_wallets_v1",
  "darna_commission_rates_v1",
];

export function clearUserLocalData(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && USER_SCOPED_PREFIXES.some((p) => key === p || key.startsWith(`${p}:`))) {
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
