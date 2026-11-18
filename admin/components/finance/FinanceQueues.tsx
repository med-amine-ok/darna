"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  approveAdjustment,
  approveTopup,
  listAdjustments,
  listInventoryConflicts,
  listInvoices,
  listOutbox,
  listRefunds,
  listTopups,
  rejectAdjustment,
  rejectTopup,
  requestAdjustment,
  resolveInventoryConflict,
  retryOutbox,
  settleRefund,
} from "@/lib/actions/finance";
import { unwrap } from "@/lib/actions/result";
import type {
  AdjustmentRow,
  ConflictRow,
  InvoiceRow,
  OutboxRow,
  RefundRow,
  TopupRow,
} from "@/lib/data/finance";
import type { HostWallet } from "@/lib/types";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { StatusPill, type StatusVariant } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDzd } from "@/lib/utils/format";

/**
 * Finance queues on the ledger API: top-ups (four-eyes), wallet adjustments,
 * refunds hosts owe guests, commission invoices and sync health (inventory
 * conflicts, outbox). Each panel loads its own page through server actions.
 */

const PAGE_SIZE = 10;

const tableCls = "w-full text-xs text-start";
const theadCls =
  "bg-darnaBg-100 text-primary-600 [&_th]:whitespace-nowrap font-semibold border-b border-primary/[0.08]";
const thCls = "py-3 px-4 text-start";
const tdCls = "py-3 px-4";
const selectCls =
  "text-xs rounded-xl bg-white border border-primary/[0.12] p-2 text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] cursor-pointer shadow-2xs hover:border-primary/25";
const fieldCls =
  "w-full rounded-xl bg-white border border-primary/[0.12] p-2.5 text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] shadow-2xs hover:border-primary/25";

const APPROVAL_VARIANT: Record<string, StatusVariant> = {
  pending_approval: "warning",
  approved: "success",
  rejected: "danger",
};
const REFUND_VARIANT: Record<string, StatusVariant> = {
  open: "warning",
  declared: "info",
  disputed: "danger",
  settled: "success",
};

interface Page<T> {
  rows: T[];
  total: number;
}

