"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  confirmVariant?: "danger" | "warning" | "primary" | string;
  isLoading?: boolean;
  requireTypedConfirmation?: string; // If set, user must type this string to enable confirm
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmText,
  cancelLabel,
  variant,
  confirmVariant,
  isLoading = false,
  requireTypedConfirmation,
}) => {
  const t = useTranslations("ui");
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const typedId = `${uid}-typed`;
  const closeAction = onClose || onCancel || (() => {});
  const activeConfirmLabel = confirmText || confirmLabel || t("confirm");
  const activeVariant: "danger" | "warning" | "primary" =
    confirmVariant === "danger" || confirmVariant === "warning" || confirmVariant === "primary"
      ? confirmVariant
      : variant || "danger";
  const [typedInput, setTypedInput] = useState("");
  const isTypedMatch = requireTypedConfirmation
    ? typedInput.trim() === requireTypedConfirmation.trim()
    : true;

  const handleClose = () => {
    setTypedInput("");
    closeAction();
  };

  const handleConfirm = async () => {
    if (!isTypedMatch) return;
    await onConfirm();
    setTypedInput("");
  };

  const iconBadges = {
    danger: (
      <div className="w-12 h-12 rounded-2xl bg-accent-100 flex items-center justify-center text-accent-700 mb-3" aria-hidden="true">
        <Trash2 className="w-6 h-6" />
      </div>
    ),
    warning: (
      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 mb-3" aria-hidden="true">
        <AlertTriangle className="w-6 h-6" />
      </div>
    ),
    primary: (
      <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center text-secondary-700 mb-3" aria-hidden="true">
        <CheckCircle2 className="w-6 h-6" />
      </div>
    ),
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} maxWidth="sm" labelledBy={titleId} describedBy={descId}>
      <div className="text-start">
        {iconBadges[activeVariant]}
        <h2 id={titleId} className="text-title font-semibold text-primary-900 leading-snug">
          {title}
        </h2>
        <p id={descId} className="text-meta text-primary-600 mt-2 leading-relaxed">
          {description}
        </p>

        {requireTypedConfirmation && (
          <div className="mt-4 space-y-1.5 p-3 rounded-xl bg-accent-50 ring-1 ring-inset ring-accent-200">
            <label htmlFor={typedId} className="block text-[11px] font-semibold text-accent-700">
              {t.rich("typeToConfirm", {
                value: requireTypedConfirmation,
                strong: (chunks) => <span className="font-semibold underline">{chunks}</span>,
              })}
            </label>
            <input
              id={typedId}
              type="text"
              autoComplete="off"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={requireTypedConfirmation}
              className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-accent/40 bg-white focus:outline-none focus:ring-4 focus:ring-accent/15"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-primary/[0.06]">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
            className="min-h-[44px] justify-center"
          >
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            variant={activeVariant === "danger" ? "dangerOutline" : "primary"}
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!isTypedMatch || isLoading}
            className="min-h-[44px] justify-center"
          >
            {activeConfirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
