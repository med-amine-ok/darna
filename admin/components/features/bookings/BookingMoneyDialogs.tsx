"use client";

import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { formatDzd } from "@/lib/utils/format";
import { MIN_REASON_LENGTH, refundableAmount, refundedSoFar } from "@/lib/domain/transitions";
import type { Booking, DisputeOutcome } from "@/lib/types";

type RefundableBooking = Pick<
  Booking,
  "reference" | "status" | "paymentStatus" | "totalAmountDzd" | "refundedAmountDzd"
>;

const fieldCls =
  "w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary focus-visible:ring-2 focus-visible:ring-accent-600/40 aria-[invalid=true]:border-accent-700";

function AmountBreakdown({ booking }: { booking: RefundableBooking }) {
  const t = useTranslations("bookingOps");
  const locale = useLocale();
  return (
    <dl className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-darnaBg/50 border border-tertiary/40 text-[11px]">
      <div>
        <dt className="text-neutral-500">{t("total")}</dt>
        <dd className="font-mono font-bold text-primary" dir="ltr">{formatDzd(booking.totalAmountDzd, locale)}</dd>
      </div>
      <div>
        <dt className="text-neutral-500">{t("alreadyRefunded")}</dt>
        <dd className="font-mono font-bold text-primary" dir="ltr">{formatDzd(refundedSoFar(booking), locale)}</dd>
      </div>
      <div>
        <dt className="text-neutral-500">{t("refundable")}</dt>
        <dd className="font-mono font-bold text-primary" dir="ltr">{formatDzd(refundableAmount(booking), locale)}</dd>
      </div>
    </dl>
  );
}

/** Validates a refund amount on the client with the same rule as the server. */
function amountError(raw: string, max: number, strictlyBelowMax: boolean): boolean {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return true;
  return strictlyBelowMax ? n >= max : n > max;
}

// --------------------------------------------------------------- refund

