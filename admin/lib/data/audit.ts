import "server-only";

import { ApiError, api } from "@/lib/api/client";
import { emptyPage, fetchPage, logReadError, write } from "@/lib/api/mapping";
import type { AdminActor, AuditActor, AuditEntry, PaginatedResult } from "@/lib/types";
import type { CsvExport } from "@/lib/utils/csv";

/**
 * The audit trail lives in the Django API (/admin/audit-events): every
 * backend write records its own row (actor, action, object, before/after,
 * IP), so this app no longer writes one. logAudit / logExport stay as no-ops
 * for the data modules that still call them.
 */

/** @deprecated The backend audits every action itself; kept so existing callers compile. */
export async function logAudit(
  actor: AuditActor,
  action: string,
  entityType: AuditEntry["entityType"],
  entityId: string,
  details: string,
  _beforeState?: Record<string, any>,
  _afterState?: Record<string, any>,
): Promise<AuditEntry> {
  return {
    id: "",
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    details,
    ipAddress: actor.ip || "",
  };
}

/** @deprecated Backend exports (POST /admin/exports) are audited by the backend. */
export async function logExport(
  _actor: AdminActor,
  _dataset: string,
  _rowCount: number,
  _filters: Record<string, unknown> = {},
): Promise<void> {}

export interface AuditFilterParams {
  page?: number;
  pageSize?: number;
  actorRole?: string;
  entityType?: string;
  search?: string;
  /** Exact backend filters. */
  action?: string;
  objectId?: string;
  actorId?: string;
}

interface ApiAuditEvent {
  id: number | string;
  occurred_at: string;
  actor: { id: string; display_name: string } | null;
  actor_kind: string;
  action: string;
  object_type: string;
  object_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  note: string;
  ip: string | null;
}

/** Backend object types (Django model names) behind each screen entity type. */
const ENTITY_OBJECT_TYPES: Record<AuditEntry["entityType"], string[]> = {
  host: ["hostaccount", "hostdocument", "organization"],
  listing: ["listing", "trip", "listingrevision"],
  user: ["user", "data_subject_request", "datasubjectrequest"],
  booking: ["booking", "refund"],
  review: ["review"],
  wallet: ["wallettopup", "walletadjustment", "ledgertransaction", "account"],
  payout: ["payout"],
  setting: ["platformsettings", "moderationcase"],
  onboarding: ["onboardingflowversion"],
  promotion: ["coupon"],
  auth: ["sessiontoken", "mfaauthenticator"],
  export: ["exportjob"],
  team: ["staffprofile", "staff_profile"],
};

function entityTypeOf(objectType: string): AuditEntry["entityType"] {
  const t = objectType.toLowerCase();
  for (const [entity, types] of Object.entries(ENTITY_OBJECT_TYPES)) {
    if (types.includes(t)) return entity as AuditEntry["entityType"];
  }
  if (t.includes("host")) return "host";
  if (t.includes("wallet") || t.includes("ledger") || t.includes("topup")) return "wallet";
  if (t.includes("staff")) return "team";
  return "setting";
}

function summary(raw: ApiAuditEvent): string {
  const parts: string[] = [];
  if (raw.note) parts.push(raw.note);
  const change = (raw.before || raw.after) && JSON.stringify({ before: raw.before ?? undefined, after: raw.after ?? undefined });
  if (!raw.note && change) parts.push(change.length > 300 ? `${change.slice(0, 300)}...` : change);
  return parts.join(" ") || raw.action;
}

