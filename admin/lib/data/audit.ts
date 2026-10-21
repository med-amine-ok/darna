// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { AuditEntry, AdminRole, PaginatedResult } from "@/lib/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function logAudit(
  actor: { id: string; name: string; role: AdminRole },
  action: string,
  entityType: AuditEntry["entityType"],
  entityId: string,
  details: string,
  beforeState?: Record<string, any>,
  afterState?: Record<string, any>
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
    ipAddress: "197.200.45.12 (Algiers, DZ)",
  };

  store.audit = [newEntry, ...store.audit];
  return newEntry;
}

export async function listAuditLogs(params: {
  page?: number;
  pageSize?: number;
  actorRole?: string;
  entityType?: string;
  search?: string;
}): Promise<PaginatedResult<AuditEntry>> {
  await delay(180);

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  let filtered = [...store.audit];

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
        a.entityId.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}
