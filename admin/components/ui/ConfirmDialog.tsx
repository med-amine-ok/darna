"use client";

import React, { useState } from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { AlertTriangle, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmText,
  cancelLabel = "Cancel",
  variant,
  confirmVariant,
  isLoading = false,
  requireTypedConfirmation,
}) => {
  const activeConfirmLabel = confirmText || confirmLabel || "Confirm";
  const activeVariant: "danger" | "warning" | "primary" = (confirmVariant as any) || variant || "danger";
  const [typedInput, setTypedInput] = useState("");
  const isTypedMatch = requireTypedConfirmation
    ? typedInput.trim() === requireTypedConfirmation.trim()
    : true;

  const handleClose = () => {
    setTypedInput("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!isTypedMatch) return;
    await onConfirm();
    setTypedInput("");
  };

  const iconBadges = {
    danger: (
      <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent mb-3">
        <Trash2 className="w-6 h-6" />
      </div>
    ),
    warning: (
      <div className="w-12 h-12 rounded-2xl bg-[#F3EAD8] border border-[#D9C4A1] flex items-center justify-center text-[#71542C] mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
    ),
    primary: (
      <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary mb-3">
        <CheckCircle2 className="w-6 h-6" />
      </div>
    ),
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} maxWidth="sm">
      <div className="text-start">
        {iconBadges[activeVariant]}
        <h3 className="text-base font-serif font-black text-primary leading-snug">
          {title}
        </h3>
        <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
          {description}
        </p>

        {requireTypedConfirmation && (
          <div className="mt-4 space-y-1.5 p-3 rounded-xl bg-accent/5 border border-accent/20">
            <label className="block text-[11px] font-semibold text-accent">
              To proceed, please type <span className="font-bold underline">{requireTypedConfirmation}</span> below:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={requireTypedConfirmation}
              className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-accent/40 bg-white focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-100">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={activeVariant === "danger" ? "dangerOutline" : "primary"}
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!isTypedMatch || isLoading}
          >
            {activeConfirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
