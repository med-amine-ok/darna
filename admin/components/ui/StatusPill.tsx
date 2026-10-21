"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Ban,
  Trash2,
  FileEdit,
  AlertCircle,
  Archive,
  CheckCheck,
  AlertOctagon,
  RotateCcw,
  Flag,
  EyeOff,
  ShieldCheck,
  FileText,
} from "lucide-react";
import {
  HOST_STATUS_CONFIG,
  LISTING_STATUS_CONFIG,
  GUEST_STATUS_CONFIG,
  BOOKING_STATUS_CONFIG,
  REVIEW_STATUS_CONFIG,
} from "@/lib/status";

import { useTranslations } from "next-intl";

export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusPillProps {
  label?: string;
  status?: string;
  variant?: StatusVariant;
  iconName?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  status,
  variant,
  iconName,
  icon,
  size = "md",
  className = "",
}) => {
  let tStatus: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tStatus = useTranslations("status");
  } catch {
    // Fallback if rendered outside intl context
  }

  // If status is passed, derive config automatically
  let derivedVariant: StatusVariant = variant || "neutral";
  let derivedIconName = iconName;
  let derivedLabel = label;

  if (status) {
    const config =
      (HOST_STATUS_CONFIG as Record<string, any>)[status] ||
      (LISTING_STATUS_CONFIG as Record<string, any>)[status] ||
      (GUEST_STATUS_CONFIG as Record<string, any>)[status] ||
      (BOOKING_STATUS_CONFIG as Record<string, any>)[status] ||
      (REVIEW_STATUS_CONFIG as Record<string, any>)[status];

    if (config) {
      if (!variant) derivedVariant = config.variant;
      if (!iconName) derivedIconName = config.iconName;
    }
    
    // Check if status translation exists
    if (tStatus && tStatus.has(status)) {
      derivedLabel = tStatus(status);
    } else if (!label) {
      derivedLabel = status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  const variantStyles: Record<StatusVariant, string> = {
    success: "bg-secondary/15 text-[#35432E] border-secondary/30",
    warning: "bg-[#F3EAD8] text-[#71542C] border-[#D9C4A1]",
    danger: "bg-accent/15 text-[#8F3517] border-accent/30",
    info: "bg-primary/10 text-primary border-primary/20",
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
  };

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  const renderIcon = () => {
    if (icon) return icon;
    const iconClass = size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0";

    switch (derivedIconName) {
      case "CheckCircle":
      case "CheckCircle2":
        return <CheckCircle2 className={iconClass} />;
      case "Clock":
        return <Clock className={iconClass} />;
      case "XCircle":
        return <XCircle className={iconClass} />;
      case "AlertTriangle":
        return <AlertTriangle className={iconClass} />;
      case "Ban":
        return <Ban className={iconClass} />;
      case "Trash2":
        return <Trash2 className={iconClass} />;
      case "FileEdit":
        return <FileEdit className={iconClass} />;
      case "AlertCircle":
        return <AlertCircle className={iconClass} />;
      case "Archive":
        return <Archive className={iconClass} />;
      case "CheckCheck":
        return <CheckCheck className={iconClass} />;
      case "AlertOctagon":
        return <AlertOctagon className={iconClass} />;
      case "RotateCcw":
        return <RotateCcw className={iconClass} />;
      case "Flag":
        return <Flag className={iconClass} />;
      case "EyeOff":
        return <EyeOff className={iconClass} />;
      case "ShieldCheck":
        return <ShieldCheck className={iconClass} />;
      case "FileText":
        return <FileText className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-2xs select-none whitespace-nowrap ${
        variantStyles[derivedVariant]
      } ${sizeStyles[size]} ${className}`}
    >
      {renderIcon()}
      <span>{derivedLabel || status || "Status"}</span>
    </span>
  );
};
