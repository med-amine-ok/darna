"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { Badge, Button, Dialog, SuccessCelebration } from "@/components/ui";

export interface BookingSummaryRow {
  label: string;
  value: React.ReactNode;
}

interface BookingSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** "confirmed" (instant) or "pending" (request to book). */
  status: "confirmed" | "pending";
  /** Listing / trip name shown under the title. */
  itemTitle: string;
  /** Dates, guests, room, total… in display order. */
  rows: BookingSummaryRow[];
}

/**
 * The brand "done" moment after a booking: SuccessCelebration (arch, rosette burst, check)
 * plus a compact summary and two actions. Navigation happens only on click.
 */
export default function BookingSuccessDialog({ isOpen, onClose, status, itemTitle, rows }: BookingSuccessDialogProps) {
  const t = useTranslations("listing.success");
  const router = useRouter();
  const pending = status === "pending";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} ariaLabel={pending ? t("requestTitle") : t("confirmedTitle")} showClose size="md">
      <SuccessCelebration
        size={148}
        title={pending ? t("requestTitle") : t("confirmedTitle")}
        description={pending ? t("requestDesc") : t("confirmedDesc")}
      />

      <div className="mt-6 rounded-2xl bg-darnaBg ring-1 ring-primary/[0.06] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-serif text-title text-primary-900 min-w-0">{itemTitle}</p>
          <Badge tone={pending ? "warning" : "success"} dot className="shrink-0">
            {pending ? t("statusRequest") : t("statusInstant")}
          </Badge>
        </div>
        <dl className="mt-3 divide-y divide-primary/[0.08] text-body">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-primary-600">{row.label}</dt>
              <dd className="text-end font-semibold text-primary-900 tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
        <Button variant="tertiary" fullWidth onClick={onClose}>
          {t("keepBrowsing")}
        </Button>
        <Button
          fullWidth
          onClick={() => {
            onClose();
            // Navigate only: /trips is dynamic and fetches fresh data.
            router.push("/trips");
          }}
        >
          {t("viewTrips")}
        </Button>
      </div>
    </Dialog>
  );
}
