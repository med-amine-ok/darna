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

let platformSettings = {
  hostCommissionPercent: 3.0,
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
  return { ...platformSettings };
}

export async function updatePlatformSettings(updates: Partial<typeof platformSettings>) {
  await new Promise((resolve) => setTimeout(resolve, 70));
  platformSettings = {
    ...platformSettings,
    ...updates,
  };
  logAdminAction("UPDATE_SETTINGS", "setting", "platform_config", "Updated platform commission and locale configuration");
  return { ...platformSettings };
}
