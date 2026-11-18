"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { useToast } from "@/components/ui/Toast";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { approveDocument, getDocumentUrl, rejectDocument, setCreditLimit } from "@/lib/actions/hosts";
import { unwrap } from "@/lib/actions/result";
import { formatDate, formatDzd } from "@/lib/utils/format";
import type { HostDocument } from "@/lib/types";

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Documents of one host: signed 5-minute view link, approve and reject (BR-HST-03, BR-MED-02). */
export function HostDocumentsList({ documents }: { documents: HostDocument[] }) {
  const t = useTranslations("hostDetail");
  const tActions = useTranslations("actions");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const can = useCan();
  const { success, error } = useToast();
  const [docs, setDocs] = useState(documents);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const open = async (doc: HostDocument) => {
    const win = window.open("", "_blank", "noopener,noreferrer");
    try {
      const res = unwrap(await getDocumentUrl(doc.id));
      if (win) win.location.href = res.url;
      else window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      win?.close();
      error(tActions("actionFailed"), errMsg(err));
    }
  };

  const review = async (docId: string, approve: boolean, reason?: string) => {
    try {
      const res = unwrap(approve ? await approveDocument(docId) : await rejectDocument(docId, reason ?? ""));
      setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, status: res.status as HostDocument["status"] } : d)));
      setRejecting(null);
      success(tStatus.has(res.status) ? tStatus(res.status) : res.status);
    } catch (err) {
      error(tActions("actionFailed"), errMsg(err));
      throw err;
    }
  };

  if (docs.length === 0) {
    return <p className="text-xs text-primary-600">{t("noDocuments")}</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {docs.map((doc) => (
          <li key={doc.id} className="p-3.5 rounded-2xl bg-darnaBg-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
              <div>
                <span className="font-semibold text-primary block">{doc.title}</span>
                <span className="text-[11px] text-primary-600">
                  {t("uploaded", { date: formatDate(doc.uploadedAt, locale) })} ·{" "}
                  {tStatus.has(doc.status) ? tStatus(doc.status) : doc.status}
                </span>
                {doc.rejectionReason && <span className="block text-[11px] text-accent-700">{doc.rejectionReason}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {doc.status === "pending" && can("hosts.approve") && (
                <Button size="sm" variant="primary" onClick={() => review(doc.id, true).catch(() => undefined)}>
                  {t("approveDocument")}
                </Button>
              )}
              {doc.status === "pending" && can("hosts.reject") && (
                <Button size="sm" variant="dangerOutline" onClick={() => setRejecting(doc.id)}>
                  {tActions("reject")}
                </Button>
              )}
              <button
                type="button"
                onClick={() => open(doc)}
                disabled={!can("kyc.view_documents")}
                aria-label={t("viewFileLabel", { title: doc.title })}
                className="px-3 py-1 rounded-lg border border-primary/[0.08] text-xs font-semibold hover:bg-white transition shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                {t("viewFile")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ReasonDialog
        isOpen={!!rejecting}
        title={tActions("reject")}
        confirmLabel={tActions("reject")}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => (rejecting ? review(rejecting, false, reason) : undefined)}
      />
    </>
  );
}

/** The host's own credit floor (how far below zero the wallet may go, BR-PAY-10). */
export function CreditLimitForm({ hostId, currentDzd }: { hostId: string; currentDzd: number }) {
  const t = useTranslations("hostDetail");
  const tActions = useTranslations("actions");
  const locale = useLocale();
  const can = useCan();
  const { success, error } = useToast();
  const [amount, setAmount] = useState<number>(Math.abs(currentDzd));
  const [current, setCurrent] = useState(currentDzd);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      unwrap(await setCreditLimit(hostId, amount, reason));
      setCurrent(amount);
      setReason("");
      success(t("creditLimitSaved"));
    } catch (err) {
      error(tActions("actionFailed"), errMsg(err));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-2 text-xs">
      <p className="text-primary-600">
        {t("creditLimitCurrent", { amount: formatDzd(current, locale) })}
      </p>
      {can("hosts.commission_override") && (
        <>
          <label className="block font-semibold text-primary-700" htmlFor={`credit-${hostId}`}>
            {t("creditLimitLabel")}
          </label>
          <input
            id={`credit-${hostId}`}
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full p-2 rounded-xl border border-primary/[0.12] text-sm font-mono text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          />
          <label className="block font-semibold text-primary-700" htmlFor={`credit-reason-${hostId}`}>
            {tActions("reasonLabel")}
          </label>
          <textarea
            id={`credit-reason-${hostId}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tActions("reasonPlaceholder")}
            className="w-full p-2 rounded-xl border border-primary/[0.12] text-xs text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          />
          <Button size="sm" variant="primary" onClick={save} isLoading={busy} disabled={amount < 1 || reason.trim().length < 10}>
            {t("creditLimitSave")}
          </Button>
        </>
      )}
    </div>
  );
}
