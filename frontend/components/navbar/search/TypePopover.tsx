"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandCheckIcon } from "@/components/icons";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui";
import { EXPERIENCE_TYPES, TRIP_TYPES, experienceTypeLabel, tripTypeLabel } from "@/lib/catalog-types";

interface TypePopoverProps {
  vertical: "experience" | "trip";
  selected: string[];
  onChange: (next: string[]) => void;
  onApply?: () => void;
}

/** First step of the experience / trip search: what kind of activity or trip (multi-select chips). */
export default function TypePopover({ vertical, selected, onChange, onApply }: TypePopoverProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const ids: readonly string[] = vertical === "experience" ? EXPERIENCE_TYPES : TRIP_TYPES;
  const label = (id: string) => (vertical === "experience" ? experienceTypeLabel(id, locale) : tripTypeLabel(id, locale));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-sm font-medium cursor-pointer select-none",
      "transition-[background-color,color,box-shadow] duration-fast ease-standard",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2",
      active ? "bg-primary-800 text-white shadow-e1" : "bg-white text-primary-900 ring-1 ring-inset ring-tertiary-300 hover:ring-primary-400"
    );

  return (
    <div className="w-[min(26rem,calc(100vw-2rem))]">
      <p className="text-eyebrow uppercase font-semibold text-primary-700">{t(`bar.${vertical}.typeTitle`)}</p>
      <div role="group" aria-label={t(`bar.${vertical}.typeTitle`)} className="mt-3 flex flex-wrap gap-2">
        <button type="button" aria-pressed={selected.length === 0} onClick={() => onChange([])} className={chip(selected.length === 0)}>
          {t(`bar.${vertical}.typeAny`)}
        </button>
        {ids.map((id) => {
          const active = selected.includes(id);
          return (
            <button key={id} type="button" aria-pressed={active} onClick={() => toggle(id)} className={chip(active)}>
              {active && <BrandCheckIcon size={14} strokeWidth={2.4} aria-hidden="true" />}
              {label(id)}
            </button>
          );
        })}
      </div>
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
