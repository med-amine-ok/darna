export type UserRole = "guest" | "host" | "admin";
export type HostType = "individual" | "agency" | "hotel" | "hostel";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  hostType?: HostType | null;
  organizationId?: string | null;
  bookingApprovalMode?: "instant" | "request";
  createdAt: string;
  emailVerified?: string | null;
  favoriteIds: string[];
  bio?: string;
  phone?: string;
  address?: string;
  languages?: string[];
  isIdentityVerified?: boolean;
  yearsHosting?: number;
  responseRate?: number;
  responseTime?: string;
}

/**
 * Public projection of a user, safe to send to any visitor.
 * Never contains email, phone or address.
 */
export interface PublicUser {
  id: string;
  name: string;
  image?: string | null;
  role: UserRole;
  hostType?: HostType | null;
  createdAt: string;
  bio?: string;
  languages?: string[];
  isIdentityVerified?: boolean;
  yearsHosting?: number;
  responseRate?: number;
  responseTime?: string;
}

export type CancellationPolicy = "flexible" | "moderate" | "strict";

export type ListingVertical =
  | "home"
  | "hotel"
  | "experience"
  | "vehicle"
  | "trip";
export type ListingOwnerType = "individual" | "organization";
export type ListingStatus = "active" | "pending" | "suspended" | "draft";

export interface Amenity {
  id: string;
  nameKey: string;
  icon: string;
  category: "essentials" | "features" | "location" | "safety";
}

export interface Category {
  id: string;
  labelKey: string;
  icon: string;
  vertical: ListingVertical;
  descriptionKey?: string;
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  value: number;
  comment: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export type BookingUnit = "room" | "bed";

export interface RoomType {
  id: string;
  propertyListingId: string;
  name: string;
  description?: string;
  price: number; // nightly price per room or per bed
  basePrice?: number;
  bookingUnit: BookingUnit;
  totalInventory: number;
  inventoryCount?: number;
  availableInventory?: number;
  capacity: number; // max guests
  bedsDescription?: string;
  amenities: string[];
  imageSrc: string[];
  isAvailable?: boolean;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: ListingVertical;
  type: string; // Specific property, experience, or vehicle subtype
  ownerType: ListingOwnerType;
  hostUserId?: string | null;
  organizationId?: string | null;
  status: ListingStatus;
  price: number; // Nightly for home, per-day for vehicle, per-person for experience
  originalPrice?: number;
  subtitle?: string;
  imageSrc: string[];
  createdAt: string;
  updatedAt?: string;
  locationValue: string; // City or country code
  city: string;
  /** Commune (municipality), see lib/algeria.ts; the wilaya is derived from it. */
  commune?: string;
  country: string;
  latlng: [number, number];
  featured?: boolean;
  isGuestFavorite?: boolean;
  instantBook?: boolean;

  // Rating & stats
  rating?: number;
  reviewCount?: number;
  bookingsCount?: number;

  // Availability & Overlap Matching
  availableFrom?: string;
  availableTo?: string;
  matchedAvailability?: MatchedAvailability;

  // Hotel & Hostel Property Sub-structure (Section 2)
  businessCategory?: "agency" | "hotel" | "hostel";
  hotelStarRating?: number;
  roomTypes?: RoomType[];
  bookingApprovalMode?: "instant" | "request";

  // Homes-specific fields
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  bedroomCount?: number;
  amenities?: string[];
  houseRules?: string[];
  cancellationPolicy?: CancellationPolicy;

  // Pricing (DZD integers). `cleaningFee: 0` is valid ("no cleaning fee").
  cleaningFee?: number;
  /** Admin-only override of DARNA's guest service fee rate (0–1). */
  serviceFeeRate?: number;
  /** Admin-only override of the tax rate (0–1). */
  taxRate?: number;

  // Stay rules (defaults: STAY_RULE_DEFAULTS in lib/booking/config.ts)
  minNights?: number;
  maxNights?: number;
  advanceNoticeDays?: number;
  checkInTime?: string; // "HH:mm"
  checkOutTime?: string; // "HH:mm"

  /** Search-only: total price incl. fees for the searched dates (server-computed). */
  quotedTotal?: number;

