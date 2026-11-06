"use client";

/**
 * Inline feedback, Banner, ProgressBar, ErrorState, KitEmptyState.
 *
 *   <Banner tone="warning" title="Host approval required">They reply within 24h.</Banner>
 *   <Banner tone="success" onDismiss={hide} action={<Button size="sm" variant="tertiary">View</Button>}>Saved</Banner>
 *   <ProgressBar value={60} label="Listing completeness" showValue />
 *   <ProgressBar indeterminate label="Uploading photos" />
 *   <ErrorState onRetry={reload} />                       // default copy from ui.error*
 *   <KitEmptyState variant="favorites" title="No saved homes yet" action={<Button href="/">Explore</Button>} />
 *
 * Banner tones: info (sand), success (olive), warning (ochre), danger (terracotta); danger
 * uses role="alert", the others role="status". ProgressBar grows from the reading start
 * (scaleX, RTL-aware) and exposes role="progressbar" with aria-valuenow.
 * For the legacy `components/EmptyState` API see that file (it renders KitEmptyState).
 */

import React from "react";
import { AnimatePresence, m } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  BrandAlertCircleIcon,
  BrandCheckCircleIcon,
  BrandCloseIcon,
  BrandExclamationIcon,
  BrandRefreshIcon,
} from "@/components/icons";
import type { IconProps } from "@/components/icons/BrandIcons";
import { dur, ease } from "@/lib/motion";
import Button, { IconButton } from "./Button";
import { Illustration, type IllustrationVariant } from "./Illustration";
import { cn } from "./cn";

/* ------------------------------------------------------------------ Banner */

export type BannerTone = "info" | "success" | "warning" | "danger";

const bannerTones: Record<
  BannerTone,
  { box: string; icon: string; Icon: React.ComponentType<IconProps> }
> = {
  info: {
    box: "bg-tertiary-100 text-primary-800 ring-tertiary-300/70",
    icon: "text-tertiary-700",
    Icon: BrandAlertCircleIcon,
  },
  success: {
    box: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    icon: "text-emerald-700",
    Icon: BrandCheckCircleIcon,
  },
  warning: {
    box: "bg-amber-50 text-amber-900 ring-amber-200/80",
    icon: "text-amber-700",
    Icon: BrandExclamationIcon,
  },
  danger: {
    box: "bg-red-50 text-red-900 ring-red-200",
    icon: "text-red-700",
    Icon: BrandAlertCircleIcon,
  },
};

export interface BannerProps {
  tone?: BannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Banner({
  tone = "info",
  title,
  children,
  icon,
  action,
  onDismiss,
  className,
}: BannerProps) {
  const t = useTranslations("ui");
  const cfg = bannerTones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl p-4 ring-1 ring-inset",
        cfg.box,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("mt-0.5 inline-flex shrink-0", cfg.icon)}
      >
        {icon ?? <cfg.Icon size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && (
          <div className={cn("text-meta opacity-90", title && "mt-0.5")}>
            {children}
          </div>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onDismiss && (
        <IconButton
          label={t("dismiss")}
          icon={<BrandCloseIcon size={16} />}
          size="sm"
          onClick={onDismiss}
          className="-me-1 -mt-1 text-current"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ ProgressBar */

export interface ProgressBarProps {
  /** 0–100. Ignored when indeterminate. */
  value?: number;
  label: string;
  /** Print the label + percentage above the bar. */
  showLabel?: boolean;
  showValue?: boolean;
  indeterminate?: boolean;
  tone?: "accent" | "olive" | "ink";
  size?: "sm" | "md";
  className?: string;
}

const barTones = {
  accent: "bg-cta",
  olive: "bg-secondary-600",
  ink: "bg-primary-800",
} as const;

export function ProgressBar({
  value = 0,
  label,
  showLabel = true,
  showValue,
  indeterminate,
  tone = "accent",
  size = "md",
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {(showLabel || showValue) && (
        <div className="mb-2 flex items-baseline justify-between gap-3 text-meta">
          {showLabel && (
            <span className="font-medium text-primary-700">{label}</span>
          )}
          {showValue && !indeterminate && (
            <span className="font-semibold text-primary-900 tabular-nums">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(pct)}
        className={cn(
          "relative overflow-hidden rounded-full bg-primary/[0.08]",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        {indeterminate ? (
          <span className="progress-indeterminate absolute inset-y-0 w-2/5 rounded-full bg-cta" />
        ) : (
          <span
            className={cn(
              "absolute inset-0 origin-left rounded-full rtl:origin-right transition-transform duration-slow ease-out",
              barTones[tone],
            )}
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Empty / Error */

export interface KitEmptyStateProps {
  variant?: IllustrationVariant;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Smaller vertical rhythm for cards/panels. */
  compact?: boolean;
  className?: string;
}

export function KitEmptyState({
  variant = "generic",
  title,
  description,
  action,
  compact,
  className,
}: KitEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact
          ? "gap-3 py-8 px-4"
          : "gap-4 py-14 px-6 min-h-[50vh] justify-center",
        className,
      )}
    >
      <Illustration variant={variant} size={compact ? 120 : 168} />
      <div className="max-w-md">
        <h3
          className={cn(
            "font-serif text-primary-900",
            compact ? "text-heading" : "text-display-md",
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="mx-auto mt-2 max-w-[44ch] text-body text-primary-600">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra action (e.g. "Go home" link button). */
  action?: React.ReactNode;
  compact?: boolean;
  /** Technical detail (error digest) shown small. */
  detail?: string;
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  action,
  compact,
  detail,
  className,
}: ErrorStateProps) {
  const t = useTranslations("ui");
  return (
    <div role="alert" className={className}>
      <KitEmptyState
        variant="error"
        compact={compact}
        title={title ?? t("errorTitle")}
        description={
          <>
            {description ?? t("errorDescription")}
            {detail && (
              <span className="mt-2 block text-meta text-primary-500 tabular-nums">
                {detail}
              </span>
            )}
          </>
        }
        action={
          (onRetry || action) && (
            <>
              {onRetry && (
                <Button
                  variant="secondary"
                  onClick={onRetry}
                  leadingIcon={<BrandRefreshIcon size={16} />}
                >
                  {retryLabel ?? t("retry")}
                </Button>
              )}
              {action}
            </>
          )
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Inline status message (used in forms) */

/** Small animated line for async form status ("Saved", "Couldn't save"). */
export function InlineStatus({
  show,
  tone = "success",
  children,
}: {
  show: boolean;
  tone?: "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <m.p
          role="status"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.fast, ease: ease.out }}
          className={cn(
            "text-meta font-semibold",
            tone === "success" ? "text-emerald-700" : "text-red-700",
          )}
        >
          {children}
        </m.p>
      )}
    </AnimatePresence>
  );
}
