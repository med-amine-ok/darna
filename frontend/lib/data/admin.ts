import { mockListings } from "@/lib/mock-data/listings";
import { mockReservations } from "@/lib/mock-data/reservations";
import { mockUsers } from "@/lib/mock-data/users";
import { mockOrganizations } from "@/lib/mock-data/organizations";
import { Listing, Reservation, User, Organization } from "@/types";

// Audit log entry interface
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  targetType: "listing" | "booking" | "user" | "review" | "setting" | "coupon" | "organization";
  targetId: string;
  details: string;
  ipAddress: string;
}

// Coupon interface
export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed_dzd";
  discountValue: number;
  minSpendDzd: number;
  maxUsage: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "disabled";
  scope: "all" | "homes" | "experiences" | "vehicles";
}

// Review moderation interface
export interface AdminReview {
  id: string;
  listingId: string;
  listingTitle: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: "published" | "flagged" | "removed";
  flagReason?: string;
}

// Category / Amenity definition
export interface AdminCategory {
  id: string;
  nameEn: string;
  nameFr: string;
  nameAr: string;
  vertical: "home" | "experience" | "vehicle";
  iconName: string;
  listingCount: number;
  isActive: boolean;
}

// ==========================================
// In-Memory Admin Stores
// ==========================================

let auditLogStore: AuditLogEntry[] = [
  {
    id: "aud_01",
    timestamp: "2026-10-07T18:22:10.000Z",
    adminName: "DARNA Administrator",
    action: "VERIFY_ORGANIZATION",
    targetType: "organization",
    targetId: "org_atlas_escapes",
    details: "Approved RC license DZ-ALG-2021-B-89412 for Atlas Escapes Tourism SARL",
    ipAddress: "197.200.45.12 (Algiers)",
  },
  {
    id: "aud_02",
    timestamp: "2026-10-07T14:15:00.000Z",
    adminName: "DARNA Administrator",
    action: "UPDATE_COMMISSION",
    targetType: "setting",
    targetId: "platform_commission",
    details: "Set standard host commission to 3.0% and guest service fee to 7.0%",
    ipAddress: "197.200.45.12 (Algiers)",
  },
  {
    id: "aud_03",
    timestamp: "2026-10-06T11:40:22.000Z",
    adminName: "DARNA Administrator",
    action: "FEATURE_LISTING",
    targetType: "listing",
    targetId: "lst_tipaza_villa",
    details: "Promoted Tipaza Mediterranean Villa to homepage featured curation",
    ipAddress: "197.200.45.12 (Algiers)",
  },
  {
    id: "aud_04",
    timestamp: "2026-10-05T09:12:45.000Z",
    adminName: "DARNA Administrator",
    action: "RESOLVE_DISPUTE",
    targetType: "booking",
    targetId: "res_oran_04",
    details: "Approved guest SATIM Edahabia refund of 48,000 DZD following host cancellation",
    ipAddress: "197.200.45.12 (Algiers)",
  },
];

let couponsStore: Coupon[] = [
  {
    id: "cpn_sahara2026",
    code: "SAHARA2026",
    discountType: "percentage",
    discountValue: 15,
    minSpendDzd: 50000,
    maxUsage: 100,
    usedCount: 38,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    status: "active",
    scope: "experiences",
  },
  {
    id: "cpn_marhaban",
    code: "MARHABAN",
    discountType: "fixed_dzd",
    discountValue: 5000,
    minSpendDzd: 30000,
    maxUsage: 500,
    usedCount: 214,
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    status: "active",
    scope: "all",
  },
  {
    id: "cpn_oran_sea",
    code: "ORANSEA",
    discountType: "percentage",
    discountValue: 10,
    minSpendDzd: 25000,
    maxUsage: 50,
    usedCount: 50,
    startDate: "2026-07-01",
    endDate: "2026-09-01",
    status: "expired",
    scope: "homes",
  },
];

