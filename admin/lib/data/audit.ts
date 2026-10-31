import "server-only";
// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import {
  AuditEntry,
  AuditActor,
  AdminActor,
  PaginatedResult,
} from "@/lib/types";
import { toCsv, type CsvExport } from "@/lib/utils/csv";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The ONLY writer of the audit trail. Entries are appended (never edited or
 * removed) through store.appendAudit, which freezes them. The actor and IP
 * always come from the server-side session (lib/auth/current-admin) or, for
 * sign-in attempts, from the request headers, never from the client.
 */
export async function logAudit(
  actor: AuditActor,
  action: string,
  entityType: AuditEntry["entityType"],
  entityId: string,
  details: string,
  beforeState?: Record<string, any>,
  afterState?: Record<string, any>,
): Promise<AuditEntry> {
  const newEntry: AuditEntry = {
    id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    details,
    beforeState,
    afterState,
    ipAddress: actor.ip || "unknown",
  };

  return { ...store.appendAudit(newEntry) };
}

/** Records a data export (CSV) in the audit trail. */
export async function logExport(
  actor: AdminActor,
  dataset: string,
  rowCount: number,
  filters: Record<string, unknown> = {},
): Promise<void> {
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" && v !== "all",
    ),
  );
  await logAudit(
    actor,
    "DATA_EXPORT",
    "export",
    dataset,
    `Exported ${rowCount} ${dataset} row(s) as CSV`,
    undefined,
    { dataset, rowCount, filters: activeFilters },
  );
}

export interface AuditFilterParams {
  page?: number;
  pageSize?: number;
  actorRole?: string;
  entityType?: string;
  search?: string;
}

function filterAudit(params: AuditFilterParams): AuditEntry[] {
  let filtered: AuditEntry[] = [...store.audit];

  if (params.entityType && params.entityType !== "all") {
    filtered = filtered.filter((a) => a.entityType === params.entityType);
  }

  if (params.actorRole && params.actorRole !== "all") {
    filtered = filtered.filter((a) => a.actorRole === params.actorRole);
  }

  if (params.search?.trim()) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.details.toLowerCase().includes(q) ||
        a.actorName.toLowerCase().includes(q) ||
        a.entityId.toLowerCase().includes(q),
    );
  }
  return filtered;
}

export async function listAuditLogs(
  params: AuditFilterParams,
): Promise<PaginatedResult<AuditEntry>> {
  await delay(180);

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const filtered = filterAudit(params);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered
    .slice((page - 1) * pageSize, page * pageSize)
    .map((e) => ({ ...e }));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/** Full filtered audit trail (all pages) as CSV; the export itself is audited. */
export async function exportAuditLogs(
  params: AuditFilterParams,
  actor: AdminActor,
): Promise<CsvExport> {
  const rows = filterAudit({ ...params, page: undefined, pageSize: undefined });
  const csv = toCsv(
    [
      "Timestamp",
      "Actor",
      "Role",
      "Action",
      "Entity Type",
      "Entity ID",
      "Details",
      "IP Address",
    ],
    rows.map((r) => [
      r.timestamp,
      r.actorName,
      r.actorRole,
      r.action,
      r.entityType,
      r.entityId,
      r.details,
      r.ipAddress,
    ]),
  );
  await logExport(actor, "audit_log", rows.length, { ...params });
  return {
    filename: `darna_audit_log_${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    rowCount: rows.length,
  };
}
