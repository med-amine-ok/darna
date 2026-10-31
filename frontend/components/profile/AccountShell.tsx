/**
 * Account area shell (trips, favorites, messages, settings, notifications, help…).
 *
 *   <AccountPage eyebrow="Your account" title="Trips" subtitle="…" actions={<Button…/>}>
 *     …content…
 *   </AccountPage>
 *
 * - Paper background, `max-w-6xl` content (or `width="wide" | "narrow"`), 16px gutters.
 * - Header: tracked eyebrow with a short olive rule, Fraunces title, muted lede. It enters
 *   with the CSS `enter-up` classes, so the server HTML is never hidden behind JS.
 * Server-component safe (no hooks).
 */

import React from "react";
import { cn } from "@/components/ui/cn";

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
} as const;

export interface AccountPageProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Controls aligned with the title on wide screens (buttons, counts). */
  actions?: React.ReactNode;
  width?: keyof typeof widths;
  /** id for the <h1> (aria-labelledby targets). */
  titleId?: string;
  className?: string;
  children: React.ReactNode;
}

export function AccountHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  titleId,
  className,
}: Omit<AccountPageProps, "children" | "width">) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="enter-up flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700 rtl:normal-case rtl:tracking-normal">
            <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
            {eyebrow}
          </p>
        )}
        <h1
          id={titleId}
          className="enter-up mt-3 font-serif text-display-md text-primary-900 [text-wrap:balance]"
          style={{ animationDelay: "60ms" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="enter-up mt-3 max-w-[60ch] text-body text-primary-600 [text-wrap:pretty]"
            style={{ animationDelay: "120ms" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="enter-up flex shrink-0 flex-wrap items-center gap-3" style={{ animationDelay: "160ms" }}>
          {actions}
        </div>
      )}
    </header>
  );
}

export function AccountPage({ width = "default", className, children, ...header }: AccountPageProps) {
  return (
    <div className={cn("min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-8 sm:pt-12", className)}>
      <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width])}>
        <AccountHeader {...header} />
        <div className="mt-8 sm:mt-10">{children}</div>
      </div>
    </div>
  );
}

export default AccountPage;
