// TODO: replace with Supabase query
import { Organization, Membership } from "@/types";
import { mockOrganizations, mockMemberships } from "@/lib/mock-data/organizations";

const g = globalThis as unknown as {
  __darna_orgs__?: Organization[];
  __darna_memberships__?: Membership[];
};
if (!g.__darna_orgs__) {
  g.__darna_orgs__ = [...mockOrganizations];
}
if (!g.__darna_memberships__) {
  g.__darna_memberships__ = [...mockMemberships];
}
let organizationsStore: Organization[] = g.__darna_orgs__;
let membershipsStore: Membership[] = g.__darna_memberships__;

export async function getOrganizationById(id: string): Promise<Organization | null> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return organizationsStore.find((org) => org.id === id) || null;
}

export async function getOrganizations(): Promise<Organization[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return [...organizationsStore];
}

export async function getOrganizationMembers(organizationId: string): Promise<Membership[]> {
  await new Promise((resolve) => setTimeout(resolve, 70));
  return membershipsStore.filter((m) => m.organizationId === organizationId);
}

export async function createOrganization(data: {
  name: string;
  logo?: string;
  description?: string;
  businessRegistrationNumber: string;
  businessType?: string;
  businessEmail: string;
  businessPhone: string;
  address?: string;
  country?: string;
  ownerUserId: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  teamSizeEstimate?: "1" | "2-10" | "11-50" | "50+";
  invitedMembers?: { email: string; role: "admin" | "manager" }[];
}): Promise<Organization> {
  await new Promise((resolve) => setTimeout(resolve, 120));

  const orgId = `org_${Date.now()}`;
  const newOrg: Organization = {
    id: orgId,
    name: data.name,
    logo: data.logo || "/assets/logo-vertical.png",
    description: data.description || "",
    businessRegistrationNumber: data.businessRegistrationNumber,
    businessType: data.businessType || "Licensed Tourism Agency",
    businessEmail: data.businessEmail,
    businessPhone: data.businessPhone,
    address: data.address || "Algiers, Algeria",
    country: data.country || "Algeria",
    verificationStatus: data.verificationStatus || "verified",
    createdAt: new Date().toISOString(),
    ownerUserId: data.ownerUserId,
    teamSizeEstimate: data.teamSizeEstimate || "2-10",
    rating: 5.0,
    reviewCount: 0,
  };

  organizationsStore = [newOrg, ...organizationsStore];
  g.__darna_orgs__ = organizationsStore;
  if (!mockOrganizations.some((o) => o.id === newOrg.id)) {
    mockOrganizations.unshift(newOrg);
  }

  // Create owner membership
  const ownerMembership: Membership = {
    id: `mem_${Date.now()}_owner`,
    organizationId: orgId,
    userId: data.ownerUserId,
    name: "Agency Owner",
    email: data.businessEmail,
    role: "owner",
    status: "active",
    invitedBy: "system",
    createdAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  };
  membershipsStore = [ownerMembership, ...membershipsStore];

  // Add invited team members
  if (data.invitedMembers && data.invitedMembers.length > 0) {
    data.invitedMembers.forEach((member, i) => {
      const invitedMem: Membership = {
        id: `mem_${Date.now()}_${i}`,
        organizationId: orgId,
        userId: null,
        name: member.email.split("@")[0],
        email: member.email,
        role: member.role,
        status: "invited",
        invitedBy: data.ownerUserId,
        createdAt: new Date().toISOString(),
        joinedAt: null,
      };
      membershipsStore.push(invitedMem);
    });
  }

  return newOrg;
}

export async function updateOrganizationVerification(
  id: string,
  status: "pending" | "verified" | "rejected"
): Promise<Organization | null> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const org = organizationsStore.find((o) => o.id === id);
  if (org) {
    org.verificationStatus = status;
    return org;
  }
  return null;
}

export async function addOrganizationMember(data: {
  organizationId: string;
  name: string;
  email: string;
  role: "admin" | "manager";
  invitedBy: string;
}): Promise<Membership> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const newMember: Membership = {
    id: `mem_${Date.now()}`,
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
  membershipsStore = [newMember, ...membershipsStore];
  return newMember;
}

export async function updateOrganizationMemberRole(
  memberId: string,
  role: "admin" | "manager" | "owner"
): Promise<Membership | null> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const idx = membershipsStore.findIndex((m) => m.id === memberId);
  if (idx !== -1) {
    membershipsStore[idx] = {
      ...membershipsStore[idx],
      role,
    };
    return membershipsStore[idx];
  }
  return null;
}

export async function removeOrganizationMember(memberId: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const beforeLen = membershipsStore.length;
  membershipsStore = membershipsStore.filter((m) => m.id !== memberId);
  return membershipsStore.length < beforeLen;
}

export async function updateOrganization(
  id: string,
  data: Partial<Organization>
): Promise<Organization | null> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const idx = organizationsStore.findIndex((o) => o.id === id);
  if (idx !== -1) {
    organizationsStore[idx] = {
      ...organizationsStore[idx],
      ...data,
    };
    return organizationsStore[idx];
  }
  return null;
}

export async function deleteOrganization(id: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const before = organizationsStore.length;
  organizationsStore = organizationsStore.filter((o) => o.id !== id);
  membershipsStore = membershipsStore.filter((m) => m.organizationId !== id);
  return organizationsStore.length < before;
}
