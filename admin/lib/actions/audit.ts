"use server";

import * as audit from "@/lib/data/audit";
import { runAction, obj, str, requireAlso } from "@/lib/auth/run-action";

type AuditParams = audit.AuditFilterParams;

export async function listAuditLogs(params: AuditParams = {}) {
  return runAction("audit.view", () => audit.listAuditLogs(params ?? {}));
}

/** Full filtered audit trail as CSV (all pages). Requires audit.view + reports.export. */
export async function exportAuditLogs(params: AuditParams = {}) {
  return runAction("audit.view", (actor) => {
    requireAlso(actor, "reports.export");
    const p = obj<AuditParams>(params ?? {}, "params");
    const opt = (v: unknown, f: string) => (v === undefined || v === null ? undefined : str(v, f, 200));
    return audit.exportAuditLogs(
      { actorRole: opt(p.actorRole, "actorRole"), entityType: opt(p.entityType, "entityType"), search: opt(p.search, "search") },
      actor
    );
  });
}
