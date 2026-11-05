"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
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
        <ArrowUpDown className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true" />
      );
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
    );
  };

  const paddingClass = density === "compact" ? "py-2 px-2.5" : "py-3 px-3";
  const skeletonWidths = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-3/5"];

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
                className="p-3.5 rounded-2xl bg-white shadow-e1 space-y-3"
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
            <div className="text-center bg-white rounded-2xl shadow-e1">
              {emptyState || <EmptyState size="compact" title={emptyMessage || t("empty")} />}
            </div>
          ) : (
            data.map((row) => {
              const id = keyExtractor(row);
              const isChecked = effectiveSelectedIds.includes(id);
              const isSelected = isChecked || selectedRowId === id;

              return (
                <div
                  key={id}
                  onClick={() => onRowClick && onRowClick(row)}
                  onKeyDown={rowKeyHandler(row, onRowClick)}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                  className={`p-3.5 rounded-2xl bg-white transition-[box-shadow,transform] duration-fast ease-standard relative text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                    isSelected
                      ? "shadow-e2 ring-2 ring-secondary-600/60 bg-secondary-50"
                      : "shadow-e1 hover:shadow-e2 active:scale-[0.99]"
                  } ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {/* Card Header: Primary Content + Status + Selection */}
                  <div className="flex flex-wrap items-start justify-between gap-2.5 pb-2.5 border-b border-primary/[0.06]">
                    {/* basis keeps the title readable: a long status pill wraps below instead of squeezing it */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1 basis-[13rem]">
                      {isSelectable && (
                        <div
                          className="pt-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isChecked}
                            onChange={() => {
                              if (selection) {
                                if (isChecked) {
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
                          <span className="block text-[11px] font-medium text-primary-500 truncate">
                            {col.header}
                          </span>
                          <div className="text-xs font-medium text-primary-800 truncate mt-0.5 tabular-nums">
                            {col.render ? col.render(row) : cellValue(row, col.key)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  {actionsCol && (
                    <div
                      className="pt-2 mt-2 border-t border-primary/[0.06] flex items-center justify-end"
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
        className={`w-full overflow-hidden rounded-2xl bg-white shadow-e1 ${
          tableOnly ? "block" : "hidden md:block"
        }`}
      >
        <div
          className={`w-full overflow-x-auto ${
            !isLoading && data.length > 12 ? "md:max-h-[calc(100dvh-196px)] md:overflow-y-auto" : ""
          }`}
        >
          <table className="w-full text-start border-separate border-spacing-0 text-xs">
            {caption && <caption className="sr-only">{caption}</caption>}
            {/* Sticky Header */}
            <thead className="select-none sticky top-0 z-10 [&_th]:bg-darnaBg-100/95 [&_th]:backdrop-blur-sm [&_th]:border-b [&_th]:border-primary/[0.08]">
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
                      ? "sticky start-0 z-20"
                      : "";

                  return (
                    <th
                      key={col.key}
                      className={`${paddingClass} font-semibold text-primary-600 text-xs whitespace-nowrap ${alignClass} ${stickyFirstCol} ${
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
                          className="group inline-flex items-center gap-1.5 font-semibold hover:text-primary-900 transition-colors duration-fast rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
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
            <tbody className="[&>tr:not(:last-child)>td]:border-b [&>tr:not(:last-child)>td]:border-primary/[0.06]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, rIdx) => (
                  <tr key={rIdx} aria-hidden="true">
                    {isSelectable && (
                      <td className="py-3 px-4 text-center">
                        <Skeleton className="w-[18px] h-[18px] rounded-[6px] mx-auto" />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td key={col.key} className={paddingClass}>
                        <Skeleton className={`h-3.5 rounded-md ${skeletonWidths[(rIdx + cIdx) % skeletonWidths.length]}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (isSelectable ? 1 : 0)}
                    className="text-center"
                  >
                    {emptyState || <EmptyState size="compact" title={emptyMessage || t("empty")} />}
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const id = keyExtractor(row);
                  const isChecked = effectiveSelectedIds.includes(id);
                  const isSelected = isChecked || selectedRowId === id;

                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick && onRowClick(row)}
                      onKeyDown={rowKeyHandler(row, onRowClick)}
                      tabIndex={onRowClick ? 0 : undefined}
                      className={`group/row transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 ${
                        onRowClick ? "cursor-pointer" : ""
                      } ${
                        isSelected
                          ? "bg-secondary-50 hover:bg-secondary-100/70 [&>td:first-child]:shadow-[inset_3px_0_0_#0E6FAD] rtl:[&>td:first-child]:shadow-[inset_-3px_0_0_#0E6FAD]"
                          : "hover:bg-darnaBg-100 active:bg-darnaBg-200"
                      }`}
                    >
                      {isSelectable && (
                        <td
                          className="py-3 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isChecked}
                            onChange={() => {
                              if (selection) {
                                if (isChecked) {
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
                            ? "sticky start-0 bg-white group-hover/row:bg-darnaBg-100 z-[1]"
                            : "";

                        return (
                          <td
                            key={col.key}
                            className={`${paddingClass} ${alignClass} text-primary-800 ${stickyFirstCol} ${
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
