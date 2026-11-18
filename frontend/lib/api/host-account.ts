import "server-only";
import type { HostAccountSummary } from "@/types";
import { ApiError, api } from "./client";

/** GET /host/account (backend hosts host_account_data): the active host account. */
interface ApiHostAccount {
  host_account_id: string;
  kind: "individual" | "organization";
  host_type: string | null;
  display_name: string;
  role: string | null;
  verification_status: string;
  permissions: string[];
  default_approval_mode: "instant" | "request";
  commission_rate_bp: number;
  submitted_at: string | null;
  approved_at: string | null;
  required_documents: { doc_type: string; status: "approved" | "pending" | "rejected" | "missing" }[];
}

/** The active host account, or null when the API cannot be read (the screen shows its error state). */
export async function loadHostAccount(): Promise<HostAccountSummary | null> {
  try {
    const a = await api<ApiHostAccount>("/host/account");
    return {
      hostAccountId: a.host_account_id,
      kind: a.kind,
      displayName: a.display_name,
      verificationStatus: a.verification_status,
      defaultApprovalMode: a.default_approval_mode === "request" ? "request" : "instant",
      commissionPercent: (a.commission_rate_bp ?? 0) / 100,
      submittedAt: a.submitted_at,
      approvedAt: a.approved_at,
      canEdit: (a.permissions ?? []).includes("org.edit"),
      requiredDocuments: (a.required_documents ?? []).map((d) => ({ docType: d.doc_type, status: d.status })),
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) console.error("[loadHostAccount]", error);
    return null;
  }
}