function toAuditEntry(raw: ApiAuditEvent): AuditEntry {
  return {
    id: String(raw.id),
    timestamp: raw.occurred_at,
    actorId: raw.actor?.id ?? "",
    actorName: raw.actor?.display_name ?? (raw.actor_kind === "system" ? "System" : "-"),
    // The backend has one staff role; non-staff actors and the system show as anonymous.
    actorRole: raw.actor_kind === "admin" ? "super_admin" : "anonymous",
    action: raw.action,
    entityType: entityTypeOf(raw.object_type),
    entityId: raw.object_id,
    entityName: raw.object_type,
    beforeState: raw.before ?? undefined,
    afterState: raw.after ?? undefined,
    details: summary(raw),
    ipAddress: raw.ip ?? "",
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Screen filters to the exact filters the backend has (action, object type, object id, actor). */
function auditQuery(params: AuditFilterParams) {
  const query: Record<string, string | undefined> = {
    action: params.action,
    object_id: params.objectId,
    actor: params.actorId,
  };
  if (params.entityType && params.entityType !== "all") {
    query.object_type = ENTITY_OBJECT_TYPES[params.entityType as AuditEntry["entityType"]]?.[0];
  }
  const q = params.search?.trim();
  if (q) {
    if (UUID_RE.test(q)) query.object_id = q;
    else if (/^[A-Za-z_]+$/.test(q)) query.action = q.toUpperCase();
    else query.object_id = q;
  }
  return query;
}

export async function listAuditLogs(params: AuditFilterParams): Promise<PaginatedResult<AuditEntry>> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  try {
    const result = await fetchPage<ApiAuditEvent, AuditEntry>("/admin/audit-events", toAuditEntry, {
      page,
      pageSize,
      query: auditQuery(params),
    });
    if (params.actorRole && params.actorRole !== "all") {
      // Only the admin / other split exists on the backend.
      const wantAdmin = params.actorRole !== "anonymous";
      result.rows = result.rows.filter((r) => (r.actorRole !== "anonymous") === wantAdmin);
    }
    return result;
  } catch (error) {
    logReadError("audit events", error);
    return emptyPage<AuditEntry>(page, pageSize);
  }
}

// ---- Backend CSV exports (BR-STF-04) ----

export type ExportDataset =
  | "hosts"
  | "listings"
  | "trips"
  | "bookings"
  | "users"
  | "reviews"
  | "wallets"
  | "ledger"
  | "topups"
  | "refunds"
  | "audit";

export interface ExportJob {
  id: string;
  dataset: string;
  status: string;
  rowCount: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface ApiExportJob {
  id: string;
  dataset: string;
  filters: Record<string, unknown>;
  status: string;
  row_count: number | null;
  download_url: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Build a CSV on the backend (formula-safe, audited) and return its content.
 * The 5-minute signed link is opened here on the server, never sent to the browser.
 */
export async function runBackendExport(dataset: ExportDataset, filters: Record<string, unknown> = {}): Promise<CsvExport> {
  const clean = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all"),
  );
  const job = await write(() =>
    api<ApiExportJob>("/admin/exports", { method: "POST", body: { dataset, filters: clean, format: "csv" } }),
  );
  if (!job.download_url) throw new ApiError("The export is not ready.", 409, "export_not_ready");
  const response = await fetch(job.download_url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new ApiError("The export could not be downloaded.", response.status, "export_download_failed");
  const csv = await response.text();
  return {
    filename: `bladus_${dataset}_${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    rowCount: job.row_count ?? Math.max(0, csv.split("\n").filter(Boolean).length - 1),
  };
}

/** My recent exports, newest first. */
export async function listExports(page = 1, pageSize = 20): Promise<PaginatedResult<ExportJob>> {
  try {
    return await fetchPage<ApiExportJob, ExportJob>(
      "/admin/exports",
      (j) => ({
        id: j.id,
        dataset: j.dataset,
        status: j.status,
        rowCount: j.row_count,
        createdAt: j.created_at,
        completedAt: j.completed_at,
      }),
      { page, pageSize },
    );
  } catch (error) {
    logReadError("exports", error);
    return emptyPage<ExportJob>(page, pageSize);
  }
}

/** Full filtered audit trail as CSV, built by the backend (the export itself is audited there). */
export async function exportAuditLogs(params: AuditFilterParams, _actor: AdminActor): Promise<CsvExport> {
  const q = auditQuery(params);
  return runBackendExport("audit", { action: q.action, object_type: q.object_type, object_id: q.object_id });
}