/** Loads one page of a list action; keeps loading and error states honest. */
function usePagedList<T>(load: (page: number) => Promise<Page<T>>) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<T>>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load(page));
      setFailed(null);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : String(err));
      setData({ rows: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [load, page]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { page, setPage, data, loading, failed, reload };
}

function Section({ title, hint, actions, children }: { title: string; hint: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 space-y-4 shadow-e1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-primary text-base">{title}</h3>
          <p className="text-xs text-neutral-500 mt-1">{hint}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function ListState({ loading, failed, empty, colSpan, emptyTitle }: { loading: boolean; failed: string | null; empty: boolean; colSpan: number; emptyTitle: string }) {
  const t = useTranslations("financeApi");
  const tCommon = useTranslations("common");
  if (!empty) return null;
  return (
    <tr>
      <td colSpan={colSpan}>
        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-500" role="status" aria-live="polite">{tCommon("loading")}</div>
        ) : failed ? (
          <EmptyState size="compact" title={t("loadFailed")} description={failed} />
        ) : (
          <EmptyState size="compact" title={emptyTitle} />
        )}
      </td>
    </tr>
  );
}

function StatusSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  const t = useTranslations("financeApi");
  return (
    <select aria-label={t("statusFilter")} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      <option value="all">{t("all")}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------- top-ups

export function TopupsPanel({ locale, onChanged }: { locale: string; onChanged?: () => void }) {
  const t = useTranslations("financeApi");
  const tPay = useTranslations("payments");
  const tActions = useTranslations("actions");
  const { success, error } = useToast();
  const can = useCan();
  const [status, setStatus] = useState("pending_approval");
  const [toReject, setToReject] = useState<TopupRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (page: number) => unwrap(await listTopups({ status, page, pageSize: PAGE_SIZE })),
    [status],
  );
  const list = usePagedList<TopupRow>(load);

  const approve = async (row: TopupRow) => {
    setBusyId(row.id);
    try {
      unwrap(await approveTopup(row.id));
      success(t("topups.approved"), formatDzd(row.amountDzd, locale));
      onChanged?.();
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
      list.reload();
    }
  };

  return (
    <Section
      title={t("topups.title")}
      hint={t("topups.hint")}
      actions={
        <StatusSelect
          value={status}
          onChange={(v) => {
            setStatus(v);
            list.setPage(1);
          }}
          options={["pending_approval", "approved", "rejected"].map((s) => ({ value: s, label: t(`approvalStatus.${s}`) }))}
        />
      }
    >
      <div className="relative overflow-x-auto">
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th scope="col" className={thCls}>{t("cols.created")}</th>
              <th scope="col" className={thCls}>{t("adjust.host")}</th>
              <th scope="col" className={thCls}>{t("cols.receipt")}</th>
              <th scope="col" className={`${thCls} text-end`}>{tPay("cols.amount")}</th>
              <th scope="col" className={thCls}>{t("cols.requestedBy")}</th>
              <th scope="col" className={thCls}>{t("statusFilter")}</th>
              <th scope="col" className={`${thCls} text-end`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/[0.06]">
            <ListState loading={list.loading} failed={list.failed} empty={list.data.rows.length === 0} colSpan={7} emptyTitle={t("topups.empty")} />
            {list.data.rows.map((row) => (
              <tr key={row.id} className="hover:bg-darnaBg-100">
                <td className={`${tdCls} tabular-nums text-neutral-500 whitespace-nowrap`}>{formatDate(row.createdAt, locale)}</td>
                <td className={`${tdCls} font-semibold text-primary`}>{row.hostName}</td>
                <td className={`${tdCls} text-neutral-600`}>
                  <div>{t(`methods.${row.method}` as "methods.ccp_transfer")}</div>
                  <div className="font-mono text-[11px] text-neutral-500" dir="ltr">{row.receiptReference}</div>
                </td>
                <td className={`${tdCls} tabular-nums font-semibold text-end text-primary whitespace-nowrap`} dir="ltr">{formatDzd(row.amountDzd, locale)}</td>
                <td className={`${tdCls} text-neutral-600`}>{row.requestedBy}</td>
                <td className={tdCls}>
                  <StatusPill label={t(`approvalStatus.${row.status}`)} variant={APPROVAL_VARIANT[row.status] ?? "neutral"} />
                  {row.rejectionReason && <div className="text-[11px] text-neutral-500 mt-1 max-w-[220px]">{row.rejectionReason}</div>}
                </td>
                <td className={`${tdCls} text-end`}>
                  {row.status === "pending_approval" && can("wallets.recharge") ? (
                    row.ownRequest ? (
                      <span className="text-[11px] text-neutral-500">{t("ownRequest")}</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" disabled={busyId === row.id} onClick={() => approve(row)}>
                          {t("approve")}
                        </Button>
                        <Button variant="dangerOutline" size="sm" onClick={() => setToReject(row)}>
                          {t("reject")}
                        </Button>
                      </div>
                    )
                  ) : row.approvedAt ? (
                    <span className="text-[11px] text-neutral-500">
                      {formatDate(row.approvedAt, locale)}
                      {row.approvedBy ? ` ${row.approvedBy}` : ""}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={list.page}
        totalPages={Math.max(1, Math.ceil(list.data.total / PAGE_SIZE))}
        totalItems={list.data.total}
        pageSize={PAGE_SIZE}
        onPageChange={list.setPage}
      />
      <ReasonDialog
        isOpen={!!toReject}
        title={t("topups.rejectTitle")}
        description={
          toReject
            ? `${t("topups.rejectDesc", { amount: formatDzd(toReject.amountDzd, locale), host: toReject.hostName })} ${t("rejectHint")}`
            : undefined
        }
        confirmLabel={t("reject")}
        onCancel={() => setToReject(null)}
        onConfirm={async (reason) => {
          if (!toReject) return;
          try {
            unwrap(await rejectTopup(toReject.id, reason));
            success(t("topups.rejected"));
            setToReject(null);
            list.reload();
            onChanged?.();
          } catch (err) {
            error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </Section>
  );
}

// ------------------------------------------------------------ adjustments

export function AdjustmentsPanel({ locale, wallets, onChanged }: { locale: string; wallets: HostWallet[]; onChanged?: () => void }) {
  const t = useTranslations("financeApi");
  const tActions = useTranslations("actions");
  const { success, error } = useToast();
  const can = useCan();
  const [status, setStatus] = useState("pending_approval");
  const [toReject, setToReject] = useState<AdjustmentRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hostId, setHostId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (page: number) => unwrap(await listAdjustments({ status, page, pageSize: PAGE_SIZE })),
    [status],
  );
  const list = usePagedList<AdjustmentRow>(load);

  const parsedAmount = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isInteger(parsedAmount) && parsedAmount !== 0;
  const formValid = !!hostId && amountValid && reason.trim().length >= 10;

  const approve = async (row: AdjustmentRow) => {
    setBusyId(row.id);
    try {
      unwrap(await approveAdjustment(row.id));
      success(t("adjust.approved"), formatDzd(row.amountDzd, locale));
      onChanged?.();
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
      list.reload();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    setSubmitting(true);
    try {
      unwrap(await requestAdjustment({ hostId, amount: parsedAmount, reason: reason.trim() }));
      success(t("adjust.done"), formatDzd(parsedAmount, locale));
      setDialogOpen(false);
      setAmount("");
      setReason("");
      list.reload();
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section
      title={t("adjust.title")}
      hint={t("adjust.hint")}
      actions={
        <>
          <StatusSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              list.setPage(1);
            }}
            options={["pending_approval", "approved", "rejected"].map((s) => ({ value: s, label: t(`approvalStatus.${s}`) }))}
          />
          {can("ledger.adjust") && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setHostId(wallets[0]?.hostId ?? "");
                setDialogOpen(true);
              }}
              disabled={wallets.length === 0}
            >
              {t("adjust.request")}
            </Button>
          )}
        </>
      }
    >
      <div className="relative overflow-x-auto">
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th scope="col" className={thCls}>{t("cols.created")}</th>
              <th scope="col" className={thCls}>{t("adjust.host")}</th>
              <th scope="col" className={`${thCls} text-end`}>{t("adjust.amount")}</th>
              <th scope="col" className={thCls}>{t("cols.reason")}</th>
              <th scope="col" className={thCls}>{t("statusFilter")}</th>
              <th scope="col" className={`${thCls} text-end`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/[0.06]">
            <ListState loading={list.loading} failed={list.failed} empty={list.data.rows.length === 0} colSpan={6} emptyTitle={t("adjust.empty")} />
            {list.data.rows.map((row) => (
              <tr key={row.id} className="hover:bg-darnaBg-100">
                <td className={`${tdCls} tabular-nums text-neutral-500 whitespace-nowrap`}>{formatDate(row.createdAt, locale)}</td>
                <td className={`${tdCls} font-semibold text-primary`}>{row.hostName}</td>
                <td className={`${tdCls} tabular-nums font-semibold text-end whitespace-nowrap ${row.amountDzd >= 0 ? "text-secondary-700" : "text-accent-700"}`} dir="ltr">
                  {row.amountDzd >= 0 ? "+" : ""}
                  {formatDzd(row.amountDzd, locale)}
                </td>
                <td className={`${tdCls} text-neutral-600 max-w-[280px]`}>{row.reason}</td>
                <td className={tdCls}>
                  <StatusPill label={t(`approvalStatus.${row.status}`)} variant={APPROVAL_VARIANT[row.status] ?? "neutral"} />
                  {row.rejectionReason && <div className="text-[11px] text-neutral-500 mt-1 max-w-[220px]">{row.rejectionReason}</div>}
                </td>
                <td className={`${tdCls} text-end`}>
                  {row.status === "pending_approval" && can("ledger.adjust") ? (
                    row.ownRequest ? (
                      <span className="text-[11px] text-neutral-500">{t("ownRequest")}</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" disabled={busyId === row.id} onClick={() => approve(row)}>
                          {t("approve")}
                        </Button>
                        <Button variant="dangerOutline" size="sm" onClick={() => setToReject(row)}>
                          {t("reject")}
                        </Button>
                      </div>
                    )
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={list.page}
        totalPages={Math.max(1, Math.ceil(list.data.total / PAGE_SIZE))}
        totalItems={list.data.total}
        pageSize={PAGE_SIZE}
        onPageChange={list.setPage}
      />

      <ReasonDialog
        isOpen={!!toReject}
        title={t("adjust.rejectTitle")}
        description={t("rejectHint")}
        confirmLabel={t("reject")}
        onCancel={() => setToReject(null)}
        onConfirm={async (why) => {
          if (!toReject) return;
          try {
            unwrap(await rejectAdjustment(toReject.id, why));
            success(t("adjust.rejected"));
            setToReject(null);
            list.reload();
          } catch (err) {
            error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
          }
        }}
      />

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title={t("adjust.dialogTitle")} description={t("adjust.dialogDesc")}>
        <form onSubmit={submit} className="space-y-4 text-xs text-start">
          <div>
            <label className="block font-semibold text-primary mb-1" htmlFor="adjust-host">{t("adjust.host")}</label>
            <select id="adjust-host" value={hostId} onChange={(e) => setHostId(e.target.value)} className={`${fieldCls} font-semibold`}>
              {wallets.map((w) => (
                <option key={w.hostId} value={w.hostId}>{w.businessName || w.ownerName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-primary mb-1" htmlFor="adjust-amount">{t("adjust.amount")}</label>
            <input
              id="adjust-amount"
              type="number"
              step={1}
              inputMode="numeric"
              required
              aria-invalid={amount !== "" && !amountValid}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldCls} font-mono font-semibold`}
            />
            {amount !== "" && !amountValid && (
              <p className="mt-1 text-[11px] text-accent-700" role="alert">{t("adjust.invalidAmount")}</p>
            )}
          </div>
          <div>
            <label className="block font-semibold text-primary mb-1" htmlFor="adjust-reason">{t("adjust.reason")}</label>
            <textarea
              id="adjust-reason"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{tActions("cancel")}</Button>
            <Button type="submit" variant="primary" disabled={submitting || !formValid}>{t("adjust.submit")}</Button>
          </div>
        </form>
      </Dialog>
    </Section>
  );
}

// ---------------------------------------------------------------- refunds

export function RefundsPanel({ locale, title, onTotal }: { locale: string; title: string; onTotal?: (total: number) => void }) {
  const t = useTranslations("financeApi");
  const tPay = useTranslations("payments");
  const tActions = useTranslations("actions");
  const { success, error } = useToast();
  const can = useCan();
  const [status, setStatus] = useState("all");
  const [overdue, setOverdue] = useState(false);
  const [toSettle, setToSettle] = useState<RefundRow | null>(null);

  const load = useCallback(
    async (page: number) => unwrap(await listRefunds({ status, overdue, page, pageSize: PAGE_SIZE })),
    [status, overdue],
  );
  const list = usePagedList<RefundRow>(load);
  useEffect(() => {
    onTotal?.(list.data.total);
  }, [list.data.total, onTotal]);

  return (
    <Section
      title={title}
      hint={t("refunds.hint")}
      actions={
        <>
          <StatusSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              list.setPage(1);
            }}
            options={["open", "declared", "disputed", "settled"].map((s) => ({ value: s, label: t(`refunds.status.${s}`) }))}
          />
          <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(e) => {
                setOverdue(e.target.checked);
                list.setPage(1);
              }}
            />
            {t("refunds.overdueOnly")}
          </label>
        </>
      }
    >
      <div className="relative overflow-x-auto">
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th scope="col" className={thCls}>{tPay("cols.date")}</th>
              <th scope="col" className={thCls}>{tPay("cols.booking")}</th>
              <th scope="col" className={thCls}>{tPay("cols.host")}</th>
              <th scope="col" className={`${thCls} text-end`}>{t("cols.amountOwed")}</th>
              <th scope="col" className={thCls}>{t("cols.dueAt")}</th>
              <th scope="col" className={thCls}>{tPay("cols.status")}</th>
              <th scope="col" className={`${thCls} text-end`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/[0.06]">
            <ListState loading={list.loading} failed={list.failed} empty={list.data.rows.length === 0} colSpan={7} emptyTitle={tPay("noRefunds")} />
            {list.data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-darnaBg-100">
                <td className={`${tdCls} tabular-nums text-neutral-500 whitespace-nowrap`}>{formatDate(r.date, locale)}</td>
                <td className={`${tdCls} tabular-nums font-semibold text-primary whitespace-nowrap`}>{r.reference}</td>
                <td className={`${tdCls} text-neutral-600`}>{r.hostName || "-"}</td>
                <td className={`${tdCls} tabular-nums font-semibold text-end text-accent-700 whitespace-nowrap`} dir="ltr">{formatDzd(r.amountDzd, locale)}</td>
                <td className={`${tdCls} tabular-nums text-neutral-600 whitespace-nowrap`}>
                  {r.dueAt ? formatDate(r.dueAt, locale) : "-"}
                  {r.isOverdue && <span className="ms-1.5 text-[11px] font-semibold text-accent-700">{t("refunds.overdue")}</span>}
                </td>
                <td className={tdCls}>
                  <StatusPill label={t(`refunds.status.${r.status}`)} variant={REFUND_VARIANT[r.status] ?? "neutral"} />
                  {r.paymentReference && <div className="font-mono text-[11px] text-neutral-500 mt-1" dir="ltr">{r.paymentReference}</div>}
                </td>
                <td className={`${tdCls} text-end`}>
                  {r.status !== "settled" && can("bookings.refund") && (
                    <Button variant="outline" size="sm" onClick={() => setToSettle(r)}>
                      {t("refunds.settle")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={list.page}
        totalPages={Math.max(1, Math.ceil(list.data.total / PAGE_SIZE))}
        totalItems={list.data.total}
        pageSize={PAGE_SIZE}
        itemLabel={tPay("itemLabels.refunds")}
        onPageChange={list.setPage}
      />
      <ReasonDialog
        isOpen={!!toSettle}
        variant="primary"
        title={t("refunds.settleTitle")}
        description={toSettle ? t("refunds.settleDesc", { amount: formatDzd(toSettle.amountDzd, locale), reference: toSettle.reference }) : undefined}
        confirmLabel={t("refunds.settle")}
        onCancel={() => setToSettle(null)}
        onConfirm={async (note) => {
          if (!toSettle) return;
          try {
            unwrap(await settleRefund(toSettle.id, note));
            success(t("refunds.settled"));
            setToSettle(null);
            list.reload();
          } catch (err) {
            error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </Section>
  );
}

// --------------------------------------------------------------- invoices

export function InvoicesPanel({ locale }: { locale: string }) {
  const t = useTranslations("financeApi");
  const load = useCallback(async (page: number) => unwrap(await listInvoices({ page, pageSize: PAGE_SIZE })), []);
  const list = usePagedList<InvoiceRow>(load);

  return (
    <Section title={t("invoices.title")} hint={t("invoices.hint")}>
      <div className="relative overflow-x-auto">
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th scope="col" className={thCls}>{t("cols.number")}</th>
              <th scope="col" className={thCls}>{t("adjust.host")}</th>
              <th scope="col" className={thCls}>{t("cols.period")}</th>
              <th scope="col" className={`${thCls} text-end`}>{t("cols.amountHt")}</th>
              <th scope="col" className={`${thCls} text-end`}>{t("cols.vat")}</th>
              <th scope="col" className={`${thCls} text-end`}>{t("cols.amountTtc")}</th>
              <th scope="col" className={thCls}>{t("statusFilter")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/[0.06]">
            <ListState loading={list.loading} failed={list.failed} empty={list.data.rows.length === 0} colSpan={7} emptyTitle={t("invoices.empty")} />
            {list.data.rows.map((i) => (
              <tr key={i.id} className="hover:bg-darnaBg-100">
                <td className={`${tdCls} font-mono font-semibold text-primary whitespace-nowrap`} dir="ltr">{i.number}</td>
                <td className={`${tdCls} text-neutral-600`}>{i.hostName || "-"}</td>
                <td className={`${tdCls} tabular-nums text-neutral-600 whitespace-nowrap`}>
                  {formatDate(i.periodStart, locale)} - {formatDate(i.periodEnd, locale)}
                </td>
                <td className={`${tdCls} tabular-nums text-end whitespace-nowrap`} dir="ltr">{formatDzd(i.amountHtDzd, locale)}</td>
                <td className={`${tdCls} tabular-nums text-end whitespace-nowrap`} dir="ltr">{formatDzd(i.vatDzd, locale)}</td>
                <td className={`${tdCls} tabular-nums font-semibold text-end whitespace-nowrap`} dir="ltr">{formatDzd(i.amountTtcDzd, locale)}</td>
                <td className={tdCls}>
                  <StatusPill status={i.status === "cancelled" ? "cancelled" : "active"} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={list.page}
        totalPages={Math.max(1, Math.ceil(list.data.total / PAGE_SIZE))}
        totalItems={list.data.total}
        pageSize={PAGE_SIZE}
        onPageChange={list.setPage}
      />
    </Section>
  );
}

// ------------------------------------------------------------ sync health

export function SyncPanel({ locale }: { locale: string }) {
  const t = useTranslations("financeApi");
  const tActions = useTranslations("actions");
  const { success, error } = useToast();
  const can = useCan();
  const [conflictStatus, setConflictStatus] = useState("open");
  const [outboxStatus, setOutboxStatus] = useState("dead");
  const [toResolve, setToResolve] = useState<ConflictRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadConflicts = useCallback(
    async (page: number) => unwrap(await listInventoryConflicts({ status: conflictStatus, page, pageSize: PAGE_SIZE })),
    [conflictStatus],
  );
  const conflicts = usePagedList<ConflictRow>(loadConflicts);
  const loadOutbox = useCallback(
    async (page: number) => unwrap(await listOutbox({ status: outboxStatus, page, pageSize: PAGE_SIZE })),
    [outboxStatus],
  );
  const outbox = usePagedList<OutboxRow>(loadOutbox);

  const retry = async (row: OutboxRow) => {
    setBusyId(row.id);
    try {
      unwrap(await retryOutbox(row.id));
      success(t("sync.retried"));
    } catch (err) {
      error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
      outbox.reload();
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title={t("sync.conflictsTitle")}
        hint={t("sync.conflictsHint")}
        actions={
          <StatusSelect
            value={conflictStatus}
            onChange={(v) => {
              setConflictStatus(v);
              conflicts.setPage(1);
            }}
            options={["open", "resolved"].map((s) => ({ value: s, label: s }))}
          />
        }
      >
        <div className="relative overflow-x-auto">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th scope="col" className={thCls}>{t("cols.night")}</th>
                <th scope="col" className={thCls}>{t("cols.roomType")}</th>
                <th scope="col" className={`${thCls} text-end`}>{t("cols.sold")}</th>
                <th scope="col" className={`${thCls} text-end`}>{t("cols.external")}</th>
                <th scope="col" className={thCls}>{t("cols.source")}</th>
                <th scope="col" className={thCls}>{t("statusFilter")}</th>
                <th scope="col" className={`${thCls} text-end`} />
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.06]">
              <ListState loading={conflicts.loading} failed={conflicts.failed} empty={conflicts.data.rows.length === 0} colSpan={7} emptyTitle={t("sync.conflictsEmpty")} />
              {conflicts.data.rows.map((c) => (
                <tr key={c.id} className="hover:bg-darnaBg-100">
                  <td className={`${tdCls} tabular-nums whitespace-nowrap`}>{formatDate(c.night, locale)}</td>
                  <td className={`${tdCls} font-semibold text-primary`}>{c.roomTypeName}</td>
                  <td className={`${tdCls} tabular-nums text-end`}>{c.sold}</td>
                  <td className={`${tdCls} tabular-nums text-end`}>{c.externalTotal}</td>
                  <td className={`${tdCls} text-neutral-600`}>{c.source}</td>
                  <td className={tdCls}>
                    <StatusPill label={c.status} variant={c.status === "open" ? "warning" : "success"} size="sm" />
                    {c.resolutionNote && <div className="text-[11px] text-neutral-500 mt-1 max-w-[220px]">{c.resolutionNote}</div>}
                  </td>
                  <td className={`${tdCls} text-end`}>
                    {c.status === "open" && can("settings.manage") && (
                      <Button variant="outline" size="sm" onClick={() => setToResolve(c)}>{t("sync.resolve")}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={conflicts.page}
          totalPages={Math.max(1, Math.ceil(conflicts.data.total / PAGE_SIZE))}
          totalItems={conflicts.data.total}
          pageSize={PAGE_SIZE}
          onPageChange={conflicts.setPage}
        />
      </Section>

      <Section
        title={t("sync.outboxTitle")}
        hint={t("sync.outboxHint")}
        actions={
          <StatusSelect
            value={outboxStatus}
            onChange={(v) => {
              setOutboxStatus(v);
              outbox.setPage(1);
            }}
            options={["pending", "sent", "dead"].map((s) => ({ value: s, label: s }))}
          />
        }
      >
        <div className="relative overflow-x-auto">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th scope="col" className={thCls}>{t("cols.created")}</th>
                <th scope="col" className={thCls}>{t("cols.topic")}</th>
                <th scope="col" className={`${thCls} text-end`}>{t("cols.attempts")}</th>
                <th scope="col" className={thCls}>{t("cols.lastError")}</th>
                <th scope="col" className={thCls}>{t("statusFilter")}</th>
                <th scope="col" className={`${thCls} text-end`} />
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.06]">
              <ListState loading={outbox.loading} failed={outbox.failed} empty={outbox.data.rows.length === 0} colSpan={6} emptyTitle={t("sync.outboxEmpty")} />
              {outbox.data.rows.map((m) => (
                <tr key={m.id} className="hover:bg-darnaBg-100">
                  <td className={`${tdCls} tabular-nums text-neutral-500 whitespace-nowrap`}>{formatDate(m.createdAt, locale)}</td>
                  <td className={`${tdCls} font-mono text-primary`} dir="ltr">{m.topic}</td>
                  <td className={`${tdCls} tabular-nums text-end`}>{m.attempts}</td>
                  <td className={`${tdCls} text-neutral-600 max-w-[320px] truncate`} title={m.lastError}>{m.lastError || "-"}</td>
                  <td className={tdCls}>
                    <StatusPill label={m.status} variant={m.status === "dead" ? "danger" : m.status === "sent" ? "success" : "info"} size="sm" />
                  </td>
                  <td className={`${tdCls} text-end`}>
                    {m.status === "dead" && can("settings.manage") && (
                      <Button variant="outline" size="sm" disabled={busyId === m.id} onClick={() => retry(m)}>{t("sync.retry")}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={outbox.page}
          totalPages={Math.max(1, Math.ceil(outbox.data.total / PAGE_SIZE))}
          totalItems={outbox.data.total}
          pageSize={PAGE_SIZE}
          onPageChange={outbox.setPage}
        />
      </Section>

      <ReasonDialog
        isOpen={!!toResolve}
        variant="primary"
        title={t("sync.resolveTitle")}
        description={t("sync.resolveDesc")}
        confirmLabel={t("sync.resolve")}
        onCancel={() => setToResolve(null)}
        onConfirm={async (note) => {
          if (!toResolve) return;
          try {
            unwrap(await resolveInventoryConflict(toResolve.id, note));
            success(t("sync.resolved"));
            setToResolve(null);
            conflicts.reload();
          } catch (err) {
            error(tActions("actionFailed"), err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </div>
  );
}
