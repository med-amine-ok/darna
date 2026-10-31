"use client";

/**
 * Shared building blocks for the Settings sections: serif section header, white cards
 * (kit Card, e1) with an optional title, divided rows, and switch rows (kit Switch).
 */

import React from "react";
import { Card } from "@/components/ui/Surface";
import { Switch } from "@/components/ui/Choice";
import { cn } from "@/components/ui/cn";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

/** Underlined text action (Edit, Add…), 44px tall hit area. */
export const LINK_BUTTON_CLASS = cn(
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-meta font-semibold text-primary-900",
  "underline decoration-primary/30 underline-offset-4 transition-colors duration-fast ease-standard hover:decoration-primary-900",
  FOCUS_RING,
);

/** Panel heading; the id labels the surrounding section. */
export function SectionHeader({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div>
      <h2 id={id} className="font-serif text-heading text-primary-900">
        {title}
      </h2>
      <p className="mt-1.5 max-w-[60ch] text-body text-primary-600">{description}</p>
    </div>
  );
}

/** White card that groups related settings. */
export function SettingsCard({
  title,
  titleId,
  description,
  action,
  children,
  className,
  padding = "md",
}: {
  title?: React.ReactNode;
  titleId?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  return (
    <Card padding={padding} className={className}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 id={titleId} className="text-title font-semibold text-primary-900">
                {title}
              </h3>
            )}
            {description && <p className="mt-1 text-meta text-primary-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

/** Hairline-divided list inside a card. */
export function SettingsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-primary/[0.08]", className)}>{children}</div>;
}

/** On/off setting with a visible label and description (kit Switch, spring thumb). */
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  return (
    <Switch
      label={label}
      description={description}
      checked={checked}
      onCheckedChange={onChange}
      className={cn("py-4 first:pt-0 last:pb-0", className)}
    />
  );
}
