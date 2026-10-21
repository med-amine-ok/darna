"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
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
  success: (title: string, description?: string, undoAction?: () => void) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type = "info", duration = 4500, undoAction, undoLabel = "Undo" }: ToastOptions) => {
      const id = `tst_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newToast: ToastItem = {
        id,
        title,
        description,
        type,
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
    success: <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-accent shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#8C682E] shrink-0" />,
    info: <Info className="w-4 h-4 text-primary shrink-0" />,
  };

  const badgeBgs: Record<ToastType, string> = {
    success: "bg-secondary/15 border-secondary/25",
    error: "bg-accent/15 border-accent/25",
    warning: "bg-[#F3EAD8] border-[#D9C4A1]",
    info: "bg-primary/10 border-primary/20",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning, removeToast }}>
      {children}

      {/* Floating Toasts Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-5 end-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-auto relative w-full bg-white rounded-2xl shadow-darna-modal border border-tertiary/80 overflow-hidden text-start"
            >
              <div className="p-3.5 flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                    badgeBgs[t.type || "info"]
                  }`}
                >
                  {icons[t.type || "info"]}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h4 className="text-xs font-bold text-primary leading-tight">{t.title}</h4>
                  {t.description && (
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                      {t.description}
                    </p>
                  )}
                  {t.undoAction && (
                    <button
                      type="button"
                      onClick={() => {
                        t.undoAction?.();
                        removeToast(t.id);
                      }}
                      className="mt-1.5 text-xs font-bold text-secondary hover:text-[#526445] underline cursor-pointer"
                    >
                      {t.undoLabel || "Undo"}
                    </button>
                  )}
                </div>

                {/* Working Close Button */}
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-primary hover:bg-neutral-100 transition cursor-pointer shrink-0"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress Bar */}
              {t.duration && t.duration > 0 && (
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: t.duration / 1000, ease: "linear" }}
                  className={`h-0.5 ${
                    t.type === "success"
                      ? "bg-secondary"
                      : t.type === "error"
                      ? "bg-accent"
                      : "bg-primary"
                  }`}
                />
              )}
            </motion.div>
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
