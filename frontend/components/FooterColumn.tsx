import React from "react";
import { Link } from "@/navigation";

export interface FooterLink {
  label: string;
  /** Small trailing note (e.g. wilaya number). */
  meta?: string;
  /** Internal route (locale-prefixed automatically). */
  href: string | { pathname: string; query?: Record<string, string> };
}

interface FooterColumnProps {
  /** Omitted when the column sits inside an accordion that already shows it. */
  title?: string;
  links: FooterLink[];
  className?: string;
}

export default function FooterColumn({ title, links, className = "" }: FooterColumnProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-primary-900">{title}</h2>}
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="group inline-flex min-h-[36px] items-center gap-2 rounded text-body text-primary-600 transition-colors duration-fast ease-standard hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg"
            >
              <span className="underline-offset-4 group-hover:underline">{link.label}</span>
              {link.meta && <span className="text-meta tabular-nums text-primary-500">{link.meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
