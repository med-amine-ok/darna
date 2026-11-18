"use server";

import * as audit from "@/lib/data/audit";
import { runAction, obj, str, requireAlso } from "@/lib/auth/run-action";

type AuditParams = audit.AuditFilterParams;

const opt = (v: unknown, f: string) => (v === undefined || v === null || v === "" ? undefined : str(v, f, 200));

function cleanParams(params: unknown): AuditParams {
  const p = obj<AuditParams>(params ?? {}, "params");
  return {
    page: typeof p.page === "number" ? p.page : undefined,
    pageSize: typeof p.pageSize === "number" ? Math.min(50, p.pageSize) : undefined,
    actorRole: opt(p.actorRole, "actorRole"),
    entityType: opt(p.entityType, "entityType"),
    search: opt(p.search, "search"),
    action: opt(p.action, "action"),
    objectId: opt(p.objectId, "objectId"),
    actorId: opt(p.actorId, "actorId"),
  };
}

export async function listAuditLogs(params: AuditParams = {}) {
  return runAction("audit.view", () => audit.listAuditLogs(cleanParams(params)));
}

/** Full filtered audit trail as CSV, built by the backend. Requires audit.view + reports.export. */
export async function exportAuditLogs(params: AuditParams = {}) {
  return runAction("audit.view", (actor) => {
    requireAlso(actor, "reports.export");
    return audit.exportAuditLogs(cleanParams(params), actor);
  });
}

/** My recent CSV exports. */
export async function listExports(page = 1) {
  return runAction("reports.export", () => audit.listExports(Math.max(1, Math.floor(Number(page) || 1))));
}
