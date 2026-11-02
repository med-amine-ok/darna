import React from "react";

/**
 * In-palette line illustration built from the BLADUS arch + eight-point rosette
 * (docs/design/DESIGN-DIRECTION.md §6). Decorative only.
 */
export function ArchRosette({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden="true" focusable="false">
      <path
        d="M22 86V44c0-12 8-21 17-25 4.5-2 7-3.4 9-5 2 1.6 4.5 3 9 5 9 4 17 13 17 25v42"
        stroke="#2E3A2F"
        strokeOpacity="0.55"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 86h68" stroke="#2E3A2F" strokeOpacity="0.35" strokeWidth="1.75" strokeLinecap="round" />
      <g transform="translate(48 52)" stroke="#C96F4F" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M0-15l4.4 10.6L15 0 4.4 4.4 0 15-4.4 4.4-15 0-4.4-4.4z" />
        <rect x="-8.5" y="-8.5" width="17" height="17" transform="rotate(45)" strokeOpacity="0.55" />
        <circle r="2.6" fill="#C96F4F" fillOpacity="0.18" />
      </g>
      <path d="M30 86V70M66 86V70" stroke="#6B7F5B" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** compact = inside tables/panels; default = page section. */
  size?: "compact" | "default";
  className?: string;
}

/** Kit empty state: arch/rosette illustration, short title, one hint, optional action. */
export function EmptyState({ title, description, action, size = "default", className = "" }: EmptyStateProps) {
  const compact = size === "compact";
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6 px-4 gap-2" : "py-12 px-6 gap-3"} ${className}`}>
      <div className={`relative grid place-items-center rounded-full bg-darnaBg-300/70 ${compact ? "w-16 h-16" : "w-20 h-20"}`}>
        <ArchRosette className={compact ? "w-11 h-11" : "w-14 h-14"} />
      </div>
      <div className="max-w-sm">
        <p className={`font-semibold text-primary-900 ${compact ? "text-meta" : "text-body"}`}>{title}</p>
        {description && <p className="text-meta text-primary-600 mt-1">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
