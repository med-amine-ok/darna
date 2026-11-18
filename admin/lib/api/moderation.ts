import "server-only";

import type { ModerationCase } from "@/lib/types";

/** Backend ModerationCase (apps/trust/serializers.py ModerationCaseSerializer). */
export interface ApiCase {
  id: string;
  kind: string;
  subject: {
    type: string;
    id: string;
    reference: string | null;
    title: string;
    host_account_id: string | null;
  };
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "normal" | "high";
  submitted_at: string;
  waiting_hours: number;
  assigned_to: { id: string; display_name: string } | null;
  decisions?: { id: string; decision: string; reason_code: string | null; note: string | null; created_at: string }[];
  created_at: string;
}

export interface ApiQueueCount {
  kind: string;
  open: number;
  high_priority: number;
  oldest_submitted_at: string | null;
}

export interface ApiReasonCode {
  id: string;
  action: string;
  code: string;
  label: string;
  host_text?: string | null;
}

export interface ApiAttentionGroup {
  kind: string;
  count: number;
  top: { id: string; title: string; href: string; since: string | null }[];
}

/** Approvals inbox tabs and the backend queues behind each one. */
export const TAB_KINDS: Record<string, string[]> = {
  hosts: ["host_verification"],
  listings: ["listing_review", "trip_review", "listing_revision"],
  documents: ["document"],
  reviews: ["review_report"],
  disputes: ["dispute"],
};

const KIND_TYPE: Record<string, ModerationCase["type"]> = {
  host_verification: "host",
  listing_review: "listing",
  trip_review: "listing",
  listing_revision: "listing",
  document: "document",
  review_report: "review",
  dispute: "dispute",
};

export function toModerationCase(raw: ApiCase): ModerationCase {
  const type = KIND_TYPE[raw.kind] ?? "listing";
  return {
    id: raw.id,
    type,
    entityId: raw.subject.id,
    title: raw.subject.title,
    subtitle: [raw.subject.reference, raw.assigned_to?.display_name].filter(Boolean).join(" · "),
    submittedAt: raw.submitted_at,
    waitingDays: Math.max(0, Math.floor((raw.waiting_hours ?? 0) / 24)),
    priority: raw.priority,
    vertical: raw.kind === "trip_review" ? "trip" : undefined,
    status: raw.status,
    details: {
      kind: raw.kind,
      caseId: raw.id,
      reference: raw.subject.reference,
      subjectType: raw.subject.type,
      hostAccountId: raw.subject.host_account_id,
      host: raw.subject.host_account_id ? { id: raw.subject.host_account_id } : undefined,
    },
  };
}

/** Counts per inbox tab from the backend queues. */
export function tabCounts(queues: ApiQueueCount[]) {
  const sum = (kinds: string[]) => queues.filter((q) => kinds.includes(q.kind)).reduce((n, q) => n + (q.open || 0), 0);
  const counts = {
    hosts: sum(TAB_KINDS.hosts),
    listings: sum(TAB_KINDS.listings),
    documents: sum(TAB_KINDS.documents),
    reviews: sum(TAB_KINDS.reviews),
    disputes: sum(TAB_KINDS.disputes),
    total: 0,
  };
  counts.total = counts.hosts + counts.listings + counts.documents + counts.reviews + counts.disputes;
  return counts;
}
