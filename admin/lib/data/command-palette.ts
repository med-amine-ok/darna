import "server-only";

import { ApiError, api } from "@/lib/api/client";
import { logReadError } from "@/lib/api/mapping";
import type { CommandPaletteResult } from "@/lib/types";

export type { CommandPaletteResult } from "@/lib/types";

interface ApiSearchHit {
  type: "host" | "listing" | "trip" | "booking" | "user";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/** Shortcuts shown before the admin types (static navigation, not data). */
const QUICK_ACTIONS: CommandPaletteResult[] = [
  { id: "act_approvals", type: "action", title: "Go to Moderation Approvals", subtitle: "Review pending hosts & listings", href: "/approvals", badge: "Inbox" },
  { id: "act_hosts", type: "action", title: "Browse Hosts & Partners", subtitle: "Host accounts and their documents", href: "/hosts", badge: "Partners" },
  { id: "act_users", type: "action", title: "Browse Users", subtitle: "Guests and hosts as people", href: "/users", badge: "People" },
  { id: "act_finance", type: "action", title: "Manage Host Wallets & Ledger", subtitle: "Wallets, top-ups, commissions", href: "/payments", badge: "Finance" },
  { id: "act_onboarding", type: "action", title: "Configure Onboarding Flows", subtitle: "Step builder & field editor", href: "/settings/onboarding", badge: "Config" },
];

/** Admin screens that open each kind of hit (the panel has no detail page for some of them). */
function hrefOf(hit: ApiSearchHit): string {
  switch (hit.type) {
    case "host":
      return `/hosts/${hit.id}`;
    case "trip":
      return `/trips/${hit.id}`;
    case "listing":
      return `/listings?search=${encodeURIComponent(hit.title)}`;
    case "booking":
      return `/bookings?search=${encodeURIComponent(hit.title)}`;
    case "user":
      return `/users?search=${encodeURIComponent(hit.title)}`;
    default:
      return hit.href;
  }
}

/** Command palette search: GET /admin/search (2 characters at least, 12 hits). */
export async function searchGlobalCommandPalette(query: string): Promise<CommandPaletteResult[]> {
  const q = query.trim();
  if (!q) return QUICK_ACTIONS;
  if (q.length < 2) return [];
  try {
    const answer = await api<{ results: ApiSearchHit[] }>("/admin/search", { query: { q, limit: 12 } });
    return (answer.results ?? []).map((hit) => ({
      id: `${hit.type}_${hit.id}`,
      type: hit.type === "trip" ? "listing" : hit.type,
      title: hit.title,
      subtitle: hit.subtitle ?? "",
      href: hrefOf(hit),
      badge: hit.type,
    }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return [];
    logReadError("admin search", error);
    return [];
  }
}
