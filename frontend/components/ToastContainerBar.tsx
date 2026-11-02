"use client";

import React from "react";
import {
  ToastContainer,
  cssTransition,
  TypeOptions,
  toast,
} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslations } from "next-intl";
import { BrandAlertCircleIcon, BrandCloseIcon } from "@/components/icons";
import { DrawnCheck, Spinner } from "@/components/ui/Button";
import { useParams } from "next/navigation";

// Re-export toast for unified design system imports
export { toast };

/**
 * BLADUS toasts (react-toastify). Styling lives in styles/globals.css ("BLADUS kit, toasts"):
 * glass-light card, e3, rounded-2xl, accent bar on the reading-start edge, thin progress bar.
 * Enter slides from the start edge (up from the bottom on phones); exit fades + collapses.
 */
const DarnaToastTransition = cssTransition({
  enter: "darna-toast-enter",
  exit: "darna-toast-exit",
  appendPosition: true,
  collapse: true,
  collapseDuration: 220,
});

/** Tinted circular icon per toast type (olive success, terracotta error, ochre warning, sand info). */
export function DarnaToastIcon({
  type,
  isLoading,
}: {
  type?: TypeOptions;
  isLoading?: boolean;
}) {
  const base = "flex items-center justify-center shrink-0 w-8 h-8 rounded-full";
  if (isLoading) {
    return (
      <span
        className={`${base} bg-accent-100 text-accent-700`}
        aria-hidden="true"
      >
        <Spinner size={15} />
      </span>
    );
  }
  switch (type) {
    case "success":
      return (
        <span
          className={`${base} bg-secondary-100 text-secondary-700`}
          aria-hidden="true"
        >
          <DrawnCheck size={16} strokeWidth={2.6} />
        </span>
      );
    case "error":
      return (
        <span
          className={`${base} bg-accent-100 text-accent-700`}
          aria-hidden="true"
        >
          <BrandAlertCircleIcon size={17} strokeWidth={2} />
        </span>
      );
    case "warning":
      return (
        <span
          className={`${base} bg-amber-100 text-amber-700`}
          aria-hidden="true"
        >
          <BrandAlertCircleIcon size={17} strokeWidth={2} />
        </span>
      );
    case "info":
    default:
      return (
        <span
          className={`${base} bg-tertiary-200 text-tertiary-800`}
          aria-hidden="true"
        >
          <BrandAlertCircleIcon size={17} strokeWidth={2} />
        </span>
      );
  }
}

/** Close control: 32px circle (44px hit area), tinted hover, localized label. */
export function DarnaToastCloseButton({
  closeToast,
  ariaLabel,
}: {
  closeToast?: (e: React.MouseEvent<HTMLElement>) => void;
  ariaLabel?: string;
}) {
  const t = useTranslations("ui");
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        closeToast?.(e);
      }}
      aria-label={ariaLabel || t("dismissNotification")}
      className="relative z-20 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-primary-500 hover:text-primary-900 hover:bg-primary/[0.07] active:scale-90 transition-[background-color,color,transform] duration-fast ease-standard cursor-pointer before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
    >
      <BrandCloseIcon
        size={15}
        strokeWidth={2.2}
        className="pointer-events-none"
      />
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
          isLoading={Boolean(
            (props as unknown as { isLoading?: boolean })?.isLoading,
          )}
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
      // Keep react-toastify's own classes: its animation drives autoClose.
      progressClassName={(context) =>
        `${context?.defaultClassName ?? ""} darna-toast-progress`
      }
    />
  );
}