let reviewsStore: AdminReview[] = [
  {
    id: "rev_01",
    listingId: "lst_tipaza_villa",
    listingTitle: "Mediterranean Villa overlooking Roman Ruins",
    authorName: "Yacine Cherif",
    authorAvatar: "/assets/avatar.png",
    rating: 5,
    comment: "An unforgettable stay in Tipaza. The sea view from the olive garden is even better in person.",
    createdAt: "2026-09-16T12:00:00.000Z",
    status: "published",
  },
  {
    id: "rev_02",
    listingId: "lst_algiers_casbah",
    listingTitle: "Restored Historic Riad in Casbah of Algiers",
    authorName: "Sarah Touati",
    authorAvatar: "/assets/avatar.png",
    rating: 5,
    comment: "Authentic Casbah palace experience. The host arranged traditional mint tea and warm welcome.",
    createdAt: "2026-09-20T14:30:00.000Z",
    status: "published",
  },
  {
    id: "rev_03",
    listingId: "lst_constantine_cliff",
    listingTitle: "Heritage Ottoman Residence near Rhumel Gorge",
    authorName: "Guest User",
    authorAvatar: "/assets/avatar.png",
    rating: 2,
    comment: "Disputed checkout timing; host asked to leave earlier than stated.",
    createdAt: "2026-10-02T08:15:00.000Z",
    status: "flagged",
    flagReason: "Host flagged for factual discrepancy with checkout time",
  },
];

let categoriesStore: AdminCategory[] = [
  { id: "cat_villas", nameEn: "Coastal Villas", nameFr: "Villas Côtières", nameAr: "فيلات ساحلية", vertical: "home", iconName: "BiHomeHeart", listingCount: 14, isActive: true },
  { id: "cat_riads", nameEn: "Heritage Riads", nameFr: "Riads Historiques", nameAr: "رياض أثرية", vertical: "home", iconName: "GiArchBridge", listingCount: 8, isActive: true },
  { id: "cat_sahara", nameEn: "Desert Camps & Expeditions", nameFr: "Camps Sahariens", nameAr: "مخيمات صحراوية", vertical: "experience", iconName: "GiOasis", listingCount: 12, isActive: true },
  { id: "cat_4x4", nameEn: "Sahara 4x4 & Overlanders", nameFr: "Véhicules Tout-Terrain", nameAr: "مركبات الدفع الرباعي", vertical: "vehicle", iconName: "BiCar", listingCount: 9, isActive: true },
  { id: "cat_culinary", nameEn: "Culinary & Crafts", nameFr: "Ateliers Culinaires", nameAr: "ورشات الطهي والحرف", vertical: "experience", iconName: "BiCoffee", listingCount: 6, isActive: true },
];

import { getCommissionRates, saveCommissionRates } from "@/lib/data/wallet";
import { HostTypeCommissionRates } from "@/types";

let platformSettings = {
  hostCommissionPercent: 12.0, // Legacy fallback
  hostCommissionRates: {
    individual: 12.0,
    agency: 15.0,
    hotel: 18.0,
    hostel: 10.0,
  } as HostTypeCommissionRates,
  guestServiceFeePercent: 7.0,
  supportedCurrencies: ["DZD", "EUR", "USD"],
  primaryCurrency: "DZD",
  supportedLocales: ["en", "fr", "ar"],
  defaultLocale: "fr",
  instantBookingPlatformWide: true,
  smsGatewaysEnabled: true,
  maintenanceMode: false,
};

// Log helper
export function logAdminAction(
  action: string,
  targetType: AuditLogEntry["targetType"],
  targetId: string,
  details: string
) {
  const newEntry: AuditLogEntry = {
    id: `aud_${Date.now()}`,
    timestamp: new Date().toISOString(),
    adminName: "DARNA Administrator",
    action,
    targetType,
    targetId,
    details,
    ipAddress: "197.200.45.12 (Algiers)",
  };
  auditLogStore = [newEntry, ...auditLogStore];
}

// ==========================================
// Centralized Aggregations
// ==========================================

export async function getAdminKPIs() {
  await new Promise((resolve) => setTimeout(resolve, 60));

  const totalGrossVolumeDzd = mockReservations
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => sum + r.totalPrice, 0);

  const platformNetRevenueDzd = Math.round(totalGrossVolumeDzd * 0.1); // 3% host + 7% guest fees

  const totalBookings = mockReservations.length;
  const activeListings = mockListings.filter((l) => l.status === "active").length;
  const totalUsers = mockUsers.length;
  const hostCount = mockUsers.filter((u) => u.role === "host").length;
  const guestCount = mockUsers.filter((u) => u.role === "guest").length;

  const avgBookingValueDzd = Math.round(totalGrossVolumeDzd / (mockReservations.length || 1));

  return {
    platformNetRevenueDzd,
    totalGrossVolumeDzd,
    totalBookings,
    activeListings,
    totalUsers,
    hostCount,
    guestCount,
    avgBookingValueDzd,
    occupancyRatePercent: 78.4,
    trends: {
      revenue: "+18.2%",
      bookings: "+24.5%",
      listings: "+12.0%",
      users: "+31.8%",
      occupancy: "+4.6%",
    },
  };
}

