"use client";

/**
 * ConfirmDialog, confirm / destructive / discard prompts (API unchanged) on the kit Dialog:
 * blurred ink backdrop, e4 rounded-3xl panel (bottom sheet on phones), tinted icon badge,
 * serif title, kit Buttons (destructive = terracotta-700, primary = glow pill).
 * Destructive variants focus Cancel first and ignore backdrop clicks.
 * `useConfirmDialog()` gives a promise-based confirm().
 */

import React, { useEffect, useId, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Dialog, { DialogFooter, dialogBackdrop } from "@/components/ui/Dialog";
import KitButton, { IconButton } from "@/components/ui/Button";
import {
  BrandTrashIcon,
  BrandAlertCircleIcon,
  BrandCheckIcon,
  BrandCloseIcon,
} from "@/components/icons";

export type ConfirmDialogVariant =
  | "neutral"
  | "destructive"
  | "discard"
  // Legacy / convenience mappings:
  | "danger"
  | "warning"
  | "info"
  | "success";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  message?: string | React.ReactNode;
  description?: string | React.ReactNode;
  callout?: string | React.ReactNode;
  children?: React.ReactNode;
  variant?: ConfirmDialogVariant;

  // Primary action
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;

  // Secondary action (Cancel / Stay)
  cancelLabel?: string;
  onCancel: () => void;

  // Discard variant actions (3-button pattern)
  discardLabel?: string;
  onDiscard?: () => void | Promise<void>;
  saveAndExitLabel?: string;
  onSaveAndExit?: () => void | Promise<void>;

  // Optional custom icon
  icon?: React.ReactNode;

  // States & Accessibility
  isLoading?: boolean;
  disabled?: boolean;
  autoFocusButton?: "confirm" | "cancel" | "none";
  backdropClose?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  description,
  callout,
  children,
  variant = "destructive",
  confirmLabel,
  onConfirm,
  cancelLabel,
  onCancel,
  discardLabel,
  onDiscard,
  saveAndExitLabel,
  onSaveAndExit,
  icon: customIcon,
  isLoading = false,
  disabled = false,
  autoFocusButton,
  backdropClose,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const [internalLoading, setInternalLoading] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Normalize variant
  const normalizedVariant: "neutral" | "destructive" | "discard" =
    variant === "destructive" || variant === "danger"
      ? "destructive"
      : variant === "discard" || variant === "warning"
        ? "discard"
        : "neutral";

  // Default backdrop closing behavior:
  // For destructive variants, require explicit button click (prevent accidental dismissal).
  const allowBackdropClose =
    typeof backdropClose === "boolean"
      ? backdropClose
      : normalizedVariant !== "destructive";

  // Determine effective body text
  const bodyContent = message ?? description;

  // Default labels based on normalized variant
  const defaultConfirmLabel =
    normalizedVariant === "destructive"
      ? t("delete")
      : normalizedVariant === "discard"
        ? t("saveAndExit")
        : t("confirm");
  const effectiveConfirmLabel = confirmLabel || defaultConfirmLabel;

  const isBusy = isLoading || internalLoading;
  const titleId = useId();
  const descriptionId = useId();
  // Focus trap: Default focus to Cancel on destructive variants to prevent accidental Enter confirmation
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (
        autoFocusButton === "cancel" ||
        (normalizedVariant === "destructive" && autoFocusButton !== "confirm")
      ) {
        cancelButtonRef.current?.focus();
      } else if (
        autoFocusButton === "confirm" ||
        normalizedVariant === "neutral"
      ) {
        confirmButtonRef.current?.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, normalizedVariant, autoFocusButton]);

  const handleConfirmAction = async () => {
    if (disabled || isLoading || internalLoading) return;
    try {
      const res = onConfirm();
      if (res instanceof Promise) {
        setInternalLoading(true);
        await res;
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const handleDiscardAction = async () => {
    if (disabled || isLoading || internalLoading) return;
    if (onDiscard) {
      try {
        const res = onDiscard();
        if (res instanceof Promise) {
          setInternalLoading(true);
          await res;
        }
      } finally {
        setInternalLoading(false);
      }
    } else {
      onCancel();
    }
  };

  const handleSaveAndExitAction = async () => {
    if (disabled || isLoading || internalLoading) return;
    if (onSaveAndExit) {
      try {
        const res = onSaveAndExit();
        if (res instanceof Promise) {
          setInternalLoading(true);
          await res;
        }
      } finally {
        setInternalLoading(false);
      }
    } else {
      handleConfirmAction();
    }
  };

  // Kit tones: terracotta for destructive, ochre for discard, olive/ink for neutral.
  const getVisualTokens = () => {
    switch (normalizedVariant) {
      case "destructive":
        return {
          icon: customIcon || <BrandTrashIcon size={22} strokeWidth={1.75} />,
          badgeStyle: "bg-accent-100 text-accent-700 animate-badge-shake",
          confirmVariant: "destructive" as const,
        };
      case "discard":
        return {
          icon: customIcon || (
            <BrandAlertCircleIcon size={22} strokeWidth={1.75} />
          ),
          badgeStyle: "bg-amber-100 text-amber-700",
          confirmVariant: "primary" as const,
        };
      case "neutral":
      default:
        return {
          icon: customIcon || <BrandCheckIcon size={22} strokeWidth={2} />,
          badgeStyle: "bg-secondary-100 text-secondary-700",
          confirmVariant: "primary" as const,
        };
    }
  };

  const { icon, badgeStyle, confirmVariant } = getVisualTokens();
  const busy = isLoading || internalLoading;
  const close = () => {
    onCancel();
    if (onClose) onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      busy={busy}
      closeOnBackdrop={allowBackdropClose}
      ariaLabel={title}
      size="sm"
      backdropClassName={`${dialogBackdrop} !z-[100]`}
    >
      {allowBackdropClose && (
        <IconButton
          label={t("close")}
          icon={<BrandCloseIcon size={18} />}
          onClick={close}
          disabled={busy}
          size="sm"
          className="!absolute top-4 end-4 z-[3]"
        />
      )}

      <div
        className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-start"
        aria-labelledby={titleId}
        aria-describedby={bodyContent ? descriptionId : undefined}
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${badgeStyle}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="w-full">
          <h3
            id={titleId}
            className="font-serif text-heading text-primary-900 sm:pe-8"
          >
            {title}
          </h3>
          {bodyContent && (
            <div id={descriptionId} className="mt-2 text-body text-primary-600">
              {bodyContent}
            </div>
          )}
        </div>
      </div>

      {callout && (
        <div className="mt-5 rounded-2xl bg-darnaBg-300/70 p-4 text-start text-meta text-primary-700">
          {callout}
        </div>
      )}

      {children && <div className="mt-5 text-start">{children}</div>}

      {normalizedVariant === "discard" && onSaveAndExit ? (
        /* 3-button discard pattern */
        <DialogFooter>
          <KitButton
            ref={cancelButtonRef}
            variant="ghost"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel ?? t("keepEditing")}
          </KitButton>
          <KitButton
            variant="tertiary"
            disabled={busy}
            onClick={handleDiscardAction}
            className="!text-accent-700"
          >
            {discardLabel ?? t("discardChanges")}
          </KitButton>
          <KitButton
            ref={confirmButtonRef}
            variant={confirmVariant}
            disabled={busy}
            loading={busy}
            leadingIcon={<BrandCheckIcon size={16} />}
            onClick={handleSaveAndExitAction}
          >
            {saveAndExitLabel ?? t("saveAndExit")}
          </KitButton>
        </DialogFooter>
      ) : (
        /* Standard 2-button pattern */
        <DialogFooter>
          <KitButton
            ref={cancelButtonRef}
            variant="tertiary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel ?? t("cancel")}
          </KitButton>
          <KitButton
            ref={confirmButtonRef}
            variant={confirmVariant}
            disabled={disabled}
            loading={busy}
            onClick={handleConfirmAction}
          >
            {effectiveConfirmLabel}
          </KitButton>
        </DialogFooter>
      )}
    </Dialog>
  );
}

/**
 * useConfirmDialog - Ergonomic declarative Hook to prompt the user
 * Returns a promise that resolves to true (confirmed) or false (cancelled)
 */
export interface UseConfirmOptions {
  title: string;
  message?: string | React.ReactNode;
  description?: string | React.ReactNode;
  callout?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  icon?: React.ReactNode;
}

export function useConfirmDialog() {
  const [state, setState] = useState<UseConfirmOptions & { isOpen: boolean }>({
    isOpen: false,
    title: "",
    variant: "destructive",
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (options: UseConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setState({ ...options, isOpen: true });
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const dialogElement = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      message={state.message ?? state.description}
      callout={state.callout}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      icon={state.icon}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return {
    confirm,
    ConfirmDialogComponent: dialogElement,
    isOpen: state.isOpen,
  };
}
