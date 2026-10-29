import "server-only";
import type {
  Membership,
  Organization,
  PublicMember,
  PublicOrganization,
  PublicUser,
  User,
} from "@/types";

/** Strips every private field (email, phone, address, favorites, org links). */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    image: user.image,
    role: user.role,
    hostType: user.hostType ?? null,
    createdAt: user.createdAt,
    bio: user.bio,
    languages: user.languages,
    isIdentityVerified: user.isIdentityVerified,
    yearsHosting: user.yearsHosting,
    responseRate: user.responseRate,
    responseTime: user.responseTime,
  };
}

export function toPublicOrganization(org: Organization): PublicOrganization {
  return {
    id: org.id,
    name: org.name,
    businessCategory: org.businessCategory,
    logo: org.logo,
    description: org.description,
    businessType: org.businessType,
    country: org.country,
    isVerified: org.verificationStatus === "verified",
    createdAt: org.createdAt,
    rating: org.rating,
    reviewCount: org.reviewCount,
    hotelStarRating: org.hotelStarRating,
    totalRoomCount: org.totalRoomCount,
    checkInTime: org.checkInTime,
    checkOutTime: org.checkOutTime,
    hotelAmenities: org.hotelAmenities,
    hostelFacilities: org.hostelFacilities,
    curfewPolicy: org.curfewPolicy,
    agePolicy: org.agePolicy,
    bookingApprovalMode: org.bookingApprovalMode,
  };
}

/** Only active members are public, and never with their email. */
export function toPublicMembers(members: Membership[]): PublicMember[] {
  return members
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.id,
      name: m.name || "Team member",
      role: m.role,
      avatar: m.avatar,
      joinedAt: m.joinedAt,
    }));
}
