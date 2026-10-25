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

  // Compute page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

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
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600 select-none py-3.5 px-2 ${className}`}
    >
      {/* Left Summary: Affichage de 1 à 10 sur 124 ... */}
      <div className="flex items-center gap-2">
        <span>
          Affichage de{" "}
          <span className="font-bold text-primary tabular-nums">{startItem}</span> à{" "}
          <span className="font-bold text-primary tabular-nums">{endItem}</span> sur{" "}
          <span className="font-bold text-primary tabular-nums">{totalItems}</span> {displayLabel}
        </span>
      </div>

      {/* Center / Right: Numbered Pagination Controls & Page Size */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {/* Previous Button */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="w-8 h-8 rounded-lg border border-tertiary-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          {/* Number Buttons */}
          {getPageNumbers().map((page, idx) => {
            if (page === "...") {
              return (
                <span key={idx} className="w-8 h-8 flex items-center justify-center text-neutral-400">
                  ...
                </span>
              );
            }

            const pageNum = Number(page);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition tabular-nums cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-2xs"
                    : "border border-tertiary-200 bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="w-8 h-8 rounded-lg border border-tertiary-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Page Size Dropdown */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ms-2 ps-3 border-s border-neutral-200">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs bg-white rounded-lg border border-tertiary-200 px-2.5 py-1.5 font-medium text-neutral-700 focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
            >
              <option value={10}>10 par page</option>
              <option value={25}>25 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
