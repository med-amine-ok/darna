/**
 * Share a BLADUS page (client-side only).
 *
 * Phones and some browsers have a native share sheet (WhatsApp, Messenger,
 * SMS...): use it when available. Elsewhere copy the link to the clipboard.
 * `path` is a site path without the locale ("/users/karim-m"); the link is
 * built from the current origin and locale so it opens in the same language.
 */

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** Absolute URL of `path` in `locale` on the current site. */
export function absoluteUrl(path: string, locale: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}/${locale}${clean}`;
}

export async function shareLink({ url, title }: { url: string; title?: string }): Promise<ShareOutcome> {
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean };
  const data: ShareData = { url, title };
  if (typeof nav.share === "function" && (!nav.canShare || nav.canShare(data))) {
    try {
      await nav.share(data);
      return "shared";
    } catch (error) {
      // The person closed the share sheet: not an error.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  return copyText(url);
}

/** Copy `text` to the clipboard. */
export async function copyText(text: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
