"use client";

import React from "react";
import Counter from "@/components/inputs/Counter";
import { useTranslations } from "next-intl";

interface Props {
  guestCount: number;
  onChangeGuests: (count: number) => void;
}

export default function WhoPopover({ guestCount, onChangeGuests }: Props) {
  const t = useTranslations("common");

  return (
    <div className="bg-surface rounded-3xl shadow-xl border border-tertiary/60 p-5 w-72 sm:w-80 z-50">
      <Counter
        title={t("guests")}
        subtitle="Ages 13 or above"
        value={guestCount}
        onChange={onChangeGuests}
      />
    </div>
  );
}
