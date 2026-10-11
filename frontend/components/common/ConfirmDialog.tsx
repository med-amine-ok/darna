"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, HelpCircle, CheckCircle2, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  callout?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  callout,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
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
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const getIconAndStyle = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertTriangle size={24} className="text-rose-600" />,
          badgeBg: "bg-rose-50 border-rose-200/80 shadow-rose-100/50",
          btnColor: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 shadow-md",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={24} className="text-amber-600" />,
          badgeBg: "bg-amber-50 border-amber-200/80 shadow-amber-100/50",
          btnColor: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 shadow-md",
        };
      case "success":
        return {
          icon: <CheckCircle2 size={24} className="text-emerald-700" />,
          badgeBg: "bg-emerald-50 border-emerald-200/80 shadow-emerald-100/50",
          btnColor: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20 shadow-md",
        };
      case "info":
      default:
        return {
          icon: <HelpCircle size={24} className="text-primary" />,
          badgeBg: "bg-neutral-100 border-tertiary/70 shadow-neutral-100/50",
          btnColor: "bg-primary hover:bg-primary/90 text-white shadow-primary/20 shadow-md",
        };
    }
  };

  const { icon, badgeBg, btnColor } = getIconAndStyle();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl border border-tertiary/80 shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 select-none cursor-default"
      >
        {/* Subtle Moroccan Arched Top Pattern Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent via-tertiary to-primary opacity-80" />

        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-4 end-4 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-neutral-100 transition cursor-pointer disabled:opacity-50"
        >
          <X size={18} />
        </button>

        {/* Icon & Title Header */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${badgeBg}`}
          >
            {icon}
          </div>
          <div className="flex-1 pt-0.5">
            <h3
              id="confirm-dialog-title"
              className="text-lg sm:text-xl font-bold text-primary tracking-tight"
            >
              {title}
            </h3>
            <div className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Optional Callout / Warning Details Box */}
        {callout && (
          <div className="mt-4 p-3.5 bg-neutral-50/80 rounded-2xl border border-tertiary/60 text-xs text-neutral-700 leading-relaxed">
            {callout}
          </div>
        )}

        {/* Action Button Bar */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-2 border-t border-tertiary/40">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-tertiary/80 bg-white text-neutral-700 hover:text-primary hover:bg-neutral-100 hover:border-primary/50 transition cursor-pointer disabled:opacity-50 btn-press"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-2 btn-press ${btnColor}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
