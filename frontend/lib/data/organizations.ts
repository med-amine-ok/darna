// TODO: replace with Supabase query
import "server-only";
import { Organization, Membership, MembershipRole } from "@/types";
import { newId } from "@/lib/ids";
import { clone, delay, removeWhere } from "./_store";
import {
  organizationsTable as organizationsStore,
  membershipsTable as membershipsStore,
  listingsTable,
  tripsTable,
} from "./_tables";

/** Fields whose change requires a new verification by DARNA staff. */
export const ORGANIZATION_LEGAL_FIELDS = [
  "name",
  "businessRegistrationNumber",
  "businessType",
  "businessCategory",
  "address",
  "country",
] as const;

/** Fields an org admin/owner may edit through settings. */
export const ORGANIZATION_EDITABLE_FIELDS = [
  ...ORGANIZATION_LEGAL_FIELDS,
  "logo",
  "description",
  "businessEmail",
  "businessPhone",
  "teamSizeEstimate",
  "hotelStarRating",
  "totalRoomCount",
  "checkInTime",
  "checkOutTime",
  "hotelAmenities",
  "hostelFacilities",
  "curfewPolicy",
  "agePolicy",
  "bookingApprovalMode",
] as const;

export type OrganizationEditableField = (typeof ORGANIZATION_EDITABLE_FIELDS)[number];

export async function getOrganizationById(id: string): Promise<Organization | null> {
  await delay(30);
  const org = organizationsStore.find((o) => o.id === id);
  return org ? clone(org) : null;
}

export async function getOrganizations(): Promise<Organization[]> {
  await delay(30);
  return clone(organizationsStore);
}

export async function getOrganizationMembers(organizationId: string): Promise<Membership[]> {
  await delay(30);
  return clone(membershipsStore.filter((m) => m.organizationId === organizationId));
}

/** Active memberships of a user (the only way a user is linked to an org). */
export async function getMembershipsForUser(userId: string): Promise<Membership[]> {
  return clone(membershipsStore.filter((m) => m.userId === userId && m.status === "active"));
}

export async function getMembership(organizationId: string, userId: string): Promise<Membership | null> {
  const m = membershipsStore.find(
    (x) => x.organizationId === organizationId && x.userId === userId && x.status === "active"
  );
  return m ? clone(m) : null;
}

export async function getMemberById(memberId: string): Promise<Membership | null> {
  const m = membershipsStore.find((x) => x.id === memberId);
  return m ? clone(m) : null;
}

export async function createOrganization(data: {
  name: string;
  businessCategory: "agency" | "hotel" | "hostel";
  logo?: string;
  description?: string;
  businessRegistrationNumber: string;
  businessType?: string;
  businessEmail: string;
  businessPhone: string;
  address?: string;
  country?: string;
  owner: { userId: string; name: string; email: string };
  teamSizeEstimate?: "1" | "2-10" | "11-50" | "50+";
  hotelStarRating?: number;
  totalRoomCount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  hotelAmenities?: string[];
  hostelFacilities?: string[];
  curfewPolicy?: string;
  agePolicy?: string;
  bookingApprovalMode?: "instant" | "request";
  invitedMembers?: { email: string; role: "admin" | "manager" }[];
}): Promise<Organization> {
  await delay(60);

  const now = new Date().toISOString();
  const category = data.businessCategory;
  const newOrg: Organization = {
    id: newId("org"),
    name: data.name,
    businessCategory: category,
    logo: data.logo || "/assets/logo-vertical.png",
    description: data.description || "",
    businessRegistrationNumber: data.businessRegistrationNumber,
    businessType:
      data.businessType ||
      (category === "hotel"
        ? "Commercial Luxury Hotel"
        : category === "hostel"
        ? "Youth & Backpacker Hostel"
        : "Licensed Tourism Agency"),
    businessEmail: data.businessEmail,
    businessPhone: data.businessPhone,
    address: data.address || "",
    country: data.country || "Algeria",
    // New organizations always start unverified; DARNA staff verify them from the admin app.
    verificationStatus: "pending",
    createdAt: now,
    ownerUserId: data.owner.userId,
    teamSizeEstimate: data.teamSizeEstimate || "2-10",
    hotelStarRating: data.hotelStarRating,
    totalRoomCount: data.totalRoomCount,
    checkInTime: data.checkInTime || (category === "hotel" ? "14:00" : "13:00"),
    checkOutTime: data.checkOutTime || (category === "hotel" ? "12:00" : "11:00"),
    hotelAmenities: data.hotelAmenities || [],
    hostelFacilities: data.hostelFacilities || [],
    curfewPolicy: data.curfewPolicy,
    agePolicy: data.agePolicy,
    bookingApprovalMode: data.bookingApprovalMode || "instant",
    rating: 0,
    reviewCount: 0,
  };
  organizationsStore.unshift(newOrg);

  membershipsStore.unshift({
    id: newId("mem"),
    organizationId: newOrg.id,
    userId: data.owner.userId,
    name: data.owner.name,
    email: data.owner.email,
    role: "owner",
    status: "active",
    invitedBy: "system",
    createdAt: now,
    joinedAt: now,
  });

  for (const member of data.invitedMembers || []) {
    membershipsStore.push({
      id: newId("mem"),
      organizationId: newOrg.id,
      userId: null,
      name: member.email.split("@")[0],
      email: member.email,
      role: member.role,
      status: "invited",
      invitedBy: data.owner.userId,
      createdAt: now,
      joinedAt: null,
    });
  }

  return clone(newOrg);
}

