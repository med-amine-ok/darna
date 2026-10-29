"use client";

import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { deleteListing, exportListings, restoreListing, updateListingStatus } from "@/lib/actions/listings";
import { downloadCsv } from "@/lib/utils/download";
import { unwrap } from "@/lib/actions/result";
import {
  canTransitionListing,
  normalizeListingStatus,
  LISTING_STATUSES_REQUIRING_REASON,
} from "@/lib/domain/transitions";
import type { Listing, ListingStatus, Permission } from "@/lib/types";

type Target = Extract<ListingStatus, "approved" | "pending_review" | "suspended" | "rejected" | "changes_requested" | "archived">;

function permissionFor(target: Target): Permission {
  if (target === "rejected") return "listings.reject";
  if (target === "suspended" || target === "archived") return "listings.suspend";
  return "listings.approve";
}

/**
 * Shared, guarded listing status actions for the vertical list pages.
 *  - `allowed(listing, target)` = permission AND the transition map allows it;
 *  - targets that need a reason (rejected / suspended / changes_requested)
 *    open a ReasonDialog, the others run immediately;
 *  - every call has success + error toasts and calls `onDone` (refetch).
 * Render `dialog` once in the page.
 */
export function useListingStatusActions(onDone: () => void) {
  const t = useTranslations("actions");
  const { addToast } = useToast();
  const can = useCan();
  const [pending, setPending] = useState<{ listing: Listing; target: Target } | null>(null);

  const allowed = useCallback(
    (listing: Pick<Listing, "status">, target: Target) =>
      can(permissionFor(target)) && canTransitionListing(listing.status, target),
    [can]
  );
  const canDelete = useCallback(
    (listing: Pick<Listing, "status">) => can("listings.delete") && canTransitionListing(listing.status, "deleted"),
    [can]
  );
  const canRestore = useCallback(
    (listing: Pick<Listing, "status">) => can("listings.delete") && listing.status === "deleted",
    [can]
  );

  const run = useCallback(
    async (fn: () => Promise<unknown>, successTitle: string) => {
      try {
        await fn();
        addToast({ title: successTitle, variant: "success" });
        onDone();
        return true;
      } catch (err: unknown) {
        addToast({ title: t("actionFailed"), description: err instanceof Error ? err.message : undefined, variant: "danger" });
        return false;
      }
    },
    [addToast, onDone, t]
  );

  const changeStatus = useCallback(
    async (listing: Listing, target: Target) => {
      if (LISTING_STATUSES_REQUIRING_REASON.includes(normalizeListingStatus(target))) {
        setPending({ listing, target });
        return;
      }
      await run(async () => unwrap(await updateListingStatus(listing.id, target)), t("statusUpdated"));
    },
    [run, t]
  );

  const remove = useCallback(
    (listing: Listing, successTitle: string) =>
      run(async () => unwrap(await deleteListing(listing.id)), successTitle),
    [run]
  );

  const restore = useCallback(
    (listing: Listing) => run(async () => unwrap(await restoreListing(listing.id)), t("restored")),
    [run, t]
  );

  /** Server-side CSV of the full filtered dataset (audited); needs reports.export. */
  const canExport = can("reports.export") && can("listings.view");
  const exportCsv = useCallback(
    async (params: Parameters<typeof exportListings>[0]) => {
      try {
        const res = unwrap(await exportListings(params));
        downloadCsv(res.filename, res.csv);
        addToast({ title: t("exportStarted"), description: t("exportRows", { count: res.rowCount }), variant: "success" });
      } catch (err: unknown) {
        addToast({ title: t("exportFailed"), description: err instanceof Error ? err.message : undefined, variant: "danger" });
      }
    },
    [addToast, t]
  );

  const titles: Record<string, string> = {
    rejected: t("rejectListingTitle"),
    suspended: t("suspendListingTitle"),
    changes_requested: t("requestChangesTitle"),
  };
  const labels: Record<string, string> = {
    rejected: t("reject"),
    suspended: t("suspend"),
    changes_requested: t("requestChanges"),
  };

  const dialog = (
    <ReasonDialog
      isOpen={!!pending}
      title={pending ? titles[pending.target] ?? t("confirm") : ""}
      description={pending?.listing.title}
      confirmLabel={pending ? labels[pending.target] : undefined}
      variant={pending?.target === "changes_requested" ? "primary" : "danger"}
      onCancel={() => setPending(null)}
      onConfirm={async (reason) => {
        if (!pending) return;
        const { listing, target } = pending;
        const ok = await run(
          async () => unwrap(await updateListingStatus(listing.id, target, reason)),
          t("statusUpdated")
        );
        if (ok) setPending(null);
      }}
    />
  );

  return { allowed, canDelete, canRestore, changeStatus, remove, restore, canExport, exportCsv, dialog };
}