export async function getAdminCharts(period: string = "30d") {
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Realistic Algerian seasonal monthly data
  const monthlyRevenue = [
    { month: "May", revenue: 840000, bookings: 32, signups: 140 },
    { month: "Jun", revenue: 1450000, bookings: 58, signups: 260 },
    { month: "Jul", revenue: 2180000, bookings: 86, signups: 420 },
    { month: "Aug", revenue: 2750000, bookings: 104, signups: 510 },
    { month: "Sep", revenue: 1920000, bookings: 76, signups: 340 },
    { month: "Oct", revenue: 1680000, bookings: 68, signups: 290 },
  ];

  const bookingsByStatus = [
    { name: "Confirmed", value: 68, fill: "#2E3A2F" },
    { name: "Completed", value: 42, fill: "#6B7F5B" },
    { name: "Pending", value: 12, fill: "#D9C9B2" },
    { name: "Cancelled", value: 8, fill: "#C96F4F" },
  ];

  const listingsByType = [
    { type: "Homes & Villas", count: 28, fill: "#2E3A2F" },
    { type: "Sahara Camps", count: 14, fill: "#6B7F5B" },
    { type: "4x4 Overlanders", count: 10, fill: "#C96F4F" },
    { type: "Cultural Guides", count: 6, fill: "#D9C9B2" },
  ];

  const bookingsByWilaya = [
    { wilaya: "Algiers", bookings: 45 },
    { wilaya: "Tipaza", bookings: 38 },
    { wilaya: "Oran", bookings: 34 },
    { wilaya: "Djanet", bookings: 26 },
    { wilaya: "Constantine", bookings: 21 },
    { wilaya: "Taghit", bookings: 18 },
    { wilaya: "Bejaia", bookings: 15 },
    { wilaya: "Ghardaia", bookings: 12 },
  ];

  return {
    monthlyRevenue,
    bookingsByStatus,
    listingsByType,
    bookingsByWilaya,
  };
}

export async function getAdminAuditLogs(): Promise<AuditLogEntry[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return [...auditLogStore];
}

export async function getAdminCoupons(): Promise<Coupon[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return [...couponsStore];
}

export async function createAdminCoupon(data: Omit<Coupon, "id" | "usedCount">): Promise<Coupon> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const newCpn: Coupon = {
    ...data,
    id: `cpn_${Date.now()}`,
    usedCount: 0,
  };
  couponsStore = [newCpn, ...couponsStore];
  logAdminAction("CREATE_COUPON", "coupon", newCpn.id, `Created promo code ${newCpn.code}`);
  return newCpn;
}

export async function toggleCouponStatus(id: string): Promise<Coupon | null> {
  const cpn = couponsStore.find((c) => c.id === id);
  if (cpn) {
    cpn.status = cpn.status === "active" ? "disabled" : "active";
    logAdminAction("TOGGLE_COUPON", "coupon", id, `Toggled coupon status to ${cpn.status}`);
    return { ...cpn };
  }
  return null;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  const before = couponsStore.length;
  couponsStore = couponsStore.filter((c) => c.id !== id);
  if (couponsStore.length < before) {
    logAdminAction("DELETE_COUPON", "coupon", id, `Deleted coupon ${id}`);
    return true;
  }
  return false;
}

export async function getAdminReviews(): Promise<AdminReview[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return [...reviewsStore];
}

export async function updateReviewStatus(
  id: string,
  status: AdminReview["status"]
): Promise<AdminReview | null> {
  const rev = reviewsStore.find((r) => r.id === id);
  if (rev) {
    rev.status = status;
    logAdminAction("MODERATE_REVIEW", "review", id, `Updated review status to ${status}`);
    return { ...rev };
  }
  return null;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return [...categoriesStore];
}

export async function toggleCategoryStatus(id: string): Promise<AdminCategory | null> {
  const cat = categoriesStore.find((c) => c.id === id);
  if (cat) {
    cat.isActive = !cat.isActive;
    logAdminAction("TOGGLE_CATEGORY", "setting", id, `Toggled category active state to ${cat.isActive}`);
    return { ...cat };
  }
  return null;
}

export async function getPlatformSettings() {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const rates = getCommissionRates();
  return {
    ...platformSettings,
    hostCommissionRates: rates,
  };
}

