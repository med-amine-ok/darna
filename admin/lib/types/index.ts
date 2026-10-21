export type UserRole = "guest" | "host" | "admin";
export type HostType = "individual" | "agency" | "hotel" | "hostel";

export type AdminRole = "super_admin" | "moderator" | "support" | "finance" | "analyst";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  permissions?: Permission[];
}

export type Permission =
  | "hosts.view"
  | "hosts.approve"
  | "hosts.reject"
  | "hosts.suspend"
  | "hosts.delete"
  | "hosts.commission_override"
  | "listings.view"
  | "listings.approve"
  | "listings.reject"
  | "listings.suspend"
  | "listings.delete"
  | "listings.feature"
  | "users.view"
  | "users.suspend"
  | "users.ban"
  | "users.delete"
  | "bookings.view"
  | "bookings.cancel"
  | "bookings.refund"
  | "bookings.dispute"
  | "reviews.view"
  | "reviews.moderate"
  | "reviews.delete"
  | "wallets.view"
  | "wallets.recharge"
  | "commissions.manage"
  | "payouts.approve"
  | "onboarding.edit"
  | "categories.manage"
  | "promotions.manage"
  | "reports.export"
  | "audit.view"
  | "team.manage"
  | "settings.manage";

export type HostStatus =
  | "applied"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "banned"
  | "deleted";

export type VerificationStatus = "verified" | "pending" | "missing" | "expired";

