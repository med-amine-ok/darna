"use server";

import * as approvals from "@/lib/data/approvals";
import { InvalidInputError, runAction, id, oneOf, str } from "@/lib/auth/run-action";

const DECISIONS = ["approve", "reject", "request_changes", "dismiss", "hide", "restore", "escalate"] as const;

export async function getApprovalsInbox(tab: string = "hosts") {
  return runAction("hosts.view", () => approvals.getApprovalsInbox(str(tab, "tab", 30)));
}

/** Decide one moderation case. The backend checks the staff permission of the subject. */
export async function decideCase(caseId: string, decision: string, note?: string, reasonCode?: string | null) {
  return runAction("hosts.view", () =>
    approvals.decideCase(id(caseId), {
      decision: oneOf(decision, DECISIONS, "decision"),
      note: note ? str(note, "note", 4000).trim() : undefined,
      reasonCode: reasonCode ? str(reasonCode, "reason code", 48) : null,
    }),
  );
}

export async function bulkDecideCases(caseIds: string[], decision: string, note?: string) {
  return runAction("hosts.view", () => {
    if (!Array.isArray(caseIds) || caseIds.length === 0 || caseIds.length > 100) {
      throw new InvalidInputError("Select between 1 and 100 cases");
    }
    return approvals.bulkDecide(
      caseIds.map((c) => id(c, "case id")),
      { decision: oneOf(decision, DECISIONS, "decision"), note: note ? str(note, "note", 4000).trim() : undefined },
    );
  });
}

export async function assignCaseToMe(caseId: string) {
  return runAction("hosts.view", () => approvals.assignCase(id(caseId)));
}
