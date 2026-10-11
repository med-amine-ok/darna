"use client";

import React from "react";
import { useCurrency } from "@/hook/useCurrency";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  period?: string;
  className?: string;
  priceClassName?: string;
  eurClassName?: string;
  showEur?: boolean;
}

export default function PriceDisplay({
  price,
  originalPrice,
  period,
  className = "",
  priceClassName = "font-bold text-neutral-900",
  eurClassName = "text-xs text-neutral-500 font-normal",
  showEur = true,
}: PriceDisplayProps) {
  const { formatDzd, convertToEur, formatEur } = useCurrency();

  const formattedDzd = formatDzd(price);
  const eurVal = convertToEur(price);
  const formattedEur = formatEur(eurVal);

  return (
    <div className={`inline-flex items-baseline gap-1.5 flex-wrap ${className}`}>
      {originalPrice && originalPrice > price && (
        <span className="line-through text-neutral-400 text-xs font-normal">
          {formatDzd(originalPrice)}
        </span>
      )}
      <span className={priceClassName}>{formattedDzd}</span>
      {showEur && (
        <span className={`select-none ${eurClassName}`}>
          ({formattedEur})
        </span>
      )}
      {period && (
        <span className="font-normal text-neutral-500 text-xs sm:text-sm">
          {period}
        </span>
      )}
    </div>
  );
}
