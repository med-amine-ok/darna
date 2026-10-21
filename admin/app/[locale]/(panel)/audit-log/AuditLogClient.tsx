"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Eye,
  FileCode,
  Clock,
  User,
  Activity,
} from "lucide-react";
import { listAuditLogs } from "@/lib/data/audit";
import { AuditEntry } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

interface Props {
  locale: string;
}

export default function AuditLogClient({ locale }: Props) {
  const t = useTranslations("auditLog");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);

  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Diff Modal
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { info } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs({
        page,
        pageSize,
        entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
        actorRole: roleFilter === "all" ? undefined : roleFilter,
        search,
      });
      setLogs(res.rows);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityTypeFilter, roleFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDiff = (entry: AuditEntry) => {
    setSelectedEntry(entry);
    setDiffModalOpen(true);
  };

  const exportAuditCsv = () => {
    const headers = "ID,Timestamp,Actor,Role,Action,EntityType,EntityID,Details,IPAddress\n";
    const rows = logs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.actorName}","${l.actorRole}","${l.action}","${l.entityType}","${l.entityId}","${l.details.replace(/"/g, '""')}","${l.ipAddress || "N/A"}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `darna_security_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    info("Audit Export Ready", "Downloaded filtered immutable audit logs.");
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/25">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportAuditCsv}
          className="text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5 me-1.5" />
          {t("exportCsv")}
        </Button>
      </div>

      {/* Filter Omnibar */}
      <div className="bg-white p-3.5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor, entity ID, or details..."
              className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-darnaBg/30 focus:bg-white text-primary focus:outline-none focus:border-secondary"
            />
          </div>

          <div>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
            >
              <option value="all">{tCommon("all")}</option>
              <option value="host">Host Organizations</option>
              <option value="listing">Listings & Stays</option>
              <option value="booking">Bookings</option>
              <option value="user">Users / Guests</option>
              <option value="wallet">Treasury Wallets</option>
              <option value="review">Reviews</option>
              <option value="setting">Platform Settings</option>
              <option value="onboarding">Onboarding Config</option>
            </select>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-tertiary/80 bg-white text-primary focus:outline-none focus:border-secondary"
            >
              <option value="all">{tCommon("all")}</option>
              <option value="super_admin">{tRoles("super_admin")}</option>
              <option value="moderator">{tRoles("moderator")}</option>
              <option value="support">{tRoles("support")}</option>
              <option value="finance">{tRoles("finance")}</option>
              <option value="analyst">{tRoles("analyst")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("timestamp")}</th>
                <th className="py-3 px-4 text-start">{t("actor")}</th>
                <th className="py-3 px-4 text-start">{t("action")}</th>
                <th className="py-3 px-4 text-start">{t("entity")}</th>
                <th className="py-3 px-4 text-start">{t("details")}</th>
                <th className="py-3 px-4 text-end">{t("viewDiff")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    {tCommon("loading")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    {t("subtitle")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-darnaBg/20 transition-colors">
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                      {formatDate(log.timestamp, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-primary">{log.actorName}</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-neutral-100 text-neutral-600 uppercase">
                        {log.actorRole.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-xs text-primary bg-darnaBg/70 px-2 py-0.5 rounded border border-tertiary/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-neutral-600">
                      <div>{log.entityType}</div>
                      <div className="font-mono text-[10px] text-neutral-400">{log.entityId}</div>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 max-w-sm truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-end">
                      {log.beforeState || log.afterState ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDiff(log)}
                          className="px-2.5 py-1 rounded-lg border border-tertiary text-neutral-600 hover:text-primary hover:bg-darnaBg font-semibold text-[11px] flex items-center gap-1 ms-auto cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5 text-secondary" />
                          <span>{t("viewDiff")}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="p-3 border-t border-tertiary/40">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / pageSize)}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* STATE MUTATION DIFF VIEWER MODAL */}
      <Dialog
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        title={`Audit State Inspection: ${selectedEntry?.action}`}
        size="lg"
      >
        <div className="space-y-4 text-start">
          <div className="flex items-center justify-between text-xs text-neutral-500 pb-2 border-b border-tertiary/40">
            <span>
              Target: <strong>{selectedEntry?.entityType}</strong> ({selectedEntry?.entityId})
            </span>
            <span>Recorded IP: {selectedEntry?.ipAddress}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-accent mb-1.5 flex items-center gap-1">
                <span>Before State (Previous)</span>
              </h4>
              <pre className="p-3.5 rounded-xl bg-neutral-900 text-neutral-200 font-mono text-[11px] overflow-x-auto max-h-72">
                {selectedEntry?.beforeState
                  ? JSON.stringify(selectedEntry.beforeState, null, 2)
                  : "// No prior snapshot recorded"}
              </pre>
            </div>

            <div>
              <h4 className="text-xs font-bold text-secondary mb-1.5 flex items-center gap-1">
                <span>After State (Mutated)</span>
              </h4>
              <pre className="p-3.5 rounded-xl bg-neutral-900 text-neutral-200 font-mono text-[11px] overflow-x-auto max-h-72">
                {selectedEntry?.afterState
                  ? JSON.stringify(selectedEntry.afterState, null, 2)
                  : "// No subsequent state recorded"}
              </pre>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiffModalOpen(false)}
              className="text-xs"
            >
              Close Inspector
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
