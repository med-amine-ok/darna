/**
 * Id and slug helpers. Ids are generated on the server only (lib/data/*),
 * never in the browser.
 */

export function newId(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

// Built with the RegExp constructor so the Unicode property escapes don't
// depend on the TypeScript compile target.
const NON_WORD = new RegExp("[^\\p{L}\\p{N}]+", "gu");
const COMBINING_MARKS = new RegExp("\\p{M}", "gu");

/**
 * Unicode-aware slug: keeps letters/digits of any script (Arabic, French
 * accents are folded to ASCII), collapses everything else to "-".
 * `isTaken` lets the caller guarantee uniqueness.
 */
export function slugify(
  title: string,
  isTaken: (slug: string) => boolean = () => false,
  fallback: string = "item"
): string {
  const latinFolded = title
    .normalize("NFKD")
    // Strip combining marks: Latin accents (é -> e) and Arabic tashkeel.
    .replace(COMBINING_MARKS, "")
    .normalize("NFC")
    .toLowerCase();

  let base = latinFolded.replace(NON_WORD, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!base) base = fallback;

  let candidate = base;
  while (isTaken(candidate)) {
    candidate = `${base}-${globalThis.crypto.randomUUID().slice(0, 6)}`;
  }
  return candidate;
}
