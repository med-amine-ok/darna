// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";

export interface CommandPaletteResult {
  id: string;
  type: "host" | "listing" | "user" | "booking" | "review" | "action";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

export async function searchGlobalCommandPalette(query: string): Promise<CommandPaletteResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Default quick suggestions
    return [
      { id: "act_approvals", type: "action", title: "Go to Moderation Approvals", subtitle: "Review pending hosts & listings", href: "/approvals", badge: "Inbox" },
      { id: "act_network", type: "action", title: "Open Network Explorer", subtitle: "Search marketplace with guest filters", href: "/network", badge: "Explore" },
      { id: "act_hosts", type: "action", title: "Browse Hosts & Partners", subtitle: "4 categories, wilaya and price filters", href: "/hosts", badge: "Partners" },
      { id: "act_finance", type: "action", title: "Manage Host Wallets & Ledger", subtitle: "Ledger, commissions, payouts", href: "/finance", badge: "Finance" },
      { id: "act_onboarding", type: "action", title: "Configure Onboarding Flows", subtitle: "Step builder & field editor", href: "/onboarding", badge: "Config" },
    ];
  }

  const results: CommandPaletteResult[] = [];

  // 1. Hosts
  store.hosts.forEach((h) => {
    if (
      h.ownerName.toLowerCase().includes(q) ||
      (h.businessName || "").toLowerCase().includes(q) ||
      h.email.toLowerCase().includes(q)
    ) {
      if (results.length < 15) {
        results.push({
          id: `h_${h.id}`,
          type: "host",
          title: h.businessName || h.ownerName,
          subtitle: `Host (${h.hostType}) · ${h.city} · ${h.status}`,
          href: `/hosts/${h.id}`,
          badge: h.status,
        });
      }
    }
  });

  // 2. Listings
  store.listings.forEach((l) => {
    if (
      l.title.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.hostName.toLowerCase().includes(q)
    ) {
      if (results.length < 15) {
        results.push({
          id: `l_${l.id}`,
          type: "listing",
          title: l.title,
          subtitle: `${l.category.toUpperCase()} · by ${l.hostName} · ${l.price} DZD`,
          href: `/listings/${l.id}`,
          badge: l.status,
        });
      }
    }
  });

  // 3. Bookings
  store.bookings.forEach((b) => {
    if (
      b.reference.toLowerCase().includes(q) ||
      b.guestName.toLowerCase().includes(q) ||
      b.hostName.toLowerCase().includes(q)
    ) {
      if (results.length < 15) {
        results.push({
          id: `b_${b.id}`,
          type: "booking",
          title: `Booking ${b.reference}`,
          subtitle: `${b.guestName} · ${b.totalAmountDzd} DZD · ${b.status}`,
          href: `/bookings/${b.id}`,
          badge: b.status,
        });
      }
    }
  });

  // 4. Users
  store.users.forEach((u) => {
    if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
      if (results.length < 15) {
        results.push({
          id: `u_${u.id}`,
          type: "user",
          title: u.name,
          subtitle: `Guest · ${u.email} · ${u.status}`,
          href: `/users/${u.id}`,
          badge: u.role,
        });
      }
    }
  });

  return results.slice(0, 12);
}
