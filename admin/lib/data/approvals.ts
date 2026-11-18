import "server-only";

import { api, newIdempotencyKey } from "@/lib/api/client";
import { logReadError, write } from "@/lib/api/mapping";
import {
  TAB_KINDS,
  tabCounts,
  toModerationCase,
  type ApiCase,
  type ApiQueueCount,
  type ApiReasonCode,
} from "@/lib/api/moderation";
import type { ModerationCase } from "@/lib/types";
import { getHostById } from "./hosts";
import { getListingById } from "./listings";
import { getBookingById } from "./bookings";

/**
 * The moderation queue of the Django API (/admin/moderation/*, MOD-01 to
 * MOD-04). Each tab of the approvals inbox is one or more backend queues;
 * the rows are enriched with their subject (host, listing, booking) for the
 * side panel. Decisions go through POST .../decisions, which applies them to
 * the subject and writes the audit trail.
 */

const EMPTY_COUNTS = { hosts: 0, listings: 0, documents: 0, reviews: 0, disputes: 0, total: 0 };
/** Rows read per tab (the backend maximum page size is 100). */
const INBOX_PAGE_SIZE = 50;

export interface ReasonOption {
  code: string;
  label: string;
}

export interface ApprovalsInbox {
  items: ModerationCase[];
  counts: typeof EMPTY_COUNTS;
  /** Reject reasons of the catalogue (MOD-03) by action, e.g. reject_host. */
  reasons: Record<string, ReasonOption[]>;
  /** True when the queue could not be read (the screen shows its error state). */
  failed?: boolean;
}

async function enrich(item: ModerationCase): Promise<ModerationCase> {
  try {
    if (item.type === "host") {
      const host = await getHostById(item.entityId);
      if (host) {
        return {
          ...item,
          hostType: host.hostType,
          subtitle: [host.email, item.subtitle].filter(Boolean).join(" · "),
          details: { ...item.details, ...host, nifNumber: undefined },
        };
      }
    } else if (item.type === "listing" && item.vertical !== "trip") {
      const listing = await getListingById(item.entityId);
      if (listing) {
        return {
          ...item,
          vertical: listing.category,
          wilayaCode: listing.wilayaCode,
          details: { ...item.details, ...listing },
        };
      }
    } else if (item.type === "document" && item.details?.hostAccountId) {
      const host = await getHostById(item.details.hostAccountId);
      if (host) {
        const doc = host.documents.find((d) => d.id === item.entityId);
        return {
          ...item,
          hostType: host.hostType,
          subtitle: host.businessName || host.ownerName,
          details: { ...item.details, document: doc, host, businessName: host.businessName, ownerName: host.ownerName },
        };
      }
    } else if (item.type === "dispute") {
      const booking = await getBookingById(item.entityId);
      if (booking) return { ...item, details: { ...item.details, ...booking } };
    }
  } catch (error) {
    logReadError(`moderation subject ${item.type}`, error);
  }
  return item;
}

export async function getModerationCounts() {
  try {
    const answer = await api<{ queues: ApiQueueCount[] }>("/admin/moderation/counts");
    return tabCounts(answer.queues ?? []);
  } catch (error) {
    logReadError("moderation counts", error);
    return { ...EMPTY_COUNTS };
  }
}

/** Open cases waiting in the inbox tabs (sidebar badge). */
export async function getApprovalsCount(): Promise<number> {
  return (await getModerationCounts()).total;
}

export async function listReasonCodes(action?: string): Promise<ApiReasonCode[]> {
  try {
    const answer = await api<{ results: ApiReasonCode[] }>("/admin/reason-codes", { query: { action } });
    return answer.results ?? [];
  } catch (error) {
    logReadError("reason codes", error);
    return [];
  }
}

export async function getApprovalsInbox(tab: string = "hosts"): Promise<ApprovalsInbox> {
  const kinds = TAB_KINDS[tab] ?? TAB_KINDS.hosts;
  const [counts, reasonRows, page] = await Promise.all([
    getModerationCounts(),
    listReasonCodes(),
    api<{ results: ApiCase[] }>("/admin/moderation/cases", {
      query: { kind: kinds.join(","), status: "open,in_progress", ordering: "submitted_at", page_size: INBOX_PAGE_SIZE },
    }).catch((error) => {
      logReadError("moderation cases", error);
      return null;
    }),
  ]);
  const reasons: Record<string, ReasonOption[]> = {};
  for (const row of reasonRows) (reasons[row.action] ??= []).push({ code: row.code, label: row.label });

  if (!page) return { items: [], counts, reasons, failed: true };
  const items = await Promise.all((page.results ?? []).map((raw) => enrich(toModerationCase(raw))));
  return { items, counts, reasons };
}

export type CaseDecision = "approve" | "reject" | "request_changes" | "dismiss" | "hide" | "restore" | "escalate";

export interface DecisionInput {
  decision: CaseDecision;
  note?: string;
  reasonCode?: string | null;
  items?: { checklist_code: string; message?: string }[];
}

function decisionBody(input: DecisionInput) {
  const body: Record<string, unknown> = { decision: input.decision };
  if (input.note) body.note = input.note;
  if (input.reasonCode) body.reason_code = input.reasonCode;
  if (input.items?.length) body.items = input.items;
  return body;
}

/** Decide one case; the backend applies it to the host, document, listing or trip (BR-MOD-02). */
export async function decideCase(caseId: string, input: DecisionInput): Promise<ModerationCase> {
  const raw = await write(() =>
    api<ApiCase>(`/admin/moderation/cases/${encodeURIComponent(caseId)}/decisions`, {
      method: "POST",
      body: decisionBody(input),
      idempotencyKey: newIdempotencyKey(),
    }),
  );
  return toModerationCase(raw);
}

/** The same decision on up to 100 cases; one result per case (MOD-04). */
export async function bulkDecide(
  caseIds: string[],
  input: DecisionInput,
): Promise<{ id: string; ok: boolean; error: string | null }[]> {
  const answer = await write(() =>
    api<{ results: { id: string; ok: boolean; error: { message: string } | null }[] }>("/admin/moderation/bulk-decisions", {
      method: "POST",
      body: { case_ids: caseIds.slice(0, 100), decision: decisionBody(input) },
    }),
  );
  return (answer.results ?? []).map((r) => ({ id: r.id, ok: r.ok, error: r.error?.message ?? null }));
}

/** Take a case (assignee omitted = me) or release it (null). */
export async function assignCase(caseId: string, assigneeId?: string | null): Promise<ModerationCase> {
  const body = assigneeId === undefined ? {} : { assignee_id: assigneeId };
  const raw = await write(() =>
    api<ApiCase>(`/admin/moderation/cases/${encodeURIComponent(caseId)}/assign`, { method: "POST", body }),
  );
  return toModerationCase(raw);
}
