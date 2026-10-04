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

    // Fetch live rate once on client if not already fetched or fresh
    if (!isFetching && globalRate === DEFAULT_EUR_TO_DZD) {
      isFetching = true;
      fetch("/api/exchange-rate")
        .then((res) => res.json())
        .then((data) => {
          if (data?.rate && typeof data.rate === "number") {
            globalRate = data.rate;
            listeners.forEach((fn) => fn(data.rate));
          }
        })
        .catch((err) => {
          console.warn("Could not fetch live exchange rate, using default:", err);
        })
        .finally(() => {
          isFetching = false;
        });
    }

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
