import { HostStatus, ListingStatus, GuestStatus, BookingStatus, ReviewStatus } from "@/lib/types";

export interface StatusConfig {
  labelKey: string;
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  iconName: string;
}

export const HOST_STATUS_CONFIG: Record<HostStatus, StatusConfig> = {
  applied: { labelKey: "status.applied", variant: "info", iconName: "FileText" },
  under_review: { labelKey: "status.under_review", variant: "warning", iconName: "Clock" },
  approved: { labelKey: "status.approved", variant: "success", iconName: "CheckCircle" },
  rejected: { labelKey: "status.rejected", variant: "danger", iconName: "XCircle" },
  suspended: { labelKey: "status.suspended", variant: "danger", iconName: "AlertTriangle" },
  banned: { labelKey: "status.banned", variant: "danger", iconName: "Ban" },
  deleted: { labelKey: "status.deleted", variant: "neutral", iconName: "Trash2" },
};

export const LISTING_STATUS_CONFIG: Record<ListingStatus, StatusConfig> = {
  draft: { labelKey: "status.draft", variant: "neutral", iconName: "FileEdit" },
  pending_review: { labelKey: "status.pending_review", variant: "warning", iconName: "Clock" },
  approved: { labelKey: "status.approved", variant: "success", iconName: "CheckCircle" },
  changes_requested: { labelKey: "status.changes_requested", variant: "warning", iconName: "AlertCircle" },
  rejected: { labelKey: "status.rejected", variant: "danger", iconName: "XCircle" },
  suspended: { labelKey: "status.suspended", variant: "danger", iconName: "AlertTriangle" },
  archived: { labelKey: "status.archived", variant: "neutral", iconName: "Archive" },
  deleted: { labelKey: "status.deleted", variant: "neutral", iconName: "Trash2" },
};

export const GUEST_STATUS_CONFIG: Record<GuestStatus, StatusConfig> = {
  active: { labelKey: "status.active", variant: "success", iconName: "CheckCircle" },
  suspended: { labelKey: "status.suspended", variant: "warning", iconName: "AlertTriangle" },
  banned: { labelKey: "status.banned", variant: "danger", iconName: "Ban" },
  deleted: { labelKey: "status.deleted", variant: "neutral", iconName: "Trash2" },
};

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  pending: { labelKey: "status.pending", variant: "warning", iconName: "Clock" },
  confirmed: { labelKey: "status.confirmed", variant: "success", iconName: "CheckCircle" },
  completed: { labelKey: "status.completed", variant: "info", iconName: "CheckCheck" },
  cancelled: { labelKey: "status.cancelled", variant: "neutral", iconName: "XCircle" },
  disputed: { labelKey: "status.disputed", variant: "danger", iconName: "AlertOctagon" },
  refunded: { labelKey: "status.refunded", variant: "info", iconName: "RotateCcw" },
};

export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, StatusConfig> = {
  published: { labelKey: "status.published", variant: "success", iconName: "CheckCircle" },
  flagged: { labelKey: "status.flagged", variant: "warning", iconName: "Flag" },
  hidden: { labelKey: "status.hidden", variant: "neutral", iconName: "EyeOff" },
  deleted: { labelKey: "status.deleted", variant: "danger", iconName: "Trash2" },
};

// Allowed State Transitions
export const HOST_TRANSITIONS: Record<HostStatus, HostStatus[]> = {
  applied: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected", "applied"],
  approved: ["suspended", "banned", "deleted"],
  rejected: ["under_review", "approved", "deleted"],
  suspended: ["approved", "banned", "deleted"],
  banned: ["suspended", "deleted"],
  deleted: ["approved", "suspended"], // restore
};

export const LISTING_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ["pending_review", "deleted"],
  pending_review: ["approved", "changes_requested", "rejected"],
  changes_requested: ["pending_review", "approved", "rejected"],
  approved: ["suspended", "archived", "deleted"],
  rejected: ["pending_review", "deleted"],
  suspended: ["approved", "deleted"],
  archived: ["approved", "deleted"],
  deleted: ["approved", "archived"], // restore
};
