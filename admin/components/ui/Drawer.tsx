"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer,
  size = "md",
  className = "",
}) => {
  const effectiveSubtitle = subtitle || description;
  // ESC key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-start">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs"
          />

          {/* Sliding Drawer Container */}
          <div className="fixed inset-y-0 end-0 flex max-w-full pl-10 rtl:pl-0 rtl:pr-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className={`w-screen ${sizeClasses[size]} bg-white shadow-darna-modal flex flex-col border-s border-tertiary/70 rtl:border-s-0 rtl:border-e ${className}`}
            >
              {/* Header */}
              <div className="p-5 border-b border-tertiary/60 flex items-center justify-between gap-3 bg-darnaBg/30">
                <div>
                  {title && (
                    <h2 className="text-base sm:text-lg font-serif font-black text-primary">
                      {title}
                    </h2>
                  )}
                  {effectiveSubtitle && (
                    <p className="text-xs text-neutral-500 mt-0.5">{effectiveSubtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-neutral-400 hover:text-primary hover:bg-neutral-100 transition cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 darna-admin-scrollbar">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="p-4 border-t border-tertiary/60 bg-white flex items-center justify-end gap-2.5">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
