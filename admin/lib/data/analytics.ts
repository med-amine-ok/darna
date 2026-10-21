// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { WILAYAS } from "@/lib/utils/wilayas";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDashboardKPIs(period: string = "30d") {
  await delay(150);

  const multiplier = period === "7d" ? 0.28 : period === "90d" ? 2.6 : period === "1y" ? 9.4 : 1.0;

  const validBookings = store.bookings.filter((b) => b.status !== "cancelled");
  const totalGrossVolumeDzd = Math.round(
    validBookings.reduce((sum, b) => sum + b.totalAmountDzd, 0) * multiplier
  );
  const commissionRevenueDzd = Math.round(
    validBookings.reduce((sum, b) => sum + b.commissionAmountDzd, 0) * multiplier
  );
  const serviceFeesDzd = Math.round(
    validBookings.reduce((sum, b) => sum + b.serviceFeeDzd, 0) * multiplier
  );
  const netPlatformRevenueDzd = commissionRevenueDzd + serviceFeesDzd;

  const totalBookingsCount = Math.round(validBookings.length * multiplier);
  const activeListingsCount = store.listings.filter((l) => l.status === "approved").length;
  const newHostsCount = Math.round(store.hosts.filter((h) => h.status === "approved").length * (multiplier > 1 ? 1 : 0.4));
  const newUsersCount = Math.round(store.users.length * (multiplier > 1 ? 1 : 0.35));

  return {
    netPlatformRevenueDzd,
    totalGrossVolumeDzd,
    commissionRevenueDzd,
    totalBookingsCount,
    activeListingsCount,
    newHostsCount,
    newUsersCount,
    occupancyRatePercent: 78.4,
    cancellationRatePercent: 4.8,
    avgResponseTimeMinutes: 24,
    trends: {
      revenue: "+18.2%",
      volume: "+22.4%",
      bookings: "+15.6%",
      listings: "+11.2%",
      hosts: "+24.0%",
      users: "+31.8%",
    },
  };
}

