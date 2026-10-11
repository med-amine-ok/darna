"use client";

import React from "react";

interface FooterColumnProps {
  title: string;
  links: { label: string; href?: string; onClick?: () => void }[];
}

export default function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div className="flex flex-col space-y-3">
      <h4 className="font-bold text-primary text-sm tracking-wide">{title}</h4>
      <ul className="space-y-2.5 text-sm">
        {links.map((link, idx) => (
          <li key={idx}>
            <span
              onClick={link.onClick}
              className="text-neutral-600 hover:text-primary hover:underline cursor-pointer transition select-none"
            >
              {link.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
