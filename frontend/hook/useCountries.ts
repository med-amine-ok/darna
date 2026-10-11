// @ts-ignore
import countries from "world-countries";

export interface FormattedCountry {
  value: string;
  label: string;
  flag: string;
  latlng: number[];
  region: string;
}

const formattedCountries: FormattedCountry[] = (countries as any[]).map((country: any) => ({
  value: country.cca2,
  label: country.name.common,
  flag: country.flag,
  latlng: country.latlng,
  region: country.region,
}));

export const useCountries = () => {
  const getAll = (): FormattedCountry[] => formattedCountries;

  const getByValue = (value: string): FormattedCountry | undefined => {
    return formattedCountries.find((item: FormattedCountry) => item.value === value);
  };

  return {
    getAll,
    getByValue,
  };
};

export default useCountries;
