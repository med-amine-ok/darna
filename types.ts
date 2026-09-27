export type UserRole = "guest" | "host" | "admin";

export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | string | null;
  image: string | null;
  hashedPassword?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  favoriteIds: string[];
  role?: UserRole;
  phone?: string;
  location?: string;
}

export interface ListingHighlight {
  icon?: string;
  title: string;
  subtitle: string;
}

export interface SleepingArrangement {
  room: string;
  bed: string;
}

export interface HouseRules {
  checkIn: string;
  checkOut: string;
  maxGuests: number;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  quietHours?: string;
}

export interface RatingBreakdown {
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  checkIn: number;
  value: number;
}

export interface HostInfo {
  yearsHosting?: number;
  responseRate?: number;
  responseTime?: string;
  bio?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  images?: string[];
  subtitle?: string;
  createdAt: Date | string;
  category: string;
  roomCount: number;
  bathroomCount: number;
  guestCount: number;
  locationValue: string;
  userId: string;
  price: number;
  originalPrice?: number;
  featured?: boolean;
  city?: string;
  isGuestFavorite?: boolean;
  isSuperhost?: boolean;
  instantBook?: boolean;
  freeCancellation?: boolean;
  cancellationPolicy?: "flexible" | "moderate" | "strict";
  type?: "Homes" | "Experiences" | "Services";
  service?: string;
  coordinates?: [number, number];
  highlights?: ListingHighlight[];
  amenities?: string[];
  sleepingArrangements?: SleepingArrangement[];
  houseRules?: HouseRules;
  ratingBreakdown?: RatingBreakdown;
  neighborhoodDescription?: string;
  hostInfo?: HostInfo;
}

export interface Reservation {
  id: string;
  userId: string;
  listingId: string;
  startDate: Date | string;
  endDate: Date | string;
  totalPrice: number;
  createdAt: Date | string;
  status?: ReservationStatus;
  guestCount?: number;
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
  status?: "published" | "pending" | "flagged";
}

export type SafeUser = Omit<
  User,
  "createdAt" | "updatedAt" | "emailVerified" | "hashedPassword"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  role?: UserRole;
  phone?: string;
  location?: string;
};

export type safeListing = Omit<Listing, "createdAt"> & {
  createdAt: string;
  user?: SafeUser;
  rating?: number;
  reviewCount?: number;
};

export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate"
> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  listing: safeListing;
  user?: SafeUser;
  status?: ReservationStatus;
};

export type SafeReview = Omit<Review, "createdAt"> & {
  createdAt: string;
  user?: SafeUser;
  listing?: safeListing;
};

export interface AdminStats {
  totalRevenue: number;
  totalBookings: number;
  totalListings: number;
  totalUsers: number;
  revenueChangeMonth: number;
  bookingsChangeMonth: number;
  listingsChangeMonth: number;
  usersChangeMonth: number;
}

export type ConversationCategory = "all" | "guests" | "hosting" | "support";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: SafeUser[];
  listingId?: string;
  listing?: safeListing;
  reservationDetails?: {
    startDate: string;
    endDate: string;
    status: string;
    guestCount?: number;
  };
  category: ConversationCategory;
  lastMessage?: ChatMessage;
  lastMessageAt: string;
  unreadCount: number;
  isArchived?: boolean;
}

export interface MessageSettings {
  soundEnabled: boolean;
  readReceipts: boolean;
  emailNotifications: boolean;
}
