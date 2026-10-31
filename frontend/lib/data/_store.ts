import "server-only";

/**
 * Mock persistence layer.
 *
 * Every in-memory "table" lives on `globalThis` so that all route handlers,
 * server actions and server components share ONE copy (Next.js may evaluate a
 * module more than once across bundles, and HMR re-evaluates modules in dev).
 * Arrays are always mutated in place, never reassigned, so every importer
 * keeps seeing the same data.
 *
 * TODO: replace with Supabase, each lib/data function becomes a query.
 */
export function globalStore<T>(key: string, init: () => T): T {
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[key] === undefined) {
    g[key] = init();
  }
  return g[key] as T;
}

/** Removes every element matching `predicate` in place. Returns how many were removed. */
export function removeWhere<T>(
  items: T[],
  predicate: (item: T) => boolean,
): number {
  let removed = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) {
      items.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

/** Deep-ish copy so callers can never mutate the store through a returned object. */
export function clone<T>(value: T): T {
  return value === undefined || value === null
    ? value
    : (JSON.parse(JSON.stringify(value)) as T);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
