import React from "react";

/**
 * Reveal-on-scroll wrappers. They only add data attributes; the shared observer in
 * ScrollReveal.tsx + CSS in globals.css do the fade/rise. Nothing is hidden in the
 * server HTML (content stays visible without JS and doesn't delay LCP), and the
 * global reduced-motion rules make the transition instant.
 */

type Tag = "div" | "section" | "ul" | "li" | "header" | "article" | "aside" | "span";

interface RevealProps {
  as?: Tag;
  /** Delay in seconds before this element animates. */
  delay?: number;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function Reveal({ as: Comp = "div", delay = 0, className, children, id }: RevealProps) {
  return (
    <Comp id={id} className={className} data-reveal="" data-reveal-delay={delay ? Math.round(delay * 1000) : undefined}>
      {children}
    </Comp>
  );
}

/** Staggers its direct `RevealItem` children (each `each` seconds apart) when it scrolls into view. */
export function RevealGroup({
  as: Comp = "div",
  each = 0.06,
  delay = 0,
  className,
  children,
}: {
  as?: Tag;
  each?: number;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Comp
      className={className}
      data-reveal-stagger={Math.round(each * 1000)}
      data-reveal-delay={delay ? Math.round(delay * 1000) : undefined}
    >
      {children}
    </Comp>
  );
}

export function RevealItem({ as: Comp = "div", className, children }: { as?: Tag; className?: string; children: React.ReactNode }) {
  return (
    <Comp className={className} data-reveal-item="">
      {children}
    </Comp>
  );
}
