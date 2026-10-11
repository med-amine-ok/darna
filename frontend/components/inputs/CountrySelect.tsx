"use client";

import React from "react";
import Select from "react-select";
import Flag from "react-world-flags";
import { useCountries } from "@/hook/useCountries";
import { tokens } from "@/lib/tokens";
import { useTranslations } from "next-intl";

export interface CountrySelectValue {
  flag: string;
  label: string;
  latlng: number[];
  region: string;
  value: string;
}

interface CountrySelectProps {
  value?: CountrySelectValue;
  onChange: (value: CountrySelectValue) => void;
}

export default function CountrySelect({ value, onChange }: CountrySelectProps) {
  const { getAll } = useCountries();
  const tCommon = useTranslations("common");

  return (
    <div>
      <Select
        placeholder={tCommon("anywhere") || "Search destinations..."}
        isClearable
        options={getAll()}
        value={value}
        onChange={(val) => onChange(val as CountrySelectValue)}
        formatOptionLabel={(option: any) => (
          <div className="flex flex-row items-center gap-2.5">
            <Flag code={option.value} className="w-5 flex-shrink-0 rounded-2xs shadow-2xs" />
            <div className="text-sm text-primary">
              {option.label},
              <span className="text-neutral-500 ms-1">{option.region}</span>
            </div>
          </div>
        )}
        classNames={{
          control: () => "p-2 border rounded-xl border-tertiary",
          input: () => "text-base",
          option: () => "text-sm",
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 12,
          colors: {
            ...theme.colors,
            primary: tokens.colors.primary.DEFAULT,
            primary25: tokens.colors.accent[100],
          },
        })}
      />
    </div>
  );
}