export function RefundDialog({
  booking,
  onCancel,
  onConfirm,
}: {
  booking: RefundableBooking | null;
  onCancel: () => void;
  onConfirm: (amount: number, reason: string) => Promise<void>;
}) {
  const t = useTranslations("bookingOps");
  const tActions = useTranslations("actions");
  const locale = useLocale();
  const max = booking ? refundableAmount(booking) : 0;
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking) {
      setAmount(String(refundableAmount(booking)));
      setReason("");
    }
  }, [booking]);

  const invalidAmount = amountError(amount, max, false);
  const invalidReason = reason.trim().length < MIN_REASON_LENGTH;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidAmount || invalidReason || busy) return;
    setBusy(true);
    try {
      await onConfirm(Number(amount), reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      isOpen={!!booking}
      onClose={onCancel}
      title={t("refundTitle", { reference: booking?.reference ?? "" })}
      description={t("refundDescription")}
      maxWidth="sm"
    >
      {booking && (
        <form onSubmit={submit} className="space-y-3 text-xs text-start">
          <AmountBreakdown booking={booking} />
          <div>
            <label htmlFor="refund-amount" className="block font-bold text-primary mb-1">
              {t("refundAmount")}
            </label>
            <input
              id="refund-amount"
              type="number"
              min={1}
              max={max}
              step={1}
              inputMode="numeric"
              required
              aria-invalid={invalidAmount}
              aria-describedby={invalidAmount && amount !== "" ? "refund-amount-error" : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldCls} font-mono font-bold`}
            />
            {invalidAmount && amount !== "" && (
              <p id="refund-amount-error" className="text-accent-700 text-[11px] mt-1" role="alert">
                {t("amountRange", { max: formatDzd(max, locale) })}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="refund-reason" className="block font-bold text-primary mb-1">
              {tActions("reasonLabel")}
            </label>
            <textarea
              id="refund-reason"
              rows={2}
              required
              minLength={MIN_REASON_LENGTH}
              aria-invalid={invalidReason && reason !== ""}
              aria-describedby="refund-reason-hint"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={fieldCls}
            />
            <p
              id="refund-reason-hint"
              className={`text-[11px] mt-1 ${invalidReason && reason !== "" ? "text-accent-700" : "text-neutral-500"}`}
            >
              {tActions("reasonTooShort", { min: MIN_REASON_LENGTH })}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
              {tActions("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={invalidAmount || invalidReason || busy} isLoading={busy}>
              {t("refundConfirm", { amount: invalidAmount ? "—" : formatDzd(Number(amount), locale) })}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// -------------------------------------------------------------- dispute

export function DisputeDialog({
  booking,
  canRefund,
  initialOutcome = "refund_full",
  onCancel,
  onConfirm,
}: {
  booking: RefundableBooking | null;
  /** Without bookings.refund the admin can only decline. */
  canRefund: boolean;
  initialOutcome?: DisputeOutcome;
  onCancel: () => void;
  onConfirm: (outcome: DisputeOutcome, note: string, amount?: number) => Promise<void>;
}) {
  const t = useTranslations("bookingOps");
  const tActions = useTranslations("actions");
  const locale = useLocale();
  const max = booking ? refundableAmount(booking) : 0;
  const [outcome, setOutcome] = useState<DisputeOutcome>(initialOutcome);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking) {
      setOutcome(canRefund && max > 0 ? initialOutcome : "declined");
      setAmount(String(Math.floor(refundableAmount(booking) / 2)));
      setNote("");
    }
  }, [booking, canRefund, initialOutcome, max]);

  const invalidAmount = outcome === "refund_partial" && amountError(amount, max, true);
  const invalidNote = note.trim().length < MIN_REASON_LENGTH;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidAmount || invalidNote || busy) return;
    setBusy(true);
    try {
      await onConfirm(outcome, note.trim(), outcome === "refund_partial" ? Number(amount) : undefined);
    } finally {
      setBusy(false);
    }
  };

  const options: { id: DisputeOutcome; disabled: boolean }[] = [
    { id: "refund_full", disabled: !canRefund || max <= 0 },
    { id: "refund_partial", disabled: !canRefund || max <= 1 },
    { id: "declined", disabled: false },
  ];

  return (
    <Dialog
      isOpen={!!booking}
      onClose={onCancel}
      title={t("disputeTitle", { reference: booking?.reference ?? "" })}
      description={t("disputeDescription")}
      maxWidth="sm"
    >
      {booking && (
        <form onSubmit={submit} className="space-y-3 text-xs text-start">
          <AmountBreakdown booking={booking} />
          <fieldset className="space-y-1.5">
            <legend className="font-bold text-primary mb-1">{t("outcome")}</legend>
            {options.map((o) => (
              <label
                key={o.id}
                className={`flex items-start gap-2 p-2 rounded-lg border ${
                  outcome === o.id ? "border-secondary bg-secondary/5" : "border-tertiary/50"
                } ${o.disabled ? "opacity-50" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="dispute-outcome"
                  value={o.id}
                  checked={outcome === o.id}
                  disabled={o.disabled}
                  onChange={() => setOutcome(o.id)}
                  className="mt-0.5 focus-visible:ring-2 focus-visible:ring-accent-600"
                />
                <span>
                  <span className="font-semibold text-primary block">{t(`outcomes.${o.id}`)}</span>
                  <span className="text-neutral-600">{t(`outcomeHints.${o.id}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {outcome === "refund_partial" && (
            <div>
              <label htmlFor="dispute-amount" className="block font-bold text-primary mb-1">
                {t("refundAmount")}
              </label>
              <input
                id="dispute-amount"
                type="number"
                min={1}
                max={Math.max(1, max - 1)}
                step={1}
                inputMode="numeric"
                aria-invalid={invalidAmount}
                aria-describedby={invalidAmount ? "dispute-amount-error" : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${fieldCls} font-mono font-bold`}
              />
              {invalidAmount && (
                <p id="dispute-amount-error" className="text-accent-700 text-[11px] mt-1" role="alert">
                  {t("partialRange", { max: formatDzd(max, locale) })}
                </p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="dispute-note" className="block font-bold text-primary mb-1">
              {t("resolutionNote")}
            </label>
            <textarea
              id="dispute-note"
              rows={2}
              required
              minLength={MIN_REASON_LENGTH}
              aria-invalid={invalidNote && note !== ""}
              aria-describedby="dispute-note-hint"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={fieldCls}
            />
            <p
              id="dispute-note-hint"
              className={`text-[11px] mt-1 ${invalidNote && note !== "" ? "text-accent-700" : "text-neutral-500"}`}
            >
              {tActions("reasonTooShort", { min: MIN_REASON_LENGTH })}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
              {tActions("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={invalidAmount || invalidNote || busy} isLoading={busy}>
              {t("resolveConfirm")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
