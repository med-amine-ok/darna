"use client";

/**
 * Breadcrumbs, wayfinding above page titles.
 *
 *   <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Oran", href: "/search?wilaya=31" }, { label: "Villa Santa Cruz" }]} />
 *
 * <nav aria-label="Breadcrumb"> + ordered list; the last item is the current page
 * (aria-current="page", not a link). Separators are chevrons mirrored in RTL.
 * On phones long trails collapse to "… / parent / current".
 */

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { BrandChevronRightIcon } from "@/components/icons";
import { cn } from "./cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const t = useTranslations("ui");
  return (
    <nav aria-label={t("breadcrumb")} className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-meta">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          // Hide middle crumbs on phones when the trail is long.
          const collapsible = items.length > 3 && i > 0 && i < items.length - 2;
          return (
            <li
              key={`${item.label}-${i}`}
              className={cn(
                "flex min-w-0 items-center gap-1.5",
                collapsible && "hidden sm:flex",
              )}
            >
              {i > 0 && (
                <BrandChevronRightIcon
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-primary-300 rtl:rotate-180"
                />
              )}
              {i === 1 && items.length > 3 && (
                <span aria-hidden="true" className="text-primary-400 sm:hidden">
                  …
                </span>
              )}
              {last || !item.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "truncate",
                    last
                      ? "font-semibold text-primary-900"
                      : "text-primary-500",
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate rounded text-primary-500 underline-offset-4 transition-colors duration-fast hover:text-primary-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
