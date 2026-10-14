"use client";

import React from "react";
import {
  ToastContainer,
  cssTransition,
  TypeOptions,
  toast,
} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  BrandCheckIcon,
  BrandAlertCircleIcon,
  BrandCloseIcon,
  BrandSpinnerIcon,
} from "@/components/icons";
import { useParams } from "next/navigation";

// Re-export toast for unified design system imports
export { toast };

/**
 * Custom Spring Overshoot Motion for DARNA toasts
 */
const DarnaToastTransition = cssTransition({
  enter: "darna-toast-enter",
  exit: "darna-toast-exit",
  appendPosition: true,
  collapse: true,
  collapseDuration: 220,
});

/**
 * Variant-coded Icon Badge matching DARNA Earthy Minimal palette:
 * - Success: filled circular badge in soft sage-tinted background (secondary token #6B7F5B) with white checkmark
 * - Error: circular badge in warm brick-red (#C94A4A) destructive tint with white alert icon
 * - Info/Neutral: circular badge in tan/tertiary (#D9C9B2) tint with primary-colored info icon
 * - Warning: circular badge in warm amber (#D9822B) tint with white warning icon
 */
export function DarnaToastIcon({
  type,
  isLoading,
}: {
  type?: TypeOptions;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-accent/15 border border-accent/30 text-accent"
        aria-hidden="true"
      >
        <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-xs">
          <BrandSpinnerIcon size={12} strokeWidth={2.5} />
        </div>
      </div>
    );
  }

  switch (type) {
    case "success":
      return (
        <div
          className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-secondary/15 border border-secondary/35 text-secondary shadow-xs"
          aria-hidden="true"
        >
          <div className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center shadow-xs">
            <BrandCheckIcon size={12} strokeWidth={3} />
          </div>
        </div>
      );

    case "error":
      return (
        <div
          className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-rose-50 border border-rose-200/90 text-rose-600 shadow-xs"
          aria-hidden="true"
        >
          <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <BrandAlertCircleIcon size={13} strokeWidth={2.5} />
          </div>
        </div>
      );

    case "warning":
      return (
        <div
          className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-amber-50 border border-amber-200/90 text-amber-700 shadow-xs"
          aria-hidden="true"
        >
          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <BrandAlertCircleIcon size={12} strokeWidth={2.5} />
          </div>
        </div>
      );

    case "info":
    default:
      return (
        <div
          className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-tertiary/30 border border-tertiary/75 text-primary shadow-xs"
          aria-hidden="true"
        >
          <div className="w-5 h-5 rounded-full bg-tertiary-300 text-primary flex items-center justify-center shadow-xs">
            <BrandAlertCircleIcon size={13} strokeWidth={2.5} className="text-primary" />
          </div>
        </div>
      );
  }
}

/**
 * Custom Quiet Close Button:
 * Muted gray, hover-darkens with soft pill feedback
 */
export function DarnaToastCloseButton({
  closeToast,
  ariaLabel,
}: {
  closeToast?: (e: React.MouseEvent<HTMLElement>) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={closeToast}
      aria-label={ariaLabel || "Close notification"}
      className="shrink-0 w-7 h-7 -me-1 ms-2 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-tertiary/25 active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <BrandCloseIcon size={15} strokeWidth={2.2} />
    </button>
  );
}

export default function ToastContainerBar() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const isRtl = locale === "ar";

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { darnaToast?: typeof toast }).darnaToast = toast;
    }
  }, []);

  return (
    <ToastContainer
      key={isRtl ? "toast-rtl" : "toast-ltr"}
      position={isRtl ? "bottom-right" : "bottom-left"}
      rtl={isRtl}
      autoClose={4200}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick={true}
      pauseOnFocusLoss={true}
      pauseOnHover={true}
      draggable={true}
      theme="light"
      transition={DarnaToastTransition}
      icon={(props) => (
        <DarnaToastIcon
          type={props.type}
          isLoading={Boolean((props as unknown as { isLoading?: boolean })?.isLoading)}
        />
      )}
      closeButton={(props) => (
        <DarnaToastCloseButton closeToast={props.closeToast} />
      )}
      toastClassName={(context) => {
        const type = context?.type || "default";
        const rtlClass = context?.rtl ? "darna-toast--rtl" : "";
        return `darna-toast darna-toast--${type} ${rtlClass}`;
      }}
      bodyClassName={() => "darna-toast-body"}
      progressClassName={(context) => {
        const type = context?.type || "default";
        return `darna-toast-progress darna-toast-progress--${type}`;
      }}
    />
  );
}
