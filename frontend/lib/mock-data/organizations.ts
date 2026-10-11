import { Organization, Membership } from "@/types";

export const mockOrganizations: Organization[] = [
  {
    id: "org_atlas_escapes",
    name: "Atlas Escapes Tourism SARL",
    logo: "/assets/logo-vertical.png",
    description:
      "Premier Algerian hospitality and expedition agency operating licensed heritage stays and luxury Sahara excursions.",
    businessRegistrationNumber: "DZ-ALG-2021-B-89412",
    businessType: "Licensed Tourism Agency",
    businessEmail: "contact@atlasescapes.dz",
    businessPhone: "+213 21 74 12 30",
    address: "14 Boulevard Zighout Youcef, Algiers",
    country: "Algeria",
    verificationStatus: "verified",
    createdAt: "2021-03-15T09:00:00.000Z",
    ownerUserId: "usr_karim",
    teamSizeEstimate: "2-10",
    rating: 4.94,
    reviewCount: 76,
  },
];

export const mockMemberships: Membership[] = [
  {
    id: "mem_karim_owner",
    organizationId: "org_atlas_escapes",
    userId: "usr_karim",
    name: "Karim Mansouri",
    email: "karim.mansouri@darna.dz",
    role: "owner",
    status: "active",
    invitedBy: "system",
    createdAt: "2021-03-15T09:00:00.000Z",
    joinedAt: "2021-03-15T09:00:00.000Z",
    avatar: "/assets/avatar.png",
  },
  {
    id: "mem_sarah_manager",
    organizationId: "org_atlas_escapes",
    userId: null,
    name: "Sarah Touati",
    email: "s.touati@atlasescapes.dz",
    role: "manager",
    status: "invited",
    invitedBy: "usr_karim",
    createdAt: "2024-02-10T11:20:00.000Z",
    joinedAt: null,
  },
];
