"use client";

import React, { useId } from "react";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export const INPUT_CLASS =
  "w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-sm text-primary placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

export const PRIMARY_BUTTON_CLASS = `px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold disabled:opacity-50 ${FOCUS_RING}`;

export const LINK_BUTTON_CLASS = `text-xs font-semibold text-secondary hover:underline rounded ${FOCUS_RING}`;

/** Panel heading; the id labels the surrounding section. */
export function SectionHeader({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div>
      <h2 id={id} className="text-xl font-bold text-primary font-serif">
        {title}
      </h2>
      <p className="text-xs text-neutral-600 mt-1">{description}</p>
    </div>
  );
}

/** Accessible on/off switch with a visible label and description. */
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const labelId = useId();
  const descId = useId();
  return (
    <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between gap-4">
      <div>
        <div id={labelId} className="text-xs font-bold text-primary">
          {label}
        </div>
        <div id={descId} className="text-xs text-neutral-600 mt-0.5">
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-primary" : "bg-neutral-300"
        } ${FOCUS_RING}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-0.5 rtl:-translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
