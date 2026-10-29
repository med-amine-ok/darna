"use client";

import React, { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  entityName?: string;
  itemLabel?: string;
  className?: string;
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const iconBtn = `w-8 h-8 rounded-lg border border-tertiary-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition ${focusRing}`;
const mobileBtn = `min-h-[44px] px-3.5 rounded-xl border border-tertiary-300 bg-white hover:bg-neutral-50 flex items-center gap-1 text-primary font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs active:scale-95 ${focusRing}`;

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  entityName,
  itemLabel,
  className = "",
}) => {
  const t = useTranslations("uiKit.pagination");
  const locale = useLocale();
  const pageSizeId = useId();
  const n = (value: number) => formatNumber(value, locale);
  const displayLabel = itemLabel || entityName || t("items");
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const lastPage = Math.max(1, totalPages);

  // Compute page numbers with ellipsis for desktop view
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <nav
      aria-label={t("nav")}
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600 select-none py-3.5 px-2 ${className}`}
    >
      {/* Summary: "Showing 1 to 10 of 124 items" */}
      <div className="flex items-center gap-1.5 text-center sm:text-start text-neutral-500">
        <span aria-live="polite">
          {t.rich("summary", {
            start: n(startItem),
            end: n(endItem),
            total: n(totalItems),
            label: displayLabel,
            b: (chunks) => <span className="font-bold text-primary tabular-nums">{chunks}</span>,
          })}
        </span>
      </div>

      {/* Mobile Compact Stepper (< sm) */}
      <div className="flex sm:hidden items-center justify-between w-full pt-1 border-t border-neutral-100">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={mobileBtn}
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          <span>{t("previous")}</span>
        </button>

        <span className="font-bold text-primary text-xs font-mono">
          <span aria-hidden="true">
            {n(currentPage)} / {n(lastPage)}
          </span>
          <span className="sr-only">{t("pageOf", { page: n(currentPage), total: n(lastPage) })}</span>
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={mobileBtn}
        >
          <span>{t("next")}</span>
          <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>

      {/* Desktop Full Numbered Controls (sm+) */}
      <div className="hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className={iconBtn}
            title={t("firstPage")}
            aria-label={t("firstPage")}
          >
            <ChevronsLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </button>

          {/* Previous */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className={iconBtn}
            title={t("previousPage")}
            aria-label={t("previousPage")}
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((p, idx) =>
            typeof p === "string" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-neutral-500" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={t("page", { page: n(p) })}
                aria-current={currentPage === p ? "page" : undefined}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition ${focusRing} ${
                  currentPage === p
                    ? "bg-primary text-white shadow-xs"
                    : "border border-tertiary-200 bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                {n(p)}
              </button>
            )
          )}

          {/* Next */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className={iconBtn}
            title={t("nextPage")}
            aria-label={t("nextPage")}
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className={iconBtn}
            title={t("lastPage")}
            aria-label={t("lastPage")}
          >
            <ChevronsRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>

        {/* Page size dropdown */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ms-2">
            <label htmlFor={pageSizeId} className="sr-only">
              {t("pageSize")}
            </label>
            <select
              id={pageSizeId}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 rounded-lg border border-tertiary-300 bg-white text-xs font-medium text-neutral-700 focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600/40 cursor-pointer"
            >
              {[10, 12, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {t("perPage", { size: n(size) })}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </nav>
  );
};
