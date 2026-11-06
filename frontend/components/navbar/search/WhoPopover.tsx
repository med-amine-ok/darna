"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Counter from "@/components/inputs/Counter";
import Button from "@/components/ui/Button";

/** Party details collected by the search bar. `guests` (adults + children) is what search filters on. */
export interface Party {
  adults: number;
  children: number;
  infants: number;
  rooms: number;
}

export const DEFAULT_PARTY: Party = { adults: 1, children: 0, infants: 0, rooms: 1 };

export function partyGuests(p: Party): number {
  return p.adults + p.children;
}

type Vertical = "home" | "hotel" | "experience" | "vehicle" | "trip";

/** Which counters each vertical asks for. */
const FIELDS: Record<Vertical, (keyof Party)[]> = {
  home: ["adults", "children", "infants"],
  hotel: ["rooms", "adults", "children"],
  experience: ["adults", "children"],
  trip: ["adults", "children"],
  vehicle: ["adults"],
};

const MAX: Record<keyof Party, number> = { adults: 16, children: 10, infants: 5, rooms: 8 };

interface WhoPopoverProps {
  vertical: Vertical;
  party: Party;
  onChange: (next: Party) => void;
  onApply?: () => void;
}

export default function WhoPopover({ vertical, party, onChange, onApply }: WhoPopoverProps) {
  const t = useTranslations("search");
  const fields = FIELDS[vertical] ?? FIELDS.home;

  const title = (f: keyof Party) => (vertical === "vehicle" && f === "adults" ? t("who.passengers") : t(`who.${f}`));
  const subtitle = (f: keyof Party) => (vertical === "vehicle" && f === "adults" ? t("who.passengersHint") : t(`who.${f}Hint`));

  return (
    <div className="w-[min(22rem,calc(100vw-2rem))]">
      <div className="divide-y divide-primary/[0.08]">
        {fields.map((f) => (
          <Counter
            key={f}
            title={title(f)}
            subtitle={subtitle(f)}
            value={party[f]}
            minValue={f === "adults" || f === "rooms" ? 1 : 0}
            maxValue={MAX[f]}
            onChange={(v) => {
              const next = { ...party, [f]: v };
              // A room needs at least one adult.
              if (f === "rooms" && next.adults < v) next.adults = v;
              onChange(next);
            }}
          />
        ))}
      </div>
      {(vertical === "home" || vertical === "hotel") && party.infants + party.children > 0 && (
        <p className="mt-2 text-meta text-primary-600">{t("who.childrenNote")}</p>
      )}
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
