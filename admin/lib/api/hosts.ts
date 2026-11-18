import "server-only";

import type { Host, HostDocument, HostStatus, HostType, VerificationStatus } from "@/lib/types";
import { dzd, type ApiMoney } from "./mapping";

/** Backend AdminHostAccount (apps/hosts/serializers.py AdminHostAccountSerializer). */
export interface ApiAdminHost {
  id: string;
  host_account_id: string;
  kind: "individual" | "organization";
  host_type: string;
  display_name: string;
  verification_status: string;
  organization: {
    id: string;
    slug: string;
    business_category: string;
    legal_name?: string | null;
    rc_number?: string | null;
    nif?: string | null;
    nis?: string | null;
    tourism_licence_number?: string | null;
  } | null;
  user: { id: string; email: string | null; phone: string | null } | null;
  owner: { id: string; display_name: string } | null;
  owner_email: string | null;
  owner_phone_e164: string | null;
  default_approval_mode: "instant" | "request" | string;
  commission_rate_override_bp: number | null;
  commission_rate_bp: number;
  credit_limit_override_minor: number | null;
  credit_limit: ApiMoney;
  rating_avg: number | null;
  review_count: number;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  deleted_at: string | null;
  documents?: ApiHostDocument[];
  required_documents?: { doc_type: string; status: "approved" | "pending" | "rejected" | "missing" }[];
}

export interface ApiHostDocument {
  id: string;
  doc_type: string;
  file_url: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** Backend AdminWallet (apps/ledger/serializers.py), only the fields used here. */
export interface ApiAdminWallet {
  host_account_id: string;
  balance: ApiMoney;
  credit_limit: ApiMoney;
  state: string;
  last_entry_at: string | null;
}

const HOST_TYPES: readonly HostType[] = ["individual", "agency", "hotel", "hostel"];

/** Backend verification status to the admin HostStatus (changes_requested shows as under review). */
export function toHostStatus(raw: ApiAdminHost): HostStatus {
  if (raw.deleted_at) return "deleted";
  switch (raw.verification_status) {
    case "applied":
      return "applied";
    case "under_review":
    case "changes_requested":
      return "under_review";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "suspended":
      return "suspended";
    case "banned":
      return "banned";
    default:
      return "applied";
  }
}

/** Admin HostStatus filter value to backend verification statuses. */
export function toBackendHostStatuses(status: string): string[] {
  switch (status) {
    case "under_review":
      return ["under_review", "changes_requested"];
    case "applied":
    case "approved":
    case "rejected":
    case "suspended":
    case "banned":
      return [status];
    default:
      return [];
  }
}

const DOC_TYPE: Record<string, HostDocument["type"]> = {
  national_id: "id_card",
  passport: "id_card",
  commercial_register: "commercial_register",
  tax_card_nif: "tax_card",
  statistics_nis: "tax_card",
  tourism_licence: "tourism_licence",
  hotel_classification: "tourism_licence",
  operating_authorisation: "tourism_licence",
  property_proof: "property_deed",
};

/** Plain labels of the backend document types (DocumentType choices). */
export const DOC_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  property_proof: "Proof of ownership or lease",
  commercial_register: "Commerce register (RC)",
  tax_card_nif: "Tax card (NIF)",
  statistics_nis: "Statistics number (NIS)",
  tourism_licence: "Tourism licence",
  hotel_classification: "Hotel classification",
  operating_authorisation: "Operating authorisation",
  vehicle_registration: "Vehicle registration",
  vehicle_insurance: "Vehicle insurance",
  other: "Other document",
};

export function toHostDocument(raw: ApiHostDocument): HostDocument & { docType: string } {
  return {
    id: raw.id,
    type: DOC_TYPE[raw.doc_type] ?? "commercial_register",
    docType: raw.doc_type,
    title: DOC_LABELS[raw.doc_type] ?? raw.doc_type,
    // The stored location is never opened directly: the screen asks for a 5-minute signed link.
    fileUrl: "",
    status: raw.status,
    rejectionReason: raw.rejection_reason ?? undefined,
    uploadedAt: raw.created_at,
    reviewedAt: raw.reviewed_at ?? undefined,
  };
}