export async function updateOrganizationVerification(
  id: string,
  status: "pending" | "verified" | "rejected"
): Promise<Organization | null> {
  await delay(30);
  const org = organizationsStore.find((o) => o.id === id);
  if (!org) return null;
  org.verificationStatus = status;
  return clone(org);
}

export async function addOrganizationMember(data: {
  organizationId: string;
  name: string;
  email: string;
  role: "admin" | "manager";
  invitedBy: string;
}): Promise<Membership> {
  await delay(40);
  const newMember: Membership = {
    id: newId("mem"),
    organizationId: data.organizationId,
    userId: null,
    name: data.name || data.email.split("@")[0],
    email: data.email,
    role: data.role,
    status: "invited",
    invitedBy: data.invitedBy,
    createdAt: new Date().toISOString(),
    joinedAt: null,
  };
  membershipsStore.unshift(newMember);
  return clone(newMember);
}

export async function updateOrganizationMemberRole(
  memberId: string,
  role: MembershipRole
): Promise<Membership | null> {
  await delay(30);
  const member = membershipsStore.find((m) => m.id === memberId);
  if (!member) return null;
  member.role = role;
  return clone(member);
}

/** Makes `newOwnerMemberId` the owner and demotes the current owner(s) to admin. */
export async function transferOrganizationOwnership(
  organizationId: string,
  newOwnerMemberId: string
): Promise<boolean> {
  const target = membershipsStore.find(
    (m) => m.id === newOwnerMemberId && m.organizationId === organizationId && m.status === "active"
  );
  const org = organizationsStore.find((o) => o.id === organizationId);
  if (!target || !target.userId || !org) return false;

  for (const m of membershipsStore) {
    if (m.organizationId === organizationId && m.role === "owner") m.role = "admin";
  }
  target.role = "owner";
  org.ownerUserId = target.userId;
  return true;
}

export async function removeOrganizationMember(memberId: string): Promise<boolean> {
  await delay(30);
  return removeWhere(membershipsStore, (m) => m.id === memberId) > 0;
}

/**
 * Applies a whitelisted patch. If any legal field changes, verification goes
 * back to "pending".
 */
export async function updateOrganization(
  id: string,
  data: Partial<Pick<Organization, OrganizationEditableField>>
): Promise<Organization | null> {
  await delay(40);
  const org = organizationsStore.find((o) => o.id === id);
  if (!org) return null;

  let legalChanged = false;
  const target = org as unknown as Record<string, unknown>;
  for (const field of ORGANIZATION_EDITABLE_FIELDS) {
    if (!(field in data)) continue;
    const next = (data as Record<string, unknown>)[field];
    if (next === undefined) continue;
    if (
      (ORGANIZATION_LEGAL_FIELDS as readonly string[]).includes(field) &&
      JSON.stringify(target[field]) !== JSON.stringify(next)
    ) {
      legalChanged = true;
    }
    target[field] = next;
  }
  if (legalChanged) org.verificationStatus = "pending";

  return clone(org);
}

export async function deleteOrganization(id: string): Promise<boolean> {
  await delay(40);
  const removed = removeWhere(organizationsStore, (o) => o.id === id);
  removeWhere(membershipsStore, (m) => m.organizationId === id);
  // Unpublish everything the organization owned.
  for (const l of listingsTable) if (l.organizationId === id) l.status = "draft";
  for (const t of tripsTable) if (t.organizationId === id) t.status = "draft";
  return removed > 0;
}