export async function getDashboardCharts(period: string = "30d") {
  await delay(180);

  // Monthly revenue trend (last 6 months)
  const monthlyRevenue = [
    { month: "May", revenue: 1450000, bookings: 54, signups: 160 },
    { month: "Jun", revenue: 2180000, bookings: 78, signups: 280 },
    { month: "Jul", revenue: 3450000, bookings: 124, signups: 460 },
    { month: "Aug", revenue: 4120000, bookings: 156, signups: 580 },
    { month: "Sep", revenue: 2890000, bookings: 98, signups: 390 },
    { month: "Oct", revenue: 2640000, bookings: 92, signups: 340 },
  ];

  // Host Categories Financial & Net Performance computed from store
  const hostTypes = [
    { key: "individual", name: "Individual (Solo)", fill: "#6B7F5B", defaultRate: 12 },
    { key: "agency", name: "Tourism Agencies", fill: "#C96F4F", defaultRate: 15 },
    { key: "hotel", name: "Hotels & Palaces", fill: "#2E3A2F", defaultRate: 18 },
    { key: "hostel", name: "Youth Hostels", fill: "#D9C9B2", defaultRate: 10 },
  ];

  const hostCategoryPerformance = hostTypes.map((ht) => {
    const categoryBookings = store.bookings.filter(
      (b) => b.hostType === ht.key && b.status !== "cancelled"
    );
    const categoryHosts = store.hosts.filter(
      (h) => h.hostType === ht.key && h.status === "approved"
    );
    const categoryListings = store.listings.filter(
      (l) => l.hostType === ht.key && l.status === "approved"
    );

    const grossVolumeDzd = categoryBookings.reduce((sum, b) => sum + b.totalAmountDzd, 0);
    const platformCommissionDzd = categoryBookings.reduce((sum, b) => sum + b.commissionAmountDzd, 0);
    const hostNetPayoutDzd = categoryBookings.reduce((sum, b) => sum + b.hostPayoutDzd, 0);
    const bookingsCount = categoryBookings.length;
    const avgBookingValueDzd = bookingsCount > 0 ? Math.round(grossVolumeDzd / bookingsCount) : 0;
    const avgHostNetDzd = categoryHosts.length > 0 ? Math.round(hostNetPayoutDzd / categoryHosts.length) : 0;
    const effectiveCommissionRate = grossVolumeDzd > 0 
      ? Math.round((platformCommissionDzd / grossVolumeDzd) * 1000) / 10 
      : ht.defaultRate;

    return {
      key: ht.key,
      name: ht.name,
      fill: ht.fill,
      defaultRate: ht.defaultRate,
      effectiveCommissionRate,
      bookingsCount,
      activeHostsCount: categoryHosts.length,
      activeListingsCount: categoryListings.length,
      grossVolumeDzd,
      platformCommissionDzd,
      hostNetPayoutDzd,
      avgBookingValueDzd,
      avgHostNetDzd,
    };
  });

  // Revenue by Host Type for Recharts
  const revenueByHostType = hostCategoryPerformance.map((hcp) => ({
    name: hcp.name,
    key: hcp.key,
    revenue: hcp.grossVolumeDzd,
    platformNet: hcp.platformCommissionDzd,
    hostNet: hcp.hostNetPayoutDzd,
    bookings: hcp.bookingsCount,
    fill: hcp.fill,
  }));

  // Revenue by Vertical
  const revenueByVertical = [
    { name: "Homes & Stays", count: store.listings.filter((l) => l.category === "home").length, fill: "#2E3A2F" },
    { name: "Hotels & Hostels", count: store.listings.filter((l) => l.category === "hotel").length, fill: "#6B7F5B" },
    { name: "Sahara Expeditions", count: store.listings.filter((l) => l.category === "trip").length, fill: "#C96F4F" },
    { name: "4x4 Overlanders", count: store.listings.filter((l) => l.category === "vehicle").length, fill: "#D9C9B2" },
    { name: "Cultural Tours", count: store.listings.filter((l) => l.category === "experience").length, fill: "#5C6C5A" },
  ];

  // Bookings by Wilaya (Top 10)
  const wilayaCounts: Record<string, number> = {};
  store.bookings.forEach((b) => {
    wilayaCounts[b.wilayaCode] = (wilayaCounts[b.wilayaCode] || 0) + 1;
  });

  const bookingsByWilaya = Object.entries(wilayaCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([code, count]) => {
      const w = WILAYAS.find((item) => item.code === code);
      return {
        wilayaCode: code,
        wilayaName: w ? `${w.code} - ${w.nameEn}` : code,
        bookings: count,
      };
    });

  return {
    monthlyRevenue,
    revenueByHostType,
    hostCategoryPerformance,
    revenueByVertical,
    bookingsByWilaya,
  };
}

export async function getAttentionItems() {
  await delay(120);

  const pendingHosts = store.hosts.filter((h) => h.status === "under_review" || h.status === "applied");
  const pendingListings = store.listings.filter((l) => l.status === "pending_review");
  const flaggedReviews = store.reviews.filter((r) => r.status === "flagged");
  const disputedBookings = store.bookings.filter((b) => b.status === "disputed");

  return {
    pendingHostsCount: pendingHosts.length,
    pendingListingsCount: pendingListings.length,
    flaggedReviewsCount: flaggedReviews.length,
    disputedBookingsCount: disputedBookings.length,
    totalAttentionCount:
      pendingHosts.length + pendingListings.length + flaggedReviews.length + disputedBookings.length,
    topItems: [
      ...pendingHosts.slice(0, 3).map((h) => ({
        id: h.id,
        type: "host" as const,
        title: `Host Approval: ${h.ownerName}`,
        subtitle: `${h.hostType.toUpperCase()} in ${h.city}`,
        href: `/hosts/${h.id}`,
        time: h.joinedAt,
      })),
      ...pendingListings.slice(0, 3).map((l) => ({
        id: l.id,
        type: "listing" as const,
        title: `Listing Review: ${l.title}`,
        subtitle: `${l.category.toUpperCase()} · ${l.price} DZD`,
        href: `/listings/${l.id}`,
        time: l.createdAt,
      })),
      ...disputedBookings.slice(0, 2).map((b) => ({
        id: b.id,
        type: "booking" as const,
        title: `Dispute: ${b.reference}`,
        subtitle: `${b.guestName} vs ${b.hostName}`,
        href: `/bookings/${b.id}`,
        time: b.createdAt,
      })),
    ],
  };
}
