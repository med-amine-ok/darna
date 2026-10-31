import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { getMessages } from "next-intl/server";
import { namespaces } from "@/messages/namespaces";

/**
 * Client components only receive the translation namespaces they can use. The root
 * layout ships GLOBAL; area layouts wrap their pages with <ScopedIntlProvider scope=…>,
 * which re-provides GLOBAL plus that area's namespaces. Server components
 * (getTranslations) still see every namespace. This keeps ~80 KB of host-only copy
 * out of guest pages (Lighthouse: HTML/RSC payload size and parse time).
 */

type Namespace = (typeof namespaces)[number];

export const SCOPES = {
  host: [
    "host", "hostFlow", "hostWallet", "hostToday", "hostCalendar", "hostBookings",
    "hostListings", "hostSettings", "hostTrips", "hostNav", "agencyRegistration",
    "agencyTeam", "agencySettings", "messages", "reservations", "profile", "settings",
  ],
  settings: ["settings"],
  profile: ["profile"],
  help: ["help"],
  messages: ["messages"],
  reservations: ["reservations"],
  agency: ["agencyPublic", "profile"],
  favorites: ["favorites"],
  notifications: ["notifications"],
  tripDetail: ["tripDetail"],
} as const satisfies Record<string, readonly Namespace[]>;

export type Scope = keyof typeof SCOPES;

const SCOPED = new Set<string>(Object.values(SCOPES).flat());
// useFavorite (hearts on every card) reads `favorites` toasts, so it stays global.
const ALWAYS_GLOBAL = new Set<string>(["favorites"]);

export const GLOBAL_NAMESPACES = namespaces.filter((ns) => !SCOPED.has(ns) || ALWAYS_GLOBAL.has(ns));

export function pickMessages(messages: AbstractIntlMessages, keep: readonly string[]): AbstractIntlMessages {
  return Object.fromEntries(Object.entries(messages).filter(([ns]) => keep.includes(ns)));
}

export default async function ScopedIntlProvider({ scope, children }: { scope: Scope; children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickMessages(messages, [...GLOBAL_NAMESPACES, ...SCOPES[scope]])}>
      {children}
    </NextIntlClientProvider>
  );
}
