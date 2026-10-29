import "server-only";

import { redirect } from "@/navigation";

/**
 * Server redirect from a legacy duplicate route to its canonical page,
 * preserving the query string. Used by the old /finance, /audit-log, /team,
 * /onboarding and /providers routes (see docs/DATA-MODEL.md "Routes").
 */
export function redirectToCanonical(
  canonicalPath: string,
  searchParams: Record<string, string | string[] | undefined> = {}
): never {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.set(k, v);
  }
  const query = qs.toString();
  redirect(query ? `${canonicalPath}?${query}` : canonicalPath);
  throw new Error("unreachable");
}
