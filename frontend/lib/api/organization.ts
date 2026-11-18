import "server-only";
import type { Membership, MembershipRole, Organization, OrganizationInvitation, OrganizationVerificationStatus } from "@/types";
import type { ApiWorkspace } from "./me";

/** GET /host/organization (backend hosts OrganizationSerializer). */
export interface ApiOrganization {
  id: string;
  host_account_id: string;
  slug: string;
  business_category: "agency" | "hotel" | "hostel";
  verification_status: string;
  display_name: string;
  legal_name: string;
  description: string;
  source_language: string;
  business_email: string;
  business_phone_e164: string;
  commune: number | string | null;
  address_line: string;
  rc_number: string;
  nif: string;
  nis: string;
  tourism_licence_number: string;
  star_rating: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  policies: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  logo_url?: string | null;
}

/** Backend host verification status -> the three states the frontend shows. */
export function toVerificationStatus(status: string): OrganizationVerificationStatus {
  if (status === "approved") return "verified";
  if (status === "rejected" || status === "suspended") return "rejected";
  return "pending";
}

const hhmm = (value: string | null | undefined) => (value ? value.slice(0, 5) : undefined);

/** Map the backend organisation onto the frontend Organization type. */
export function toOrganization(org: ApiOrganization, ownerUserId = ""): Organization {
  const policies = (org.policies ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof policies[key] === "string" ? (policies[key] as string) : undefined);
  const list = (key: string) => (Array.isArray(policies[key]) ? (policies[key] as string[]) : undefined);
  return {
    id: org.id,
    name: org.display_name,
    businessCategory: org.business_category,
    logo: org.logo_url ?? null,
    description: org.description || undefined,
    businessRegistrationNumber: org.rc_number,
    businessType: org.legal_name || undefined,
    businessEmail: org.business_email,
    businessPhone: org.business_phone_e164,
    address: org.address_line || undefined,
    country: "DZ",
    verificationStatus: toVerificationStatus(org.verification_status),
    createdAt: org.created_at,
    ownerUserId,
    slug: org.slug,
    hostAccountId: org.host_account_id,
    hotelStarRating: org.star_rating ?? undefined,
    checkInTime: hhmm(org.check_in_time),
    checkOutTime: hhmm(org.check_out_time),
    hotelAmenities: list("hotel_amenities"),
    hostelFacilities: list("hostel_facilities"),
    curfewPolicy: text("curfew"),
    agePolicy: text("age_policy") ?? text("age"),
    totalRoomCount: typeof policies.total_room_count === "number" ? (policies.total_room_count as number) : undefined,
    teamSizeEstimate: teamSizeOf(policies.team_size_estimate),
  };
}

function teamSizeOf(value: unknown): Organization["teamSizeEstimate"] {
  return value === "1" || value === "2-10" || value === "11-50" || value === "50+" ? value : undefined;
}

/** GET /organizations/{slug} and GET /organizations (backend hosts PublicOrganizationSerializer). */
export interface ApiPublicOrganization {
  id: string;
  host_account_id: string;
  slug: string;
  display_name: string;
  business_category: "agency" | "hotel" | "hostel";
  description: string;
  source_language: string;
  commune: { id: number; name: string; wilaya_code: number; wilaya_name: string } | null;
  star_rating: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  policies: Record<string, unknown> | null;
  verified: boolean;
  rating_avg: number | null;
  review_count: number;
  member_since: number;
  logo_url?: string | null;
}

/**
 * Map the public organisation profile onto the frontend Organization type.
 * Contact and legal fields are not public: they stay empty (toPublicOrganization drops them anyway).
 */
export function toOrganizationFromPublic(org: ApiPublicOrganization): Organization {
  const policies = (org.policies ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof policies[key] === "string" ? (policies[key] as string) : undefined);
  const list = (key: string) => (Array.isArray(policies[key]) ? (policies[key] as string[]) : undefined);
  const place = org.commune ? [org.commune.name, org.commune.wilaya_name].filter(Boolean).join(", ") : undefined;
  return {
    id: org.id,
    slug: org.slug,
    hostAccountId: org.host_account_id,
    name: org.display_name,
    businessCategory: org.business_category,
    logo: org.logo_url ?? null,
    description: org.description || undefined,
    businessRegistrationNumber: "",
    businessEmail: "",
    businessPhone: "",
    address: place,
    country: "DZ",
    verificationStatus: org.verified ? "verified" : "pending",
    createdAt: `${org.member_since}-01-01T00:00:00Z`,
    ownerUserId: "",
    rating: org.rating_avg ?? undefined,
    reviewCount: org.review_count,
    hotelStarRating: org.star_rating ?? undefined,
    checkInTime: hhmm(org.check_in_time),
    checkOutTime: hhmm(org.check_out_time),
    hotelAmenities: list("hotel_amenities"),
    hostelFacilities: list("hostel_facilities"),
    curfewPolicy: text("curfew"),
    agePolicy: text("age_policy") ?? text("age"),
    totalRoomCount: typeof policies.total_room_count === "number" ? (policies.total_room_count as number) : undefined,
  };
}

/** Backend team role -> the three tiers the website shows (agent and guide are staff roles). */
export function toMembershipRole(role: string | null | undefined): MembershipRole {
  return role === "owner" || role === "admin" ? role : "manager";
}

/** GET /host/organization/members (backend hosts MemberSerializer). */
export interface ApiMember {
  id: string;
  user: { id: string; display_name: string };
  role: string;
  permissions: string[];
  joined_at: string | null;
}

/** Map a team member. The API never shares team emails, so email stays empty. */
export function toMembership(member: ApiMember, organizationId: string): Membership {
  return {
    id: member.id,
    organizationId,
    userId: member.user?.id ?? null,
    name: member.user?.display_name || undefined,
    email: "",
    role: toMembershipRole(member.role),
    status: "active",
    invitedBy: "",
    createdAt: member.joined_at ?? "",
    joinedAt: member.joined_at,
  };
}

/** GET /host/organization/invitations (backend hosts InvitationSerializer). */
export interface ApiInvitation {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  status: OrganizationInvitation["status"];
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  token?: string;
}

export function toInvitation(row: ApiInvitation): OrganizationInvitation {
  return {
    id: row.id,
    email: row.email ?? "",
    phone: row.phone || null,
    role: toMembershipRole(row.role),
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
  };
}

/** The caller's own membership, built from its workspace entry (role, organisation). */
export function membershipFromWorkspace(ws: ApiWorkspace, user: { id: string; name: string; email: string }): Membership {
  return {
    id: `${ws.host_account_id}:${user.id}`,
    organizationId: ws.organization_id ?? "",
    userId: user.id,
    name: user.name,
    email: user.email,
    role: toMembershipRole(ws.role ?? "owner"),
    status: "active",
    invitedBy: "",
    createdAt: "",
    joinedAt: null,
  };
}

/**
 * A phone typed by a person -> E.164 as the backend wants it (+213...).
 * "0555 12 34 56" -> "+213555123456", "00213..." -> "+213...". Null when it
 * cannot be a phone number (the caller answers INVALID_PHONE).
 */
export function toE164Phone(raw: string): string | null {
  const compact = raw.replace(/[\s().-]/g, "");
  if (!compact) return null;
  let phone = compact;
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith("0")) phone = `+213${phone.slice(1)}`;
  else if (!phone.startsWith("+")) phone = `+${phone}`;
  return /^\+[1-9][0-9]{6,14}$/.test(phone) ? phone : null;
}
