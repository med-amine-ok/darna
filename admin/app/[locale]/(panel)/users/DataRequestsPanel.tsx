"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { completeDataRequest } from "@/lib/actions/users";
import { unwrap } from "@/lib/actions/result";
import { formatDate } from "@/lib/utils/format";
import type { DataRequest } from "@/lib/types";

/** Data protection requests (access, deletion...) with their legal deadline (BR-PRV-02). */
export default function DataRequestsPanel({ initialRows }: { initialRows: DataRequest[] }) {
  const t = useTranslations("users.dataRequests");
  const locale = useLocale();
  const { success, error } = useToast();
  const [rows, setRows] = useState(initialRows);
  const [target, setTarget] = useState<{ row: DataRequest; outcome: "completed" | "rejected" } | null>(null);

  const close = async (notes: string) => {
    if (!target) return;
    try {
      const updated = unwrap(await completeDataRequest(target.row.id, target.outcome, notes));
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setTarget(null);
      success(t("closed"));
    } catch (e) {
      error(t("closeFailed"), e instanceof Error ? e.message : String(e));
      throw e;
    }
  };

  const kindLabel = (kind: string) => (t.has(`kinds.${kind}`) ? t(`kinds.${kind}`) : kind);
  const statusLabel = (status: string) => (t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status);

  return (
    <section className="bg-white rounded-2xl shadow-e1 p-4 sm:p-6 space-y-3" aria-labelledby="data-requests-title">
      <div>
        <h2 id="data-requests-title" className="font-serif text-lg text-primary-900">
          {t("title")}
        </h2>
        <p className="text-xs text-primary-600">{t("subtitle")}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="divide-y divide-primary/[0.06] text-xs">
          {rows.map((row) => {
            const open = row.status !== "completed" && row.status !== "rejected";
            return (
              <li key={row.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary">
                    {row.userName || row.userId} · {kindLabel(row.kind)}
                  </p>
                  <p className="text-[11px] text-primary-600">
                    {t("meta", {
                      created: formatDate(row.createdAt, locale),
                      due: row.dueAt ? formatDate(row.dueAt, locale) : "-",
                      status: statusLabel(row.status),
                    })}
                  </p>
                  {row.notes && <p className="text-[11px] text-primary-700 whitespace-pre-line mt-1">{row.notes}</p>}
                </div>
                {open && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="primary" onClick={() => setTarget({ row, outcome: "completed" })}>
                      {t("complete")}
                    </Button>
                    <Button size="sm" variant="dangerOutline" onClick={() => setTarget({ row, outcome: "rejected" })}>
                      {t("reject")}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ReasonDialog
        isOpen={!!target}
        title={target?.outcome === "rejected" ? t("reject") : t("complete")}
        description={target?.row.kind === "deletion" && target.outcome === "completed" ? t("deletionWarning") : undefined}
        confirmLabel={target?.outcome === "rejected" ? t("reject") : t("complete")}
        variant={target?.outcome === "rejected" ? "danger" : "primary"}
        onCancel={() => setTarget(null)}
        onConfirm={close}
      />
    </section>
  );
}