  // Vehicle-specific fields
  make?: string;
  model?: string;
  year?: number;
  transmission?: "automatic" | "manual";
  seats?: number;
  fuelType?: "petrol" | "diesel" | "electric" | "hybrid";
  pickupLocation?: string;
  mileagePolicy?: string;
  insuranceNotes?: string;

  // Experience-specific fields
  activityName?: string;
  durationHours?: number;
  groupSize?: number;
  perPersonPrice?: number;
  includedItems?: string[];
  experienceLanguages?: string[];
}

export type ReservationStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "declined"
  | "expired";

export type PaymentStatus =
  | "paid"
  | "pending"
  | "refunded"
  | "partially_refunded"
  | "voided";

export interface Reservation {
  id: string;
  userId: string;
  listingId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  nightlyPrice?: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxes?: number;
  guestsCount: number;
  status: ReservationStatus;
  createdAt: string;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  /** Accommodation subtotal (price × units), excl. cleaning, service fee and taxes. */
  subtotal?: number;
  /** Rooms or beds booked (hotels / hostels). */
  unitCount?: number;
  cancellationPolicy?: CancellationPolicy;
  refundAmount?: number;
  cancelledAt?: string;
  cancelledBy?: "guest" | "host" | "system";
  /** DARNA commission charged to the host (on the subtotal). */
  commissionAmount?: number;
  commissionRate?: number;
  approvalMode?: "instant" | "request";
  expiresAt?: string;
  guestMessage?: string;
  declineReason?: string;
  respondedAt?: string;
  selectedRoomTypeId?: string;
  tripId?: string;
  listing?: Listing;
  trip?: Trip;
  user?: User;
}

export interface TripItineraryDay {
  day: number;
  title: string;
  description: string;
  activities?: string[];
  meals?: string;
  accommodation?: string;
}

export interface Trip {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverPhoto: string;
  gallery: string[];
  itinerary: TripItineraryDay[];
  durationDays: number;
  maxGroupSize: number;
  minGroupSize?: number;
  pricePerPerson: number; // in DZD
  inclusions: string[];
  exclusions: string[];
  meetingPoint: string;
  city: string;
  /** Commune (municipality), see lib/algeria.ts. */
  commune?: string;
  locationValue: string;
  latlng?: [number, number];
  cancellationPolicy: CancellationPolicy;
  organizationId: string; // Must belong to an Agency
  status: "active" | "draft";
  rating?: number;
  reviewsCount?: number;
  departureDates?: string[];
  createdAt: string;
  /** Public projection of the organizing agency (no contact/legal details). */
  organization?: PublicOrganization;
}

export type OrganizationVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export interface Organization {
  id: string;
  name: string;
  businessCategory: "agency" | "hotel" | "hostel";
  logo?: string | null;
  description?: string;
  businessRegistrationNumber: string;
  businessType?: string;
  businessEmail: string;
  businessPhone: string;
  address?: string;
  country?: string;
  verificationStatus: OrganizationVerificationStatus;
  createdAt: string;
  ownerUserId: string;
  teamSizeEstimate?: "1" | "2-10" | "11-50" | "50+";
  rating?: number;
  reviewCount?: number;

  // Hotel & Hostel operational settings (Section 2 & 3)
  hotelStarRating?: number;
  totalRoomCount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  hotelAmenities?: string[];
  hostelFacilities?: string[];
  curfewPolicy?: string;
  agePolicy?: string;
  bookingApprovalMode?: "instant" | "request";
}

/** Public projection of an organization (no contact or legal details). */
export interface PublicOrganization {
  id: string;
  name: string;
  businessCategory: "agency" | "hotel" | "hostel";
  logo?: string | null;
  description?: string;
  businessType?: string;
  country?: string;
  isVerified: boolean;
  createdAt: string;
  rating?: number;
  reviewCount?: number;
  hotelStarRating?: number;
  totalRoomCount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  hotelAmenities?: string[];
  hostelFacilities?: string[];
  curfewPolicy?: string;
  agePolicy?: string;
  bookingApprovalMode?: "instant" | "request";
}

/** Public projection of a team member (no email). */
export interface PublicMember {
  id: string;
  name: string;
  role: "owner" | "admin" | "manager";
  avatar?: string | null;
  joinedAt?: string | null;
}

export type MembershipRole = "owner" | "admin" | "manager";
export type MembershipStatus = "active" | "invited" | "removed";

export interface Membership {
  id: string;
  organizationId: string;
  userId?: string | null;
  name?: string;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  invitedBy: string;
  createdAt: string;
  joinedAt?: string | null;
  avatar?: string | null;
}

export interface Conversation {
  id: string;
  participants: string[];
  listingId?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: Record<string, number>;
  createdAt: string;
  listing?: Listing;
  otherUser?: {
    id: string;
    name: string;
    image?: string | null;
    role?: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface DateAvailabilityOverride {
  id: string;
  listingId: string;
  date: string; // YYYY-MM-DD
  isBlocked: boolean;
  customPrice?: number;
  note?: string;
}

export interface MatchedAvailability {
  isPartial: boolean;
  searchedStart: string;
  searchedEnd: string;
  overlapStart: string;
  overlapEnd: string;
  listingAvailableFrom: string;
  listingAvailableTo: string;
}

export interface SearchParams {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  startDate?: string;
  endDate?: string;
  guests?: number;
  vertical?: ListingVertical;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  rooms?: number;
  bathrooms?: number;
  amenities?: string[];
  instantBook?: boolean;
}

export interface AdminKPI {
  totalRevenue: number;
  totalBookings: number;
  activeListings: number;
  totalUsers: number;
  guestCount: number;
  hostCount: number;
  averageBookingValue: number;
  occupancyRate: number;
  revenueTrend: number;
  bookingsTrend: number;
  listingsTrend: number;
  usersTrend: number;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType:
    | "listing"
    | "booking"
    | "user"
    | "review"
    | "setting"
    | "organization";
  targetId: string;
  details: string;
  timestamp: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usageCount: number;
  verticalScope?: ListingVertical | "all";
  isActive: boolean;
  createdAt: string;
}

export type NotificationType =
  | "booking"
  | "message"
  | "price"
  | "system"
  | "review";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  timestamp?: string;
}

export type OnboardingFieldType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "multi-select"
  | "image-upload"
  | "toggle";

export interface OnboardingFieldOption {
  value: string;
  label: {
    en: string;
    fr: string;
    ar: string;
  };
}

export interface OnboardingFieldConfig {
  id: string;
  label: {
    en: string;
    fr: string;
    ar: string;
  };
  placeholder?: {
    en?: string;
    fr?: string;
    ar?: string;
  };
  helpText?: {
    en?: string;
    fr?: string;
    ar?: string;
  };
  type: OnboardingFieldType;
  required: boolean;
  options?: OnboardingFieldOption[];
  defaultValue?: any;
  order: number;
  isCore?: boolean;
}

export interface OnboardingStepConfig {
  id: string;
  stepNumber: number;
  title: {
    en: string;
    fr: string;
    ar: string;
  };
  description?: {
    en?: string;
    fr?: string;
    ar?: string;
  };
  isActive: boolean;
  isCore?: boolean;
  fields: OnboardingFieldConfig[];
}

export interface HostTypeOnboardingConfig {
  hostType: HostType;
  steps: OnboardingStepConfig[];
  updatedAt?: string;
}

export type TransactionType =
  | "recharge"
  | "commission_deduction"
  | "payout"
  | "adjustment";

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number; // positive for credits (recharge), negative for debits (commission deduction)
  currency: "DZD";
  relatedBookingId?: string | null;
  adminUserId?: string | null;
  note?: string;
  timestamp: string;
}

export interface Wallet {
  id: string;
  ownerType: "user" | "organization";
  ownerId: string; // userId or organizationId
  ownerName: string;
  hostType: HostType;
  currency: "DZD";
  balance: number; // calculated from sum of transaction amounts
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;
}

export interface HostTypeCommissionRates {
  individual: number; // percentage (e.g. 12.0)
  agency: number; // percentage (e.g. 15.0)
  hotel: number; // percentage (e.g. 18.0)
  hostel: number; // percentage (e.g. 10.0)
}
