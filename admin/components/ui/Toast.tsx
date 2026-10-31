"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { dur, ease, spring } from "@/lib/motion";
import { useTranslations } from "next-intl";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  variant?: ToastType | "danger";
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
  addToast: (options: ToastOptions) => void;
  success: (title: string, description?: string, undoAction?: () => void) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTranslations("ui");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type, variant, duration = 4500, undoAction, undoLabel }: ToastOptions) => {
      const computedType: ToastType =
        type || (variant === "danger" ? "error" : variant) || "info";
      const id = `tst_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newToast: ToastItem = {
        id,
        title,
        description,
        type: computedType,
        duration,
        undoAction,
        undoLabel,
        createdAt: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 5));

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string, undoAction?: () => void) =>
      addToast({ title, description, type: "success", undoAction }),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      addToast({ title, description, type: "error" }),
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      addToast({ title, description, type: "info" }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      addToast({ title, description, type: "warning" }),
    [addToast]
  );

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-secondary-700 shrink-0" aria-hidden="true" />,
    error: <AlertCircle className="w-4 h-4 text-accent-700 shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />,
    info: <Info className="w-4 h-4 text-primary-700 shrink-0" aria-hidden="true" />,
  };

  const badgeBgs: Record<ToastType, string> = {
    success: "bg-secondary-100",
    error: "bg-accent-100",
    warning: "bg-amber-100",
    info: "bg-primary-100",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, addToast, success, error, info, warning, removeToast }}>
      {children}

      {/* Floating Toasts Viewport: safe-area and mobile-bottom-nav aware */}
      <div
        role="region"
        aria-label={t("notifications")}
        aria-live="polite"
        aria-relevant="additions"
        className="fixed bottom-20 lg:bottom-5 start-4 end-4 sm:start-auto sm:end-5 z-50 flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full pointer-events-none pb-[env(safe-area-inset-bottom)]"
      >
        <AnimatePresence>
          {toasts.map((item) => (
            <m.div
              key={item.id}
              layout="position"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: spring.sheet }}
              exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: dur.fast, ease: ease.standard } }}
              role={item.type === "error" ? "alert" : "status"}
              aria-atomic="true"
              className="pointer-events-auto relative w-full bg-white rounded-2xl shadow-darna-modal overflow-hidden text-start"
            >
              <div className="p-3.5 flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    badgeBgs[item.type || "info"]
                  }`}
                >
                  {icons[item.type || "info"]}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-meta font-semibold text-primary-900 leading-snug">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-primary-600 mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  )}
                  {item.undoAction && (
                    <button
                      type="button"
                      onClick={() => {
                        item.undoAction?.();
                        removeToast(item.id);
                      }}
                      className="mt-1.5 text-xs font-bold text-secondary-700 hover:text-secondary-800 underline underline-offset-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 rounded"
                    >
                      {item.undoLabel || t("undo")}
                    </button>
                  )}
                </div>

                {/* Working Close Button */}
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="p-1 rounded-lg text-neutral-500 hover:text-primary hover:bg-neutral-100 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  aria-label={t("dismissNotification")}
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Progress Bar */}
              {item.duration && item.duration > 0 && (
                <m.div
                  aria-hidden="true"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: item.duration / 1000, ease: "linear" }}
                  className={`h-0.5 origin-left rtl:origin-right ${
                    item.type === "success"
                      ? "bg-secondary"
                      : item.type === "error"
                      ? "bg-accent"
                      : item.type === "warning"
                      ? "bg-amber-500"
                      : "bg-primary-400"
                  }`}
                />
              )}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
