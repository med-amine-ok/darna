"use client";

/**
 * Form modal shell used by Login / Register / Search / Filter modals. API unchanged.
 * Built on the kit Dialog: blurred ink backdrop, rounded-3xl e4 panel that scales in on
 * tablet/desktop and becomes a draggable bottom sheet on phones; focus trap, Escape and
 * focus restore come from hook/useDialogA11y. Header (close + serif title), scrolling body,
 * footer with kit buttons (secondary = white tertiary, primary = terracotta glow).
 */

import React, { useCallback, useId } from "react";
import { useTranslations } from "next-intl";
import Dialog from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/Button";
import { BrandCloseIcon } from "@/components/icons";
import Button from "@/components/Button";

interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel: string;
  disabled?: boolean;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
}

export default function Modal({
  isOpen,
  onClose,
  onSubmit,
  title,
  body,
  actionLabel,
  footer,
  disabled,
  secondaryAction,
  secondaryActionLabel,
}: ModalProps) {
  const t = useTranslations("common");
  const titleId = useId();

  const handleClose = useCallback(() => {
    if (disabled) return;
    onClose();
  }, [disabled, onClose]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSubmit();
  }, [onSubmit, disabled]);

  const handleSecondAction = useCallback(() => {
    if (disabled || !secondaryAction) return;
    secondaryAction();
  }, [disabled, secondaryAction]);

  return (
    <Dialog
      isOpen={Boolean(isOpen)}
      onClose={handleClose}
      busy={disabled}
      ariaLabel={title}
      className="relative flex w-full flex-col overflow-hidden bg-white rounded-t-3xl sm:rounded-3xl shadow-e4 max-h-[92dvh] sm:max-h-[90vh] sm:max-w-xl lg:max-w-2xl"
    >
      {/* Header */}
      <div className="grid shrink-0 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 border-b border-primary/[0.08] px-4 pb-3 pt-1 sm:pt-4">
        <IconButton label={t("close")} icon={<BrandCloseIcon size={18} strokeWidth={2} />} onClick={handleClose} size="sm" />
        <h2 id={titleId} className="min-w-0 truncate text-center font-serif text-heading text-primary-900">
          {title}
        </h2>
        <span aria-hidden="true" />
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{body}</div>

      {/* Footer */}
      <div className="flex shrink-0 flex-col gap-3 border-t border-primary/[0.08] bg-white px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex w-full flex-row items-center gap-3">
          {secondaryAction && secondaryActionLabel && (
            <Button outline disabled={disabled} label={secondaryActionLabel} onClick={handleSecondAction} />
          )}
          <Button disabled={disabled} label={actionLabel} onClick={handleSubmit} />
        </div>
        {footer}
      </div>
    </Dialog>
  );
}
