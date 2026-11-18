"use server";

import * as data from "@/lib/data/hosts";
import { runAction, dzd, id, obj, rate, reason, requireAlso } from "@/lib/auth/run-action";

type ListParams = data.HostFilterParams;

export async function listHosts(params: ListParams = {}) {
  return runAction("hosts.view", () => data.listHosts(obj<ListParams>(params ?? {}, "params")));
}

export async function getHostById(hostId: string) {
  return runAction("hosts.view", () => data.getHostById(id(hostId)));
}

export async function approveHost(hostId: string) {
  return runAction("hosts.approve", (actor) => data.approveHost(id(hostId), actor));
}

export async function rejectHost(hostId: string, rejectReason: string) {
  return runAction("hosts.reject", (actor) => data.rejectHost(id(hostId), reason(rejectReason), actor));
}

export async function requestHostChanges(hostId: string, note: string) {
  return runAction("hosts.reject", (actor) => data.requestHostChanges(id(hostId), reason(note), actor));
}

export async function suspendHost(hostId: string, suspendReason: string) {
  return runAction("hosts.suspend", (actor) => data.suspendHost(id(hostId), reason(suspendReason), actor));
}

export async function unsuspendHost(hostId: string) {
  return runAction("hosts.suspend", (actor) => data.unsuspendHost(id(hostId), actor));
}

export async function banHost(hostId: string, banReason: string) {
  return runAction("hosts.suspend", (actor) => data.banHost(id(hostId), reason(banReason), actor));
}

export async function deleteHost(hostId: string) {
  return runAction("hosts.delete", (actor) => data.deleteHost(id(hostId), actor));
}

export async function restoreHost(hostId: string) {
  return runAction("hosts.delete", (actor) => data.restoreHost(id(hostId), actor));
}

/** The backend requires a reason of at least 10 characters for a commission override. */
export async function overrideCommission(hostId: string, newRate: number, overrideReason?: string) {
  return runAction("hosts.commission_override", (actor) =>
    data.overrideCommission(id(hostId), rate(newRate, "rate"), actor, reason(overrideReason ?? "")),
  );
}

export async function clearCommissionOverride(hostId: string) {
  return runAction("hosts.commission_override", (actor) => data.clearCommissionOverride(id(hostId), actor));
}

export async function setCreditLimit(hostId: string, amountDzd: number, limitReason: string) {
  return runAction("hosts.commission_override", (actor) =>
    data.setCreditLimit(id(hostId), dzd(amountDzd, "credit limit"), reason(limitReason), actor),
  );
}

/** Signed 5-minute link to a KYC document (opened in a new tab; the view is audited). */
export async function getDocumentUrl(documentId: string) {
  return runAction("kyc.view_documents", (actor) => data.getDocumentUrl(id(documentId), actor));
}

export async function approveDocument(documentId: string) {
  return runAction("hosts.approve", (actor) => data.reviewDocument(id(documentId), true, undefined, actor));
}

export async function rejectDocument(documentId: string, rejectReason: string) {
  return runAction("hosts.reject", (actor) => data.reviewDocument(id(documentId), false, reason(rejectReason), actor));
}

/** Full filtered host list as CSV (all pages). Requires reports.export + hosts.view. */
export async function exportHosts(params: ListParams = {}) {
  return runAction("reports.export", (actor) => {
    requireAlso(actor, "hosts.view");
    const p = obj<ListParams>(params ?? {}, "params");
    return data.exportHosts({ ...p, page: undefined, pageSize: undefined }, actor);
  });
}
