"use client";

import React, { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  isLoading?: boolean;
  density?: "comfortable" | "compact";
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  isAllSelected = false,
  sortBy,
  sortOrder = "desc",
  onSort,
  isLoading = false,
  density = "comfortable",
  onRowClick,
  emptyState,
  className = "",
}: DataTableProps<T>) {
  const isSelectable = !!onSelectRow;

  const renderSortIcon = (colKey: string) => {
    if (sortBy !== colKey) {
      return <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-secondary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-secondary" />
    );
  };

  const paddingClass = density === "compact" ? "py-2 px-3" : "py-3 px-4";

  return (
    <div className={`w-full overflow-hidden rounded-2xl bg-white border border-tertiary/60 shadow-darna-card ${className}`}>
      <div className="w-full overflow-x-auto darna-admin-scrollbar">
        <table className="w-full text-start border-collapse text-xs">
          {/* Sticky Header */}
          <thead className="bg-darnaBg/70 border-b border-tertiary/60 select-none sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              {isSelectable && (
                <th className="py-3 px-4 w-10 text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    aria-label="Select all displayed rows"
                  />
                </th>
              )}

              {columns.map((col) => {
                const alignClass =
                  col.align === "right"
                    ? "text-end"
                    : col.align === "center"
                    ? "text-center"
                    : "text-start";

                return (
                  <th
                    key={col.key}
                    className={`${paddingClass} font-semibold text-neutral-600 text-xs ${alignClass} ${col.className || ""}`}
                    aria-sort={sortBy === col.key ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="group inline-flex items-center gap-1.5 font-bold hover:text-primary transition focus:outline-none"
                      >
                        <span>{col.header}</span>
                        {renderSortIcon(col.key)}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 6 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {isSelectable && (
                    <td className="py-3 px-4 text-center">
                      <Skeleton className="w-4 h-4 mx-auto" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={paddingClass}>
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length + (isSelectable ? 1 : 0)} className="p-8 text-center">
                  {emptyState || <p className="text-neutral-400 text-xs">No records found</p>}
                </td>
              </tr>
            ) : (
              // Real Data Rows
              data.map((row) => {
                const id = keyExtractor(row);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-150 ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${
                      isSelected
                        ? "bg-secondary/10 hover:bg-secondary/15"
                        : "hover:bg-darnaBg/40 active:bg-darnaBg/70"
                    }`}
                  >
                    {isSelectable && (
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => onSelectRow && onSelectRow(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}

                    {columns.map((col) => {
                      const alignClass =
                        col.align === "right"
                          ? "text-end"
                          : col.align === "center"
                          ? "text-center"
                          : "text-start";

                      return (
                        <td
                          key={col.key}
                          className={`${paddingClass} ${alignClass} text-neutral-700 ${col.className || ""}`}
                        >
                          {col.render ? col.render(row) : (row as any)[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
