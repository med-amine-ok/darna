"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { useTranslations } from "next-intl";
import { Search, Download, FileCode } from "lucide-react";
import { listAuditLogs, exportAuditLogs } from "@/lib/actions/audit";
import { downloadCsv } from "@/lib/utils/download";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { unwrap } from "@/lib/actions/result";
import { AuditEntry } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils/format";

const ENTITY_TYPES: AuditEntry["entityType"][] = [
  "host",
  "listing",
  "booking",
  "user",
  "wallet",
  "review",
  "setting",
  "onboarding",
  "promotion",
  "payout",
  "team",
  "auth",
  "export",
];

const ROLES = [
  "super_admin",
  "moderator",
  "support",
  "finance",
  "analyst",
] as const;

const FIELD_CLASS =
  "w-full text-xs rounded-xl border border-primary/[0.12] text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] shadow-2xs hover:border-primary/25";

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

  const { info, error } = useToast();
  const tActions = useTranslations("actions");
  const can = useCan();
  const searchId = useId();
  const entityFilterId = useId();
  const roleFilterId = useId();

  const roleLabel = (role: AuditEntry["actorRole"]) =>
    role === "anonymous" ? t("anonymous") : tRoles(role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = unwrap(
        await listAuditLogs({
          page,
          pageSize,
          entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
          actorRole: roleFilter === "all" ? undefined : roleFilter,
          search,
        }),
      );
      setLogs(res.rows);
      setTotal(res.total);
    } catch (err) {
      error(t("loadFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityTypeFilter, roleFilter, search, error, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDiff = (entry: AuditEntry) => {
    setSelectedEntry(entry);
    setDiffModalOpen(true);
  };

  /** Server-side export of the FULL filtered trail (all pages); the export itself is audited. */
  const exportAuditCsv = async () => {
    try {
      const res = unwrap(
        await exportAuditLogs({
          entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
          actorRole: roleFilter === "all" ? undefined : roleFilter,
          search: search || undefined,
        }),
      );
      downloadCsv(res.filename, res.csv);
      info(
        tActions("exportStarted"),
        tActions("exportRows", { count: res.rowCount }),
      );
      loadData();
    } catch (err) {
      error(
        tActions("exportFailed"),
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  return (
    <div className="space-y-6 text-start min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-serif text-heading text-primary-900">
              {t("title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-900 ring-1 ring-inset ring-secondary-200">
              {t("appendOnlyBadge")}
            </span>
          </div>
          <p className="text-meta text-primary-600 mt-1 max-w-3xl">
            {t("subtitle")}
          </p>
        </div>

        {can("reports.export") && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportAuditCsv}
            className="shrink-0 whitespace-nowrap"
            leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            {t("exportCsv")}
          </Button>
        )}
      </div>

      {/* Filter Omnibar */}
      <div className="bg-white p-3.5 rounded-2xl shadow-e1 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              {tCommon("search")}
            </label>
            <Search
              className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className={`ps-9 pe-3 py-2 bg-white shadow-2xs ${FIELD_CLASS}`}
            />
          </div>

          <div>
            <label htmlFor={entityFilterId} className="sr-only">
              {t("filterEntity")}
            </label>
            <select
              id={entityFilterId}
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className={`px-3 py-2 bg-white shadow-2xs ${FIELD_CLASS}`}
            >
              <option value="all">{t("allEntities")}</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`entities.${type}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={roleFilterId} className="sr-only">
              {t("filterRole")}
            </label>
            <select
              id={roleFilterId}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className={`px-3 py-2 bg-white shadow-2xs ${FIELD_CLASS}`}
            >
              <option value="all">{t("allRoles")}</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {tRoles(role)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-e1">
        <div className="relative overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg-100 text-primary-600 text-xs font-semibold [&_th]:border-b [&_th]:border-primary/[0.08] [&_th]:whitespace-nowrap">
              <tr>
                <th scope="col" className="py-3 px-4 text-start">
                  {t("timestamp")}
                </th>
                <th scope="col" className="py-3 px-4 text-start">
                  {t("actor")}
                </th>
                <th scope="col" className="py-3 px-4 text-start">
                  {t("action")}
                </th>
                <th scope="col" className="py-3 px-4 text-start">
                  {t("entity")}
                </th>
                <th scope="col" className="py-3 px-4 text-start">
                  {t("details")}
                </th>
                <th scope="col" className="py-3 px-4 text-end">
                  {t("viewDiff")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.06]">
              {loading ? (
                Array.from({ length: 6 }).map((_, r) => (
                  <tr key={r} aria-hidden={r > 0 ? true : undefined}>
                    <td colSpan={6} className="py-3.5 px-4">
                      {r === 0 && (
                        <span className="sr-only">{tCommon("loading")}</span>
                      )}
                      <div className="flex gap-6">
                        <div className="skeleton h-3.5 w-28 rounded-md" />
                        <div className="skeleton h-3.5 w-24 rounded-md" />
                        <div className="skeleton h-3.5 w-32 rounded-md" />
                        <div className="skeleton h-3.5 flex-1 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState size="compact" title={t("empty")} />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-darnaBg-100 transition-colors"
                  >
                    <td className="py-3 px-4 text-primary-600 tabular-nums text-xs whitespace-nowrap">
                      {formatDateTime(log.timestamp, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary-900 whitespace-nowrap">
                        {log.actorName}
                      </div>
                      <span className="inline-block mt-0.5 text-[11px] px-1.5 py-0.5 rounded-md font-semibold bg-primary/[0.06] text-primary-700 whitespace-nowrap">
                        {roleLabel(log.actorRole)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-xs text-primary-800 bg-darnaBg-300/70 px-2 py-0.5 rounded-md whitespace-nowrap tracking-wide">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-600">
                      <div>{t(`entities.${log.entityType}`)}</div>
                      <div className="font-mono text-[11px] text-neutral-500">
                        {log.entityId}
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 text-primary-800 max-w-[16rem] xl:max-w-sm truncate"
                      title={log.details}
                    >
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-end">
                      {log.beforeState || log.afterState ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDiff(log)}
                          aria-label={t("viewDiffFor", {
                            action: log.action,
                            id: log.entityId,
                          })}
                          className="px-2.5 py-1 rounded-lg bg-white shadow-e1 hover:shadow-e2 text-primary-700 hover:text-primary-900 font-semibold text-xs whitespace-nowrap flex items-center gap-1 ms-auto cursor-pointer transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                        >
                          <FileCode
                            className="w-3.5 h-3.5 text-secondary"
                            aria-hidden="true"
                          />
                          <span>{t("viewDiff")}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-500">
                          <span aria-hidden="true">,</span>
                          <span className="sr-only">{t("noDiff")}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="px-3 border-t border-primary/[0.06]">
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
        title={t("diff.title", { action: selectedEntry?.action ?? "" })}
        size="lg"
      >
        <div className="space-y-4 text-start">
          <div className="flex items-center justify-between text-xs text-neutral-500 pb-2 border-b border-primary/[0.08]">
            <span>
              {t.rich("diff.target", {
                type: selectedEntry
                  ? t(`entities.${selectedEntry.entityType}`)
                  : "",
                id: selectedEntry?.entityId ?? "",
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </span>
            <span>{t("diff.ip", { ip: selectedEntry?.ipAddress ?? "" })}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-accent-700 mb-1.5 flex items-center gap-1">
                <span>{t("diff.before")}</span>
              </h3>
              <pre
                dir="ltr"
                className="p-3.5 rounded-xl bg-primary-950 text-tertiary-100 font-mono text-xs overflow-x-auto max-h-72 text-left"
              >
                {selectedEntry?.beforeState
                  ? JSON.stringify(selectedEntry.beforeState, null, 2)
                  : `// ${t("diff.noBefore")}`}
              </pre>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-secondary-700 mb-1.5 flex items-center gap-1">
                <span>{t("diff.after")}</span>
              </h3>
              <pre
                dir="ltr"
                className="p-3.5 rounded-xl bg-primary-950 text-tertiary-100 font-mono text-xs overflow-x-auto max-h-72 text-left"
              >
                {selectedEntry?.afterState
                  ? JSON.stringify(selectedEntry.afterState, null, 2)
                  : `// ${t("diff.noAfter")}`}
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
              {tCommon("close")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
