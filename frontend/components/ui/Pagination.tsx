"use client";

/**
 * Pagination, numbered pages with previous/next.
 *
 *   <Pagination page={page} pageCount={12} onPageChange={setPage} />
 *   <Pagination page={page} pageCount={12} hrefFor={(p) => `/search?page=${p}`} />   // links (SEO)
 *
 * <nav aria-label="Pagination">; current page has aria-current="page" and an ink fill;
 * long ranges collapse with ellipses (1 … 4 5 6 … 12). Arrows mirror in RTL. On phones only
 * "Page x of y" + arrows are shown.
 */

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
} from "@/components/icons";
import { cn, focusRing } from "./cn";

function range(page: number, count: number): Array<number | "gap"> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: Array<number | "gap"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push("gap");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < count - 1) out.push("gap");
  out.push(count);
  return out;
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  hrefFor?: (page: number) => string;
  className?: string;
}

const cell =
  "inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3 text-sm font-semibold tabular-nums transition-[background-color,box-shadow,color] duration-fast ease-standard";

export function Pagination({
  page,
  pageCount,
  onPageChange,
  hrefFor,
  className,
}: PaginationProps) {
  const t = useTranslations("ui");
  if (pageCount <= 1) return null;

  const item = (
    p: number,
    content: React.ReactNode,
    opts: {
      label: string;
      current?: boolean;
      disabled?: boolean;
      className?: string;
    },
  ) => {
    const cls = cn(
      cell,
      opts.current
        ? "bg-primary-800 text-white shadow-e1"
        : "text-primary-700 hover:bg-white hover:shadow-e1 hover:text-primary-900",
      opts.disabled && "pointer-events-none opacity-35",
      focusRing,
      opts.className,
    );
    if (opts.disabled) {
      return (
        <span aria-disabled="true" aria-label={opts.label} className={cls}>
          {content}
        </span>
      );
    }
    if (hrefFor) {
      return (
        <Link
          href={hrefFor(p)}
          aria-label={opts.label}
          aria-current={opts.current ? "page" : undefined}
          className={cls}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        type="button"
        aria-label={opts.label}
        aria-current={opts.current ? "page" : undefined}
        onClick={() => onPageChange?.(p)}
        className={cn(cls, "cursor-pointer")}
      >
        {content}
      </button>
    );
  };

  return (
    <nav aria-label={t("pagination")} className={className}>
      <ul className="flex items-center justify-center gap-1">
        <li>
          {item(
            page - 1,
            <BrandChevronLeftIcon size={18} className="rtl:rotate-180" />,
            {
              label: t("previousPage"),
              disabled: page <= 1,
            },
          )}
        </li>
        {range(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="hidden px-1 text-primary-400 sm:block"
            >
              …
            </li>
          ) : (
            <li key={p} className="hidden sm:block">
              {item(p, p, {
                label: t("pageNumber", { page: p }),
                current: p === page,
              })}
            </li>
          ),
        )}
        <li
          className="px-3 text-meta font-semibold text-primary-700 tabular-nums sm:hidden"
          aria-live="polite"
        >
          {t("pageOf", { page, total: pageCount })}
        </li>
        <li>
          {item(
            page + 1,
            <BrandChevronRightIcon size={18} className="rtl:rotate-180" />,
            {
              label: t("nextPage"),
              disabled: page >= pageCount,
            },
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Pagination;
