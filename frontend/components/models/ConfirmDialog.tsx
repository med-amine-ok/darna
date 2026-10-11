"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, Trash2, CheckCircle2, AlertCircle, X, HelpCircle, Save } from "lucide-react";

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
  cancelLabel = "Cancel",
  onCancel,
  discardLabel = "Discard changes",
  onDiscard,
  saveAndExitLabel = "Save & exit",
  onSaveAndExit,
  icon: customIcon,
  isLoading = false,
  disabled = false,
  autoFocusButton,
  backdropClose,
}: ConfirmDialogProps) {
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
      ? "Delete"
      : normalizedVariant === "discard"
      ? "Save & exit"
      : "Confirm";
  const effectiveConfirmLabel = confirmLabel || defaultConfirmLabel;

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading && !internalLoading) {
        onCancel();
        if (onClose) onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, internalLoading, onCancel, onClose]);

  // Focus trap: Default focus to Cancel on destructive variants to prevent accidental Enter confirmation
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (autoFocusButton === "cancel" || (normalizedVariant === "destructive" && autoFocusButton !== "confirm")) {
        cancelButtonRef.current?.focus();
      } else if (autoFocusButton === "confirm" || normalizedVariant === "neutral") {
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

  if (!isOpen) return null;

  // Visual tokens tailored to DARNA Earthy Minimal palette
  const getVisualTokens = () => {
    switch (normalizedVariant) {
      case "destructive":
        return {
          icon: customIcon || <Trash2 size={22} className="text-rose-600" strokeWidth={2.2} />,
          badgeStyle: "bg-rose-50 border-rose-200/80 text-rose-600 shadow-rose-100/50 animate-badge-shake",
          topAccentGradient: "from-rose-500 via-accent to-rose-700",
          primaryBtn:
            "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md shadow-rose-600/25 border-rose-600",
        };
      case "discard":
        return {
          icon: customIcon || <AlertCircle size={22} className="text-amber-700" strokeWidth={2.2} />,
          badgeStyle: "bg-amber-50 border-amber-200/80 text-amber-700 shadow-amber-100/50",
          topAccentGradient: "from-amber-500 via-tertiary to-accent",
          primaryBtn:
            "bg-accent hover:bg-accent/90 active:bg-accent/95 text-white shadow-md shadow-accent/25 border-accent",
        };
      case "neutral":
      default:
        return {
          icon: customIcon || <CheckCircle2 size={22} className="text-accent" strokeWidth={2.2} />,
          badgeStyle: "bg-accent/10 border-accent/25 text-accent shadow-accent/10",
          topAccentGradient: "from-accent via-tertiary to-primary",
          primaryBtn:
            "bg-accent hover:bg-accent/90 active:bg-accent/95 text-white shadow-md shadow-accent/25 border-accent",
        };
    }
  };

  const { icon, badgeStyle, topAccentGradient, primaryBtn } = getVisualTokens();
  const busy = isLoading || internalLoading;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-primary/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && allowBackdropClose && !busy) {
          onCancel();
          if (onClose) onClose();
        }
      }}
    >
      {/* Dialog Modal Container: Desktop Centered Card, Mobile Bottom Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-tertiary/80 shadow-darna-modal p-6 sm:p-8 overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 select-none cursor-default max-h-[92dvh] overflow-y-auto"
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-tertiary/70 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Top Decorative Arched Accent Gradient */}
        <div
          className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${topAccentGradient} opacity-90`}
        />

        {/* Optional Close Button (Enabled for non-destructive or when backdrop close allowed) */}
        {allowBackdropClose && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onCancel();
              if (onClose) onClose();
            }}
            aria-label="Close dialog"
            className="absolute top-4 end-4 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-neutral-100 transition cursor-pointer disabled:opacity-40"
          >
            <X size={18} />
          </button>
        )}

        {/* Top Slot: Badge + Title + Description */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-start gap-4">
          {/* Circular / Rounded-2xl Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs transition-transform ${badgeStyle}`}
          >
            {icon}
          </div>

          <div className="w-full">
            <h3
              id="confirm-dialog-title"
              className="text-lg sm:text-xl font-serif font-black text-primary tracking-tight"
            >
              {title}
            </h3>
            {bodyContent && (
              <div
                id="confirm-dialog-description"
                className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed"
              >
                {bodyContent}
              </div>
            )}
          </div>
        </div>

        {/* Optional Callout / Warning Box */}
        {callout && (
          <div className="mt-4 p-3.5 bg-neutral-50/90 rounded-2xl border border-tertiary/60 text-xs text-neutral-700 leading-relaxed text-start">
            {callout}
          </div>
        )}

        {/* Custom Body Slot (e.g. typing confirmation input) */}
        {children && <div className="mt-4 text-start">{children}</div>}

        {/* Action Button Bar */}
        <div className="mt-6 pt-3 border-t border-tertiary/40">
          {normalizedVariant === "discard" && onSaveAndExit ? (
            /* 3-Button Discard Variant Pattern */
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                ref={cancelButtonRef}
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-tertiary/80 bg-white text-neutral-700 hover:text-primary hover:bg-neutral-100 transition cursor-pointer disabled:opacity-50 btn-press"
              >
                {cancelLabel || "Keep editing"}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleDiscardAction}
                className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition cursor-pointer disabled:opacity-50 btn-press"
              >
                {discardLabel}
              </button>

              <button
                ref={confirmButtonRef}
                type="button"
                disabled={busy}
                onClick={handleSaveAndExitAction}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 btn-press ${primaryBtn}`}
              >
                {busy ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>{saveAndExitLabel}</span>
              </button>
            </div>
          ) : (
            /* Standard 2-Button Pattern */
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                ref={cancelButtonRef}
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-tertiary/80 bg-white text-neutral-700 hover:text-primary hover:bg-neutral-100 hover:border-primary/50 transition cursor-pointer disabled:opacity-50 btn-press"
              >
                {cancelLabel}
              </button>

              <button
                ref={confirmButtonRef}
                type="button"
                disabled={busy || disabled}
                onClick={handleConfirmAction}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 btn-press ${primaryBtn}`}
              >
                {busy && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{effectiveConfirmLabel}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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

  const confirm = useCallback((options: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, isOpen: true });
    });
  }, []);

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
