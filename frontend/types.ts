export type UserRole = "guest" | "host" | "admin";
export type HostType = "individual" | "agency";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  hostType?: HostType | null;
  organizationId?: string | null;
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

export type ListingVertical = "home" | "experience" | "vehicle";
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
  country: string;
  latlng: [number, number];
  featured?: boolean;
  isGuestFavorite?: boolean;
  instantBook?: boolean;

  // Rating & stats
  rating?: number;
  reviewCount?: number;
  bookingsCount?: number;

  // Homes-specific fields
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  bedroomCount?: number;
  amenities?: string[];
  houseRules?: string[];
  cancellationPolicy?: "flexible" | "moderate" | "strict";

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

export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed";

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
  paymentStatus?: "paid" | "pending" | "refunded";
  listing?: Listing;
  user?: User;
}

export type OrganizationVerificationStatus = "pending" | "verified" | "rejected";

export interface Organization {
  id: string;
  name: string;
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

export interface SearchParams {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
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
  targetType: "listing" | "booking" | "user" | "review" | "setting" | "organization";
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

export type NotificationType = "booking" | "message" | "price" | "system" | "review";

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

