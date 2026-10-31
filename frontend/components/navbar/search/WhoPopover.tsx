"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Counter from "@/components/inputs/Counter";
import Button from "@/components/ui/Button";

interface WhoPopoverProps {
  guestCount: number;
  onChangeGuests: (count: number) => void;
  title?: string;
  subtitle?: string;
  onApply?: () => void;
}

export default function WhoPopover({ guestCount, onChangeGuests, title, subtitle, onApply }: WhoPopoverProps) {
  const t = useTranslations("search");
  return (
    <div className="w-[min(22rem,calc(100vw-2rem))]">
      <Counter
        title={title ?? t("bar.home.whoTitle")}
        subtitle={subtitle ?? t("bar.home.whoSubtitle")}
        value={guestCount}
        onChange={onChangeGuests}
      />
      {onApply && (
        <div className="mt-4 flex justify-end border-t border-primary/[0.08] pt-4">
          <Button variant="secondary" size="sm" onClick={onApply}>
            {t("apply")}
          </Button>
        </div>
      )}
    </div>
  );
}
