"use client";

import { useState, useEffect } from "react";
import { DEFAULT_EUR_TO_DZD, convertDzdToEur, formatDzd, formatEur, formatPriceWithEur } from "@/lib/currency";
import { useLocale } from "next-intl";

let globalRate: number = DEFAULT_EUR_TO_DZD;
let isFetching: boolean = false;
const listeners = new Set<(rate: number) => void>();

export function useCurrency() {
  const locale = useLocale();
  const [rate, setRate] = useState<number>(globalRate);

  useEffect(() => {
    const handleRateChange = (newRate: number) => {
      setRate(newRate);
    };

    listeners.add(handleRateChange);

    return () => {
      listeners.delete(handleRateChange);
    };
  }, []);

  return {
    rate,
    formatDzd: (amount: number) => formatDzd(amount, locale),
    formatEur: (eurAmount: number) => formatEur(eurAmount, locale),
    convertToEur: (dzdAmount: number) => convertDzdToEur(dzdAmount, rate),
    formatPriceWithEur: (dzdAmount: number) => formatPriceWithEur(dzdAmount, rate, locale),
  };
}
