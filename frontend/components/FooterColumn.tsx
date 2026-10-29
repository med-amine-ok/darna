import React from "react";
import { Link } from "@/navigation";

export interface FooterLink {
  label: string;
  /** Internal route (locale-prefixed automatically). */
  href: string | { pathname: string; query?: Record<string, string> };
}

interface FooterColumnProps {
  title: string;
  links: FooterLink[];
}

export default function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div className="flex flex-col space-y-3">
      <h2 className="font-bold text-primary text-sm tracking-wide">{title}</h2>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-neutral-600 hover:text-primary hover:underline transition block py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
