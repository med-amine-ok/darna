"use client";

import useCountries from "@/hook/useCountries";
import Select from "react-select";
import Image from "next/image";
import Flag from "react-world-flags";
import { tokens } from "@/lib/tokens";

import { useTranslations } from "next-intl";

export type CountrySelectValue = {
  flag: string;
  label: string;
  latlng: number[];
  region: string;
  value: string;
};

type Props = {
  value?: CountrySelectValue;
  onChange: (value: CountrySelectValue) => void;
};

function CountrySelect({ value, onChange }: Props) {
  const { getAll } = useCountries();
  const t = useTranslations("common");

  return (
    <div>
      <Select
        placeholder={t("anywhere")}
        isClearable
        options={getAll()}
        value={value}
        onChange={(value) => onChange(value as CountrySelectValue)}
        formatOptionLabel={(option: any) => (
          <div className="flex flex-row items-center gap-2.5">
            <Image
              src="/assets/location.png"
              alt=""
              width={14}
              height={20}
              className="object-contain flex-shrink-0"
            />
            <Flag code={option.value} className="w-5 flex-shrink-0 rounded-2xs shadow-2xs" />
            <div className="text-sm">
              {option.label},
              <span className="text-neutral-500 ms-1">{option.region}</span>
            </div>
          </div>
        )}
        classNames={{
          control: () => "p-3 border-2",
          input: () => "text-lg",
          option: () => "text-lg",
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 6,
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

export default CountrySelect;
