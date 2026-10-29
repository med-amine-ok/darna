export type UserRole = "guest" | "host" | "admin";
export type HostType = "individual" | "agency" | "hotel" | "hostel";

export type ProviderCategory =
  | "host"
  | "hotel_hostel"
  | "travel_agency"
  | "experience_company"
  | "rental_agency";

export interface Document {
  id: string;
  type: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileUrl: string;
  mimeType?: string;
  status: "valid" | "to_check" | "missing" | "rejected";
  reviewer?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface ModerationChecklistItem {
  id: string;
  title: string;
  subtitle: string;
  status: "valid" | "to_check" | "missing" | "rejected" | "conforme" | "verifiee" | "complete";
  proofType?: string;
  proofUrl?: string;
  isPassed: boolean;
  notes?: string;
}

export interface ModerationChecklist {
  id: string;
  entityId: string;
  entityType: "stay" | "experience" | "trip" | "car" | "provider";
  items: ModerationChecklistItem[];
  internalNotes?: string;
  decision?: "approve_publish" | "request_changes" | "reject";
  decisionReason?: string;
  decisionAt?: string;
  decidedBy?: string;
}

export interface ChangeRequest {
  id: string;
  entityType: "stay" | "experience" | "trip" | "car" | "provider";
  entityId: string;
  entityTitle: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  reason?: string;
  adminResponse?: string;
}

export interface WizardDraft {
  id: string;
  entityType: "stay" | "experience" | "trip" | "car";
  step: number;
  data: Record<string, any>;
  updatedAt: string;
}

export interface PointOfInterest {
  id?: string;
  name: string;
  distance: string;
  travelTime?: string;
}

export interface PickupPoint {
  id?: string;
  name: string;
  location?: string;
}

export interface ProgrammeItem {
  id?: string;
  day?: number;
  time?: string;
  title: string;
  description: string;
  order: number;
}

export interface PricingTier {
  id?: string;
  label: string; // e.g. "1 - 3 jours"
  daysRange: string;
  priceDzd: number;
}

export interface Insurance {
  id: string;
  title: string;
  provider: string;
  coverage: string;
  dailyPriceDzd: number;
  included: boolean;
}

export interface HouseRules {
  checkInTime: string;
  checkOutTime: string;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  smokingAllowed: boolean;
  childrenAllowed: boolean;
}

export interface Amenity {
  id: string;
  name: { en: string; fr: string; ar: string };
  icon: string;
  category: string;
  order?: number;
  isFeatured?: boolean;
}

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
  /** "invited" accounts have no password until the invitation is accepted. */
  status?: "active" | "invited" | "deactivated";
  invitedAt?: string;
  invitedBy?: string;
}

/**
 * The authenticated admin performing an operation. Always derived on the
 * server from the verified session + current admin store record, never
 * supplied by the client.
 */
export interface AdminActor {
  id: string;
  name: string;
  role: AdminRole;
  /** Client IP of the request, for the audit trail. */
  ip?: string;
}

/** Who an audit entry is attributed to (an admin, or an anonymous sign-in attempt). */
export interface AuditActor {
  id: string;
  name: string;
  role: AdminRole | "anonymous";
  ip?: string;
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
  /** Status the host had before a soft delete; `restore` returns to it. */
  statusBeforeDelete?: HostStatus;
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
  providerCategory?: ProviderCategory;
  formattedId?: string;
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
  | "deleted"
  | "pending"
  | "published"
  | "refused";

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
  formattedId?: string;
  title: string;
  description: string;
  category: ListingVertical;
  vertical?: ListingVertical;
  propertyType: string; // e.g. "Coastal Villa", "Casbah Riad", "4x4 Desert Tour", etc.
  hostId: string;
  hostName: string;
  hostType: HostType;
  status: ListingStatus;
  /** Status the listing had before a soft delete; `restore` returns to it. */
  statusBeforeDelete?: ListingStatus;
  price: number; // in DZD
  priceDzd?: number;
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
  surfaceM2?: number;
  constructionYear?: number;
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
  houseRules?: HouseRules;
  pointsOfInterest?: PointOfInterest[];
  pickupPoints?: PickupPoint[];
  programme?: ProgrammeItem[];
  pricingTiers?: PricingTier[];
  specs?: Record<string, any>;
}

export type GuestStatus = "active" | "pending" | "suspended" | "banned" | "deleted";

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
  paymentStatus: BookingPaymentStatus;
  /** Cumulative amount refunded to the guest (integer DZD). */
  refundedAmountDzd?: number;
  /** Timestamp of the most recent refund. */
  refundedAt?: string;
  paymentMethod: "cib_edahabia" | "ccp_transfer" | "baridimob" | "cash_on_arrival";
  createdAt: string;
  cancelledAt?: string;
  disputeReason?: string;
  disputeResolution?: {
    outcome: DisputeOutcome;
    refundAmountDzd: number;
    note: string;
    resolvedAt: string;
    resolvedBy: string;
  };
  adminNotes: string[];
}

export type BookingPaymentStatus = "paid" | "partially_refunded" | "refunded" | "pending" | "failed";

export type DisputeOutcome = "refund_full" | "refund_partial" | "declined";

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
  amountDzd?: number;
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
  hostName?: string;
  hostType: HostType;
  wilayaCode: string;
  balance: number; // strictly derived from transactions sum
  balanceDzd?: number;
  totalEarned: number;
  totalCommissionsPaid: number;
  totalCommissionsPaidDzd?: number;
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
  status: PayoutStatus;
  requestedAt: string;
  processedAt?: string;
  /** Name of the admin who approved / rejected the request. */
  processedBy?: string;
  rejectionReason?: string;
  /** Ledger entry (host_payout) created on approval. */
  transactionId?: string;
  adminNotes?: string;
}

export type PayoutStatus = "pending" | "approved" | "processed" | "rejected";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  /** "anonymous" is used for failed sign-in attempts on unknown accounts. */
  actorRole: AdminRole | "anonymous";
  action: string;
  entityType: "host" | "listing" | "user" | "booking" | "review" | "wallet" | "payout" | "setting" | "onboarding" | "promotion" | "auth" | "export" | "team";
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
  slug?: string;
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
  currentUses?: number;
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

export interface NetworkSearchParams {
  vertical?: ListingVertical;
  destination?: string;
  wilayaCode?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  hostType?: HostType | "all";
  propertyType?: string;
}

export interface CommandPaletteResult {
  id: string;
  type: "host" | "listing" | "user" | "booking" | "review" | "action";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}
