"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const linkClass =
  "font-semibold text-neutral-500 hover:text-primary transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = "" }) => {
  const t = useTranslations("uiKit.breadcrumbs");
  return (
    <nav aria-label={t("label")} className={className}>
      <ol className="flex items-center gap-1.5 text-xs flex-wrap">
        <li className="flex items-center">
          {items.length === 0 ? (
            <span aria-current="page" className="font-serif font-black text-primary text-sm sm:text-base">
              {t("root")}
            </span>
          ) : (
            <Link href="/" className={linkClass}>
              {t("root")}
            </Link>
          )}
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-neutral-300 rtl:rotate-180 shrink-0" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="font-serif font-black text-primary text-sm sm:text-base"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