export interface HostDocument {
  id: string;
  type: "id_card" | "commercial_register" | "tax_card" | "tourism_licence" | "property_deed";
  title: string;
  fileUrl: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export interface OrganizationMember {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "manager" | "guide" | "agent";
  phone?: string;
  avatar?: string;
}

export interface Organization {
  id: string;
  name: string;
  hostType: HostType;
  ownerUserId: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  address?: string;
  wilayaCode: string;
  phone?: string;
  email?: string;
  tradeRegisterNumber?: string;
  taxNumber?: string;
  tourismLicenseNumber?: string;
  verificationStatus: boolean;
  members: OrganizationMember[];
  createdAt: string;
}

export interface Host {
  id: string;
  ownerName: string;
  businessName?: string;
  email: string;
  phone: string;
  hostType: HostType;
  status: HostStatus;
  verificationStatus: VerificationStatus;
  wilayaCode: string;
  city: string;
  address?: string;
  rating: number;
  reviewsCount: number;
  listingsCount: number;
  bookingsCount: number;
  walletBalance: number;
  commissionRate: number; // percentage e.g. 12.0
  isCommissionOverridden?: boolean;
  joinedAt: string;
  lastActiveAt: string;
  bookingApprovalMode: "instant" | "request";
  verticalsOffered: ListingVertical[];
  organizationId?: string;
  organization?: Organization;
  documents: HostDocument[];
  adminNotes: string[];
  // Type-specific metadata
  agencyMetadata?: {
    teamSize: number;
    hasTrips: boolean;
    licenseNumber: string;
  };
  hotelMetadata?: {
    starRating: number;
    roomCount: number;
    amenities: string[];
  };
  hostelMetadata?: {
    bedCount: number;
    dormTypes: string[];
  };
}

export type ListingVertical = "home" | "hotel" | "experience" | "vehicle" | "trip";
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "suspended"
  | "archived"
  | "deleted";

export type BookingUnit = "room" | "bed" | "property" | "person" | "day";

export interface RoomType {
  id: string;
  propertyListingId: string;
  name: string;
  description?: string;
  price: number;
  bookingUnit: "room" | "bed";
  totalInventory: number;
  availableInventory?: number;
  capacity: number;
  bedsDescription?: string;
  amenities: string[];
  imageSrc: string[];
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: ListingVertical;
  propertyType: string; // e.g. "Coastal Villa", "Casbah Riad", "4x4 Desert Tour", etc.
  hostId: string;
  hostName: string;
  hostType: HostType;
  status: ListingStatus;
  price: number; // in DZD
  originalPrice?: number;
  imageSrc: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
  wilayaCode: string;
  city: string;
  address?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  guestCapacity: number;
  bedroomCount?: number;
  bathroomCount?: number;
  rating: number;
  reviewsCount: number;
  bookingsCount: number;
  amenities: string[];
  bookingApprovalMode: "instant" | "request";
  isFeatured: boolean;
  isReported: boolean;
  adminNotes: string[];
  moderationChecklist?: {
    photosOk: boolean;
    locationAccurate: boolean;
    priceReasonable: boolean;
    policiesPresent: boolean;
    descriptionAppropriate: boolean;
  };
  rooms?: RoomType[]; // For hotels/hostels
}

export type GuestStatus = "active" | "suspended" | "banned" | "deleted";

export interface GuestUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: GuestStatus;
  role: "guest" | "host" | "both";
  emailVerified: boolean;
  idVerified: boolean;
  wilayaCode?: string;
  preferredLanguage: "en" | "fr" | "ar";
  bookingsCount: number;
  totalSpentDzd: number;
  walletBalanceDzd: number;
  reviewsWrittenCount: number;
  favoritesCount: number;
  joinedAt: string;
  lastActiveAt: string;
  isFlagged: boolean;
  adminNotes: string[];
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "disputed"
  | "refunded";

export interface Booking {
  id: string;
  reference: string; // e.g. "DAR-2026-8941"
  listingId: string;
  listingTitle: string;
  listingImage: string;
  vertical: ListingVertical;
  hostId: string;
  hostName: string;
  hostType: HostType;
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  wilayaCode: string;
  status: BookingStatus;
  approvalMode: "instant" | "request";
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  guestsCount: number;
  // Financial breakdown
  basePriceDzd: number;
  serviceFeeDzd: number;
  totalAmountDzd: number;
  commissionRate: number;
  commissionAmountDzd: number;
  hostPayoutDzd: number;
  paymentStatus: "paid" | "refunded" | "pending" | "failed";
  paymentMethod: "cib_edahabia" | "ccp_transfer" | "baridimob" | "cash_on_arrival";
  createdAt: string;
  cancelledAt?: string;
  disputeReason?: string;
  adminNotes: string[];
}

export type ReviewStatus = "published" | "flagged" | "hidden" | "deleted";

export interface ReviewItem {
  id: string;
  listingId: string;
  listingTitle: string;
  vertical: ListingVertical;
  guestId: string;
  guestName: string;
  guestAvatar?: string;
  hostId: string;
  hostName: string;
  hostType: HostType;
  wilayaCode: string;
  rating: number; // 1-5
  comment: string;
  status: ReviewStatus;
  flagReason?: string;
  flaggedBy?: string;
  createdAt: string;
  hostReply?: {
    comment: string;
    createdAt: string;
  };
  adminNotes: string[];
}

export type TransactionType =
  | "booking_payment"
  | "commission_deduction"
  | "host_payout"
  | "wallet_recharge"
  | "booking_refund"
  | "adjustment";

export interface WalletTransaction {
  id: string;
  walletId: string;
  hostId: string;
  hostName: string;
  hostType: HostType;
  type: TransactionType;
  amount: number; // positive = credit, negative = debit
  balanceAfter: number;
  reference: string;
  description: string;
  bookingRef?: string;
  receiptReference?: string;
  adminActor?: string;
  createdAt: string;
}

export interface HostWallet {
  id: string;
  hostId: string;
  ownerName: string;
  businessName?: string;
  hostType: HostType;
  wilayaCode: string;
  balance: number; // strictly derived from transactions sum
  totalEarned: number;
  totalCommissionsPaid: number;
  totalPayouts: number;
  lastTransactionAt: string;
  isNegative: boolean;
  commissionRate?: number;
}

export interface PayoutRequest {
  id: string;
  hostId: string;
  hostName: string;
  hostType: HostType;
  amountDzd: number;
  payoutMethod: "ccp" | "bank_wire" | "baridimob";
  accountDetails: {
    ccpRip?: string;
    rib?: string;
    phone?: string;
  };
  status: "pending" | "approved" | "processed" | "rejected";
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  action: string;
  entityType: "host" | "listing" | "user" | "booking" | "review" | "wallet" | "payout" | "setting" | "onboarding" | "promotion";
  entityId: string;
  entityName?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  details: string;
  ipAddress: string;
}

export interface ModerationCase {
  id: string;
  type: "host" | "listing" | "document" | "review" | "dispute";
  entityId: string;
  title: string;
  subtitle: string;
  submittedAt: string;
  waitingDays: number;
  priority: "high" | "normal" | "low";
  hostType?: HostType;
  vertical?: ListingVertical;
  wilayaCode?: string;
  status: string;
  details: any;
}

// Onboarding Configurator Contract
export type OnboardingFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "radio"
  | "file"
  | "location"
  | "amenities"
  | "boolean";

export interface OnboardingFieldConfig {
  id?: string;
  key?: string;
  label: { en: string; fr: string; ar: string };
  type: OnboardingFieldType;
  required?: boolean;
  order?: number;
  placeholder?: { en?: string; fr?: string; ar?: string };
  helpText?: { en?: string; fr?: string; ar?: string };
  options?: { value: string; label: { en: string; fr: string; ar: string } }[];
  isCore?: boolean;
}

export interface OnboardingStepConfig {
  id: string;
  stepNumber?: number;
  order?: number;
  isCore?: boolean;
  isActive?: boolean;
  isRequired?: boolean;
  title?: { en: string; fr: string; ar: string };
  name?: { en: string; fr: string; ar: string };
  description: { en: string; fr: string; ar: string };
  fields: OnboardingFieldConfig[];
}

export interface OnboardingConfig {
  version: number;
  updatedAt: string;
  publishedBy: string;
  flows: Record<HostType, {
    maxPagesAllowed?: number; // e.g. 2 for individual
    steps: OnboardingStepConfig[];
  }>;
}

export interface CategoryItem {
  id: string;
  name: { en: string; fr: string; ar: string };
  vertical: ListingVertical;
  iconName?: string;
  icon?: string;
  listingCount: number;
  isActive: boolean;
  order: number;
}

export interface PromotionCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed_dzd" | "fixed";
  discountValue: number;
  minSpendDzd: number;
  maxUsage?: number;
  maxUses?: number;
  usedCount: number;
  startDate?: string;
  endDate?: string;
  expiresAt?: string;
  status: "active" | "expired" | "disabled";
  scope?: "all" | ListingVertical;
  targetWilayas?: string[];
  targetHostTypes?: HostType[];
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultLocale: "en" | "fr" | "ar";
  enabledLocales: ("en" | "fr" | "ar")[];
  primaryCurrency: "DZD";
  supportedCurrencies: string[];
  guestServiceFeePercent: number;
  serviceFeePercent?: number;
  defaultCommissionRates: Record<HostType, number>;
  instantBookingPlatformWide: boolean;
  maintenanceMode: boolean;
  sessionTimeoutMinutes: number;
  twoFactorAuthEnabled: boolean;
  security?: {
    sessionTimeoutMinutes?: number;
    twoFactorRequired?: boolean;
  };
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: Record<string, Record<string, number>>;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, any>;
}
