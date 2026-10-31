/**
 * DARNA Admin, Plain-Language Glossary & "Where did it go?" structure
 * Implements IHM course rules (§3.2, T3: Hick's Law, Langage employé)
 *
 * Strict rule: Never display raw system jargon, database codes, or cryptic abbreviations.
 * Always translate system entities to human, plain-language terms.
 *
 * This file only holds STRUCTURE (ids, routes). All user-facing text lives in
 * the next-intl messages:
 *   - glossary.<key>.{term, plainTerm, definition, howItIsCounted?}
 *   - whereDidItGo.items.<id>.{oldName, newName, location, description}
 */
import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

export const GLOSSARY_KEYS = [
  "gmv",
  "commission",
  "bookingsCount",
  "newHosts",
  "occupancy",
  "cancellationRate",
  "payout",
  "auditLog",
  "onboardingConfig",
  "pendingReview",
  "users",
] as const;

export type GlossaryKey = (typeof GLOSSARY_KEYS)[number];

/** Keys that also have a `howItIsCounted` explanation in messages. */
const KEYS_WITH_HOW_COUNTED: ReadonlySet<string> = new Set<GlossaryKey>([
  "gmv",
  "commission",
  "bookingsCount",
  "newHosts",
  "occupancy",
]);

function isGlossaryKey(key: string): key is GlossaryKey {
  return (GLOSSARY_KEYS as readonly string[]).includes(key);
}

/**
 * Localized glossary lookups (client or non-async server components).
 * The getters keep the legacy `(key, locale?)` signature so existing call sites
 * only need to swap the import for this hook; the locale argument is ignored
 * (the active next-intl locale is used).
 */
export function useGlossary() {
  const t = useTranslations("glossary");

  const getPlainTerm = useCallback(
    (key: string, ..._legacyLocale: unknown[]): string =>
      isGlossaryKey(key) ? t(`${key}.plainTerm`) : key,
    [t],
  );
  const getDefinition = useCallback(
    (key: string, ..._legacyLocale: unknown[]): string =>
      isGlossaryKey(key) ? t(`${key}.definition`) : "",
    [t],
  );
  const getHowItIsCounted = useCallback(
    (key: string, ..._legacyLocale: unknown[]): string =>
      KEYS_WITH_HOW_COUNTED.has(key) ? t(`${key}.howItIsCounted`) : "",
    [t],
  );
  const getTerm = useCallback(
    (key: string): string => (isGlossaryKey(key) ? t(`${key}.term`) : key),
    [t],
  );

  return { getPlainTerm, getDefinition, getHowItIsCounted, getTerm };
}

/**
 * Where Did It Go? Migration mapping for existing staff
 * Accompanies change to avoid "Syndrome de l'oisillon" (T6)
 * Text: whereDidItGo.items.<id>.{oldName, newName, location, description}
 */
export type MigrationItemId =
  | "guests"
  | "onboarding"
  | "auditLog"
  | "money"
  | "team"
  | "disputes";

export interface MigrationItem {
  id: MigrationItemId;
  href: string;
}

export const WHERE_DID_IT_GO_ITEMS: readonly MigrationItem[] = [
  { id: "guests", href: "/users" },
  { id: "onboarding", href: "/settings/onboarding" },
  { id: "auditLog", href: "/settings/audit-log" },
  { id: "money", href: "/payments" },
  { id: "team", href: "/settings/team" },
  { id: "disputes", href: "/bookings?tab=disputed" },
];

export interface LocalizedMigrationItem extends MigrationItem {
  oldName: string;
  newName: string;
  location: string;
  description: string;
}

/** Migration items with their text resolved in the active locale. */
export function useMigrationItems(): LocalizedMigrationItem[] {
  const t = useTranslations("whereDidItGo.items");
  return useMemo(
    () =>
      WHERE_DID_IT_GO_ITEMS.map((item) => ({
        ...item,
        oldName: t(`${item.id}.oldName`),
        newName: t(`${item.id}.newName`),
        location: t(`${item.id}.location`),
        description: t(`${item.id}.description`),
      })),
    [t],
  );
}

/** Case-insensitive search over the old name, new name and description. */
export function filterMigrationItems(
  items: LocalizedMigrationItem[],
  query: string,
  locale: string,
): LocalizedMigrationItem[] {
  const q = query.trim().toLocaleLowerCase(locale);
  if (!q) return items;
  return items.filter((item) =>
    [item.oldName, item.newName, item.description].some((s) =>
      s.toLocaleLowerCase(locale).includes(q),
    ),
  );
}
