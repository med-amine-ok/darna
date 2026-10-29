"use server";

import * as data from "@/lib/data/hosts";
import { runAction, id, obj, rate, reason, requireAlso } from "@/lib/auth/run-action";

type ListParams = data.HostFilterParams;

export async function listHosts(params: ListParams = {}) {
  return runAction("hosts.view", () => data.listHosts(params ?? {}));
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

export async function suspendHost(hostId: string, suspendReason: string) {
  return runAction("hosts.suspend", (actor) => data.suspendHost(id(hostId), reason(suspendReason), actor));
}

export async function unsuspendHost(hostId: string) {
  return runAction("hosts.suspend", (actor) => data.unsuspendHost(id(hostId), actor));
}

export async function banHost(hostId: string, banReason: string) {
  return runAction("hosts.delete", (actor) => data.banHost(id(hostId), reason(banReason), actor));
}

export async function deleteHost(hostId: string) {
  return runAction("hosts.delete", (actor) => data.deleteHost(id(hostId), actor));
}

export async function restoreHost(hostId: string) {
  return runAction("hosts.delete", (actor) => data.restoreHost(id(hostId), actor));
}

export async function overrideCommission(hostId: string, newRate: number) {
  return runAction("hosts.commission_override", (actor) =>
    data.overrideCommission(id(hostId), rate(newRate, "rate"), actor)
  );
}

/** Full filtered host list as CSV (all pages). Requires reports.export + hosts.view. */
export async function exportHosts(params: ListParams = {}) {
  return runAction("reports.export", (actor) => {
    requireAlso(actor, "hosts.view");
    const p = obj<ListParams>(params ?? {}, "params");
    return data.exportHosts({ ...p, page: undefined, pageSize: undefined }, actor);
  });
}
