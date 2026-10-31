"use client";

import { Link } from "@/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { BrandArrowRightIcon } from "@/components/icons";

interface SectionHeaderProps {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  /** Right-aligned controls (e.g. carousel arrows). */
  actions?: React.ReactNode;
  align?: "start" | "center";
}

/**
 * Editorial section header: tracked eyebrow, Fraunces title, muted lede and an
 * underlined "See all" link (Aman/Stripe pattern, docs/design/DESIGN-DIRECTION.md §8).
 */
export default function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel,
  actions,
  align = "start",
}: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <Reveal
      as="header"
      className={`flex gap-6 ${centered ? "flex-col items-center text-center" : "flex-col sm:flex-row sm:items-end sm:justify-between"}`}
    >
      <div className={`min-w-0 ${centered ? "max-w-2xl" : "max-w-3xl"}`}>
        {eyebrow && (
          <p className={`flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700 ${centered ? "justify-center" : ""}`}>
            <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="mt-3 font-serif text-display-md text-primary-900">
          {title}
        </h2>
        {subtitle && <p className="mt-3 text-body text-primary-500 max-w-[60ch]">{subtitle}</p>}
      </div>
      {(href || actions) && (
        <div className="flex items-center gap-4 shrink-0">
          {href && linkLabel && (
            <Link
              href={href}
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-4 focus-visible:ring-offset-darnaBg"
            >
              <span className="link-underline pb-0.5">{linkLabel}</span>
              <BrandArrowRightIcon
                size={16}
                className="rtl:rotate-180 transition-transform duration-fast ease-out group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
              />
            </Link>
          )}
          {actions}
        </div>
      )}
    </Reveal>
  );
}
