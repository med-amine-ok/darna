"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { findDestination } from "@/components/search/destinations";

/** Localized display name for a `?destination=` value (falls back to the raw text the user typed). */
export function useDestinationLabel() {
  const t = useTranslations("search.destinations");
  return useCallback(
    (value?: string | null) => {
      const known = findDestination(value);
      return known ? t(`${known.key}.name`) : value ?? "";
    },
    [t]
  );
}