export async function updatePlatformSettings(updates: Partial<typeof platformSettings>) {
  await new Promise((resolve) => setTimeout(resolve, 70));
  if (updates.hostCommissionRates) {
    saveCommissionRates(updates.hostCommissionRates);
  }
  platformSettings = {
    ...platformSettings,
    ...updates,
    hostCommissionRates: getCommissionRates(),
  };
  logAdminAction(
    "UPDATE_SETTINGS",
    "setting",
    "platform_config",
    "Updated platform per-host-type commission rates and platform configuration"
  );
  return { ...platformSettings };
}

export interface DetailedAnalytics {
  hostTypeMetrics: {
    individual: {
      name: string;
      revenue: number;
      bookings: number;
      activeProperties: number;
      avgBookingValue: number;
      commissionRate: number;
      commissionEarned: number;
      growthRate: string;
      superhostRatio: string;
      instantBookRatio: string;
    };
    agency: {
      name: string;
      revenue: number;
      bookings: number;
      activeProperties: number;
      avgBookingValue: number;
      commissionRate: number;
      commissionEarned: number;
      growthRate: string;
      avgGroupSize: number;
      tripsBooked: number;
    };
    hotel: {
      name: string;
      revenue: number;
      bookings: number;
      activeProperties: number;
      avgBookingValue: number;
      commissionRate: number;
      commissionEarned: number;
      growthRate: string;
      roomOccupancyRate: number;
      avgNightlyRate: number;
    };
    hostel: {
      name: string;
      revenue: number;
      bookings: number;
      activeProperties: number;
      avgBookingValue: number;
      commissionRate: number;
      commissionEarned: number;
      growthRate: string;
      bedOccupancyRate: number;
      avgBedRate: number;
    };
  };
  verticalMetrics: {
    home: { name: string; revenue: number; bookings: number; activeListings: number; avgBookingValue: number; growthRate: string };
    vehicle: { name: string; revenue: number; bookings: number; activeListings: number; avgBookingValue: number; growthRate: string };
    experience: { name: string; revenue: number; bookings: number; activeListings: number; avgBookingValue: number; growthRate: string };
    trip: { name: string; revenue: number; bookings: number; activeListings: number; avgBookingValue: number; growthRate: string };
  };
  crossTabMatrix: {
    hostType: "individual" | "agency" | "hotel" | "hostel";
    hostTypeName: string;
    home: { revenue: number; bookings: number } | null;
    vehicle: { revenue: number; bookings: number } | null;
    experience: { revenue: number; bookings: number } | null;
    trip: { revenue: number; bookings: number } | null;
  }[];
  comparativeCharts: {
    revenueByHostType: Array<{ name: string; typeKey: string; revenue: number; bookings: number; commission: number; fill: string }>;
    monthlyHostTypeTrend: Array<{ month: string; individual: number; agency: number; hotel: number; hostel: number }>;
  };
  financialMetrics: {
    totalCommissionEarned: number;
    avgPlatformTakeRate: number;
    totalDepositsHeld: number;
    solvencyBreakdown: { healthy: number; lowDeposit: number; negative: number };
    paymentChannels: Array<{ channel: string; volume: number; share: string }>;
  };
}

