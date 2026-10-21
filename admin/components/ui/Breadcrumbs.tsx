"use client";

import React from "react";
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

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = "" }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs ${className}`}>
      <Link href="/" className="font-semibold text-neutral-400 hover:text-primary transition">
        Admin
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300 rtl:rotate-180 shrink-0" />
            {item.href && !isLast ? (
              <Link href={item.href} className="font-semibold text-neutral-500 hover:text-primary transition">
                {item.label}
              </Link>
            ) : (
              <span className="font-serif font-black text-primary text-sm sm:text-base">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
