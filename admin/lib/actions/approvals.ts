"use server";

import * as approvals from "@/lib/data/approvals";
import { runAction, str } from "@/lib/auth/run-action";

export async function getApprovalsInbox(tab: string = "hosts") {
  return runAction("hosts.view", () => approvals.getApprovalsInbox(str(tab, "tab", 30)));
}