export async function getAdminAnalyticsDetailed(period: string = "30d"): Promise<DetailedAnalytics> {
  await new Promise((resolve) => setTimeout(resolve, 90));

  const rates = getCommissionRates();

  return {
    hostTypeMetrics: {
      individual: {
        name: "Individual Hosts",
        revenue: 1840000,
        bookings: 24,
        activeProperties: 14,
        avgBookingValue: 76666,
        commissionRate: rates.individual,
        commissionEarned: Math.round(1840000 * (rates.individual / 100)),
        growthRate: "+16.4%",
        superhostRatio: "64%",
        instantBookRatio: "78%",
      },
      agency: {
        name: "Tourism Agencies",
        revenue: 4060000,
        bookings: 40,
        activeProperties: 8,
        avgBookingValue: 101500,
        commissionRate: rates.agency,
        commissionEarned: Math.round(4060000 * (rates.agency / 100)),
        growthRate: "+32.8%",
        avgGroupSize: 4.8,
        tripsBooked: 14,
      },
      hotel: {
        name: "Hotels & Palaces",
        revenue: 3200000,
        bookings: 36,
        activeProperties: 3,
        avgBookingValue: 88888,
        commissionRate: rates.hotel,
        commissionEarned: Math.round(3200000 * (rates.hotel / 100)),
        growthRate: "+12.0%",
        roomOccupancyRate: 82.4,
        avgNightlyRate: 24500,
      },
      hostel: {
        name: "Youth Hostels",
        revenue: 540000,
        bookings: 42,
        activeProperties: 2,
        avgBookingValue: 12857,
        commissionRate: rates.hostel,
        commissionEarned: Math.round(540000 * (rates.hostel / 100)),
        growthRate: "+24.5%",
        bedOccupancyRate: 76.8,
        avgBedRate: 3200,
      },
    },
    verticalMetrics: {
      home: {
        name: "Homes & Stays",
        revenue: 5280000,
        bookings: 78,
        activeListings: 19,
        avgBookingValue: 67692,
        growthRate: "+14.2%",
      },
      trip: {
        name: "Agency Expeditions",
        revenue: 2150000,
        bookings: 14,
        activeListings: 6,
        avgBookingValue: 153571,
        growthRate: "+45.0%",
      },
      vehicle: {
        name: "4x4 Overlanders",
        revenue: 1240000,
        bookings: 22,
        activeListings: 9,
        avgBookingValue: 56363,
        growthRate: "+18.8%",
      },
      experience: {
        name: "Cultural Guides",
        revenue: 970000,
        bookings: 28,
        activeListings: 8,
        avgBookingValue: 34642,
        growthRate: "+21.4%",
      },
    },
    crossTabMatrix: [
      {
        hostType: "individual",
        hostTypeName: "Individual Hosts",
        home: { revenue: 1420000, bookings: 18 },
        vehicle: { revenue: 280000, bookings: 4 },
        experience: { revenue: 140000, bookings: 2 },
        trip: null, // Trips only ever belong to Agency (structural constraint)
      },
      {
        hostType: "agency",
        hostTypeName: "Tourism Agencies",
        home: { revenue: 300000, bookings: 2 },
        vehicle: { revenue: 960000, bookings: 18 },
        experience: { revenue: 650000, bookings: 8 },
        trip: { revenue: 2150000, bookings: 12 },
      },
      {
        hostType: "hotel",
        hostTypeName: "Hotels & Palaces",
        home: { revenue: 3200000, bookings: 36 },
        vehicle: null, // Hotels only produce room inventory (structural constraint)
        experience: null,
        trip: null,
      },
      {
        hostType: "hostel",
        hostTypeName: "Youth Hostels",
        home: { revenue: 540000, bookings: 42 },
        vehicle: null,
        experience: null,
        trip: null,
      },
    ],
    comparativeCharts: {
      revenueByHostType: [
        { name: "Individual", typeKey: "individual", revenue: 1840000, bookings: 24, commission: 220800, fill: "#6B7F5B" },
        { name: "Agencies", typeKey: "agency", revenue: 4060000, bookings: 40, commission: 609000, fill: "#C96F4F" },
        { name: "Hotels", typeKey: "hotel", revenue: 3200000, bookings: 36, commission: 576000, fill: "#2E3A2F" },
        { name: "Hostels", typeKey: "hostel", revenue: 540000, bookings: 42, commission: 54000, fill: "#D9C9B2" },
      ],
      monthlyHostTypeTrend: [
        { month: "May", individual: 310000, agency: 580000, hotel: 480000, hostel: 80000 },
        { month: "Jun", individual: 420000, agency: 890000, hotel: 720000, hostel: 120000 },
        { month: "Jul", individual: 680000, agency: 1420000, hotel: 1100000, hostel: 190000 },
        { month: "Aug", individual: 820000, agency: 1650000, hotel: 1350000, hostel: 240000 },
        { month: "Sep", individual: 540000, agency: 1150000, hotel: 980000, hostel: 160000 },
        { month: "Oct", individual: 480000, agency: 960000, hotel: 840000, hostel: 140000 },
      ],
    },
    financialMetrics: {
      totalCommissionEarned: 1459800,
      avgPlatformTakeRate: 15.1,
      totalDepositsHeld: 527000,
      solvencyBreakdown: { healthy: 4, lowDeposit: 1, negative: 1 },
      paymentChannels: [
        { channel: "Algérie Poste CCP Transfers", volume: 680000, share: "46.5%" },
        { channel: "BaridiMob Instant Deposits", volume: 490000, share: "33.6%" },
        { channel: "BNA / BEA Bank Wires", volume: 290000, share: "19.9%" },
      ],
    },
  };
}

