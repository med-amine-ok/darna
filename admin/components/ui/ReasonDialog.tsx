"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { MIN_REASON_LENGTH } from "@/lib/domain/transitions";

export interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  defaultReason?: string;
  onCancel: () => void;
  /** Called with the trimmed reason; may throw (the dialog stays open). */
  onConfirm: (reason: string) => Promise<void> | void;
}

/**
 * Confirmation dialog with a mandatory written reason (reject / suspend /
 * ban / request changes / reject payout). Mirrors the server-side rule
 * (lib/auth/run-action `reason()`): at least MIN_REASON_LENGTH characters.
 */
export function ReasonDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  variant = "danger",
  defaultReason = "",
  onCancel,
  onConfirm,
}: ReasonDialogProps) {
  const t = useTranslations("actions");
  const [value, setValue] = useState(defaultReason);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setValue(defaultReason);
  }, [isOpen, defaultReason]);

  const valid = value.trim().length >= MIN_REASON_LENGTH;
  const showError = !valid && value.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(value.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={title} description={description} maxWidth="sm">
      <form onSubmit={submit} className="space-y-3 text-start text-xs">
        <label className="block font-bold text-primary" htmlFor="reason-dialog-input">
          {t("reasonLabel")}
        </label>
        <textarea
          id="reason-dialog-input"
          required
          minLength={MIN_REASON_LENGTH}
          maxLength={1000}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? "reason-dialog-error" : undefined}
          placeholder={t("reasonPlaceholder")}
          className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
        />
        {showError && (
          <p id="reason-dialog-error" className="text-accent-700 text-[11px]" role="alert">
            {t("reasonTooShort", { min: MIN_REASON_LENGTH })}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            variant={variant === "danger" ? "dangerOutline" : "primary"}
            size="sm"
            disabled={!valid || submitting}
            isLoading={submitting}
          >
            {confirmLabel ?? t("confirm")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
