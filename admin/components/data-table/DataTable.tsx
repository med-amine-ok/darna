"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTranslations } from "next-intl";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: T) => React.ReactNode;
  mobilePriority?: "high" | "medium" | "low" | "none";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  selectedIds?: string[];
  selectedRowId?: string;
  selection?: {
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
  };
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
  emptyMessage?: string;
  className?: string;
  tableOnly?: boolean; // Keep as horizontal-scroll table even on mobile (e.g. dense ledger)
  /** Accessible name of the table (rendered as a visually hidden caption). */
  caption?: string;
  /** Accessible label of a row, used for selection checkboxes and keyboard-activatable rows. */
  rowLabel?: (row: T) => string;
}

function cellValue<T>(row: T, key: string): React.ReactNode {
  return (row as Record<string, unknown>)[key] as React.ReactNode;
}

/** Enter/Space on a focused clickable row (but not on its inner controls) activates it. */
function rowKeyHandler<T>(row: T, onRowClick?: (row: T) => void) {
  if (!onRowClick) return undefined;
  return (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick(row);
    }
  };
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectedIds = [],
  selectedRowId,
  selection,
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
  emptyMessage,
  className = "",
  tableOnly = false,
  caption,
  rowLabel,
}: DataTableProps<T>) {
  const t = useTranslations("dataTable");
  const effectiveSelectedIds = selection ? selection.selectedIds : selectedIds;
  const isSelectable = !!onSelectRow || !!selection;

  const renderSortIcon = (colKey: string) => {
    if (sortBy !== colKey) {
      return (
        <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true" />
      );
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
    );
  };

  const paddingClass = density === "compact" ? "py-2 px-3" : "py-3 px-4";

  // Identify special columns for mobile card layout
  const primaryCol = columns[0];
  const statusCol = columns.find((c) => c.key === "status" || c.key.toLowerCase().includes("status"));
  const actionsCol = columns.find((c) => c.key === "actions" || c.key.toLowerCase().includes("action"));
  const metricCols = columns.filter(
    (c) => c !== primaryCol && c !== statusCol && c !== actionsCol && c.mobilePriority !== "none"
  );

  return (
    <div className={`w-full ${className}`}>
      {/* ======================================================== */}
      {/* 1. Mobile Card List Mode (< md) unless tableOnly is true */}
      {/* ======================================================== */}
      {!tableOnly && (
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white border border-tertiary/60 shadow-xs space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-3/5 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                </div>
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-tertiary/60 shadow-xs">
              {emptyState || (
                <p className="text-neutral-500 text-xs">
                  {emptyMessage || t("empty")}
                </p>
              )}
            </div>
          ) : (
            data.map((row) => {
              const id = keyExtractor(row);
              const isSelected = effectiveSelectedIds.includes(id) || selectedRowId === id;

              return (
                <div
                  key={id}
                  onClick={() => onRowClick && onRowClick(row)}
                  onKeyDown={rowKeyHandler(row, onRowClick)}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                  className={`p-3.5 rounded-2xl bg-white border transition-all shadow-xs relative text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                    isSelected
                      ? "border-secondary ring-2 ring-secondary/20 bg-secondary/5"
                      : "border-tertiary/60 hover:border-tertiary-400 active:scale-[0.99]"
                  } ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {/* Card Header: Primary Content + Status + Selection */}
                  <div className="flex items-start justify-between gap-2.5 pb-2 border-b border-neutral-100">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {isSelectable && (
                        <div
                          className="pt-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {
                              if (selection) {
                                if (isSelected) {
                                  selection.onSelectionChange(
                                    effectiveSelectedIds.filter((item) => item !== id)
                                  );
                                } else {
                                  selection.onSelectionChange([...effectiveSelectedIds, id]);
                                }
                              } else if (onSelectRow) {
                                onSelectRow(id);
                              }
                            }}
                            aria-label={t("selectRow", { label: rowLabel ? rowLabel(row) : id })}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {primaryCol.render ? primaryCol.render(row) : cellValue(row, primaryCol.key)}
                      </div>
                    </div>

                    {/* Status Pill on top right/end */}
                    {statusCol && (
                      <div className="shrink-0">
                        {statusCol.render ? statusCol.render(row) : cellValue(row, statusCol.key)}
                      </div>
                    )}
                  </div>

                  {/* Card Body: Key metrics in a 2-column grid */}
                  {metricCols.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
                      {metricCols.slice(0, 4).map((col) => (
                        <div key={col.key} className="min-w-0">
                          <span className="block text-[10px] font-semibold text-neutral-500 truncate">
                            {col.header}
                          </span>
                          <div className="text-xs font-medium text-neutral-700 truncate mt-0.5">
                            {col.render ? col.render(row) : cellValue(row, col.key)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  {actionsCol && (
                    <div
                      className="pt-2 mt-2 border-t border-neutral-100 flex items-center justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actionsCol.render ? actionsCol.render(row) : cellValue(row, actionsCol.key)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. Desktop Full Table Mode (hidden on mobile if card)   */}
      {/* ======================================================== */}
      <div
        className={`w-full overflow-hidden rounded-2xl bg-white border border-tertiary/60 shadow-darna-card ${
          tableOnly ? "block" : "hidden md:block"
        }`}
      >
        <div className="w-full overflow-x-auto darna-admin-scrollbar">
          <table className="w-full text-start border-collapse text-xs">
            {caption && <caption className="sr-only">{caption}</caption>}
            {/* Sticky Header */}
            <thead className="bg-darnaBg/70 border-b border-tertiary/60 select-none sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                {isSelectable && (
                  <th scope="col" className="py-3 px-4 w-10 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      onChange={onSelectAll}
                      aria-label={t("selectAll")}
                    />
                  </th>
                )}

                {columns.map((col, cIdx) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-end"
                      : col.align === "center"
                      ? "text-center"
                      : "text-start";

                  // Sticky first column for dense/tableOnly tables
                  const stickyFirstCol =
                    tableOnly && cIdx === 0
                      ? "sticky start-0 bg-darnaBg z-10 shadow-xs"
                      : "";

                  return (
                    <th
                      key={col.key}
                      className={`${paddingClass} font-semibold text-neutral-600 text-xs ${alignClass} ${stickyFirstCol} ${
                        col.className || ""
                      }`}
                      scope="col"
                      aria-sort={
                        col.sortable && onSort
                          ? sortBy === col.key
                            ? sortOrder === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                          : undefined
                      }
                    >
                      {col.sortable && onSort ? (
                        <button
                          type="button"
                          onClick={() => onSort(col.key)}
                          className="group inline-flex items-center gap-1.5 font-bold hover:text-primary transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
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
                <tr>
                  <td
                    colSpan={columns.length + (isSelectable ? 1 : 0)}
                    className="p-8 text-center"
                  >
                    {emptyState || (
                      <p className="text-neutral-500 text-xs">
                        {emptyMessage || t("empty")}
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const id = keyExtractor(row);
                  const isSelected =
                    effectiveSelectedIds.includes(id) || selectedRowId === id;

                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick && onRowClick(row)}
                      onKeyDown={rowKeyHandler(row, onRowClick)}
                      tabIndex={onRowClick ? 0 : undefined}
                      className={`transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 ${
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
                            onChange={() => {
                              if (selection) {
                                if (isSelected) {
                                  selection.onSelectionChange(
                                    effectiveSelectedIds.filter((item) => item !== id)
                                  );
                                } else {
                                  selection.onSelectionChange([
                                    ...effectiveSelectedIds,
                                    id,
                                  ]);
                                }
                              } else if (onSelectRow) {
                                onSelectRow(id);
                              }
                            }}
                            aria-label={t("selectRow", { label: rowLabel ? rowLabel(row) : id })}
                          />
                        </td>
                      )}

                      {columns.map((col, cIdx) => {
                        const alignClass =
                          col.align === "right"
                            ? "text-end"
                            : col.align === "center"
                            ? "text-center"
                            : "text-start";

                        const stickyFirstCol =
                          tableOnly && cIdx === 0
                            ? "sticky start-0 bg-white z-1 shadow-xs"
                            : "";

                        return (
                          <td
                            key={col.key}
                            className={`${paddingClass} ${alignClass} text-neutral-700 ${stickyFirstCol} ${
                              col.className || ""
                            }`}
                          >
                            {col.render ? col.render(row) : cellValue(row, col.key)}
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
    </div>
  );
}
