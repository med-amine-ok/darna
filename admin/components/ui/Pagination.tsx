"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

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
  const displayLabel = itemLabel || entityName || "éléments";
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

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
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600 select-none py-3.5 px-2 ${className}`}
    >
      {/* Summary: Affichage de 1 à 10 sur 124 */}
      <div className="flex items-center gap-1.5 text-center sm:text-start text-neutral-500">
        <span>
          Affichage de{" "}
          <span className="font-bold text-primary tabular-nums">{startItem}</span> à{" "}
          <span className="font-bold text-primary tabular-nums">{endItem}</span> sur{" "}
          <span className="font-bold text-primary tabular-nums">{totalItems}</span> {displayLabel}
        </span>
      </div>

      {/* ======================================================== */}
      {/* Mobile Compact Stepper (< sm)                           */}
      {/* ======================================================== */}
      <div className="flex sm:hidden items-center justify-between w-full pt-1 border-t border-neutral-100">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="min-h-[44px] px-3.5 rounded-xl border border-tertiary-300 bg-white hover:bg-neutral-50 flex items-center gap-1 text-primary font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs active:scale-95"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>Précédent</span>
        </button>

        <span className="font-bold text-primary text-xs font-mono">
          {currentPage} / {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="min-h-[44px] px-3.5 rounded-xl border border-tertiary-300 bg-white hover:bg-neutral-50 flex items-center gap-1 text-primary font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs active:scale-95"
          aria-label="Next Page"
        >
          <span>Suivant</span>
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* Desktop Full Numbered Controls (sm+)                     */}
      {/* ======================================================== */}
      <div className="hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className="w-8 h-8 rounded-lg border border-tertiary-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Première page"
          >
            <ChevronsLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          {/* Previous */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="w-8 h-8 rounded-lg border border-tertiary-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((p, idx) =>
            typeof p === "string" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-neutral-400">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition ${
                  currentPage === p
                    ? "bg-primary text-white shadow-xs"
                    : "border border-tertiary-200 bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="w-8 h-8 rounded-lg border border-tertiary-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="w-8 h-8 rounded-lg border border-tertiary-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Dernière page"
          >
            <ChevronsRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Page size dropdown */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ms-2">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 rounded-lg border border-tertiary-300 bg-white text-xs font-medium text-neutral-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              {[10, 12, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
