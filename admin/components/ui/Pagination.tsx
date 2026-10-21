"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = "",
}) => {
  const t = useTranslations("common");
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600 select-none py-3 px-2 ${className}`}
    >
      {/* Range and total items info */}
      <div className="flex items-center gap-3">
        <span>
          <span className="font-bold text-primary tabular-nums">{startItem}</span> -{" "}
          <span className="font-bold text-primary tabular-nums">{endItem}</span> {t("of")}{" "}
          <span className="font-bold text-primary tabular-nums">{totalItems}</span> {t("results")}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ms-2 ps-3 border-s border-tertiary/60">
            <span className="text-[11px] text-neutral-500">{t("rows")}:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs bg-white rounded-lg border border-tertiary/70 px-2 py-0.5 focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </Button>

        <span className="px-3 py-1 font-semibold text-primary tabular-nums text-xs">
          {t("page")} {currentPage} {t("of")} {Math.max(1, totalPages)}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
};