function verificationOf(raw: ApiAdminHost): VerificationStatus {
  const required = raw.required_documents;
  if (required && required.length) {
    if (required.every((d) => d.status === "approved")) return "verified";
    if (required.some((d) => d.status === "pending")) return "pending";
    return "missing";
  }
  if (raw.verification_status === "approved") return "verified";
  if (raw.verification_status === "applied") return "missing";
  return "pending";
}

export function toHost(raw: ApiAdminHost, wallet?: ApiAdminWallet | null): Host {
  const hostType = (HOST_TYPES as readonly string[]).includes(raw.host_type) ? (raw.host_type as HostType) : "individual";
  const org = raw.organization;
  const ownerName = raw.owner?.display_name || raw.display_name;
  return {
    id: raw.host_account_id || raw.id,
    ownerName,
    businessName: raw.kind === "organization" ? org?.legal_name || raw.display_name : undefined,
    email: raw.owner_email || raw.user?.email || "",
    phone: raw.owner_phone_e164 || raw.user?.phone || "",
    hostType,
    status: toHostStatus(raw),
    verificationStatus: verificationOf(raw),
    // The admin host API does not give a location yet.
    wilayaCode: "",
    city: "",
    rating: raw.rating_avg ?? 0,
    reviewsCount: raw.review_count ?? 0,
    // Not in the admin host API yet (counts live in catalog and bookings).
    listingsCount: 0,
    bookingsCount: 0,
    walletBalance: wallet ? dzd(wallet.balance) : 0,
    commissionRate: (raw.commission_rate_bp ?? 0) / 100,
    isCommissionOverridden: raw.commission_rate_override_bp !== null && raw.commission_rate_override_bp !== undefined,
    joinedAt: raw.submitted_at || raw.created_at,
    lastActiveAt: wallet?.last_entry_at || raw.approved_at || raw.created_at,
    bookingApprovalMode: raw.default_approval_mode === "request" ? "request" : "instant",
    verticalsOffered: [],
    organizationId: org?.id,
    documents: (raw.documents ?? []).map(toHostDocument),
    adminNotes: [],
    formattedId: `#${(raw.host_account_id || raw.id).slice(0, 8).toUpperCase()}`,
    agencyMetadata:
      hostType === "agency" && org
        ? { teamSize: 0, hasTrips: false, licenseNumber: org.tourism_licence_number || "" }
        : undefined,
  };
}

/** Extra facts of the host detail page that the Host type does not carry. */
export interface HostExtras {
  backendStatus: string;
  creditLimitDzd: number;
  creditLimitOverridden: boolean;
  walletState: string | null;
  legal: { legalName?: string; rc?: string; nif?: string; nis?: string; tourismLicence?: string } | null;
  requiredDocuments: { docType: string; label: string; status: string }[];
  ownerUserId: string | null;
}

export function toHostExtras(raw: ApiAdminHost, wallet?: ApiAdminWallet | null): HostExtras {
  const org = raw.organization;
  return {
    backendStatus: raw.verification_status,
    creditLimitDzd: dzd(raw.credit_limit),
    creditLimitOverridden: raw.credit_limit_override_minor !== null && raw.credit_limit_override_minor !== undefined,
    walletState: wallet?.state ?? null,
    legal: org
      ? {
          legalName: org.legal_name ?? undefined,
          rc: org.rc_number ?? undefined,
          nif: org.nif ?? undefined,
          nis: org.nis ?? undefined,
          tourismLicence: org.tourism_licence_number ?? undefined,
        }
      : null,
    requiredDocuments: (raw.required_documents ?? []).map((d) => ({
      docType: d.doc_type,
      label: DOC_LABELS[d.doc_type] ?? d.doc_type,
      status: d.status,
    })),
    ownerUserId: raw.owner?.id ?? raw.user?.id ?? null,
  };
}
