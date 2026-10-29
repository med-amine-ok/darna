"use client";

interface MenuItemProps {
  onClick: () => void;
  label: string;
  bold?: boolean;
  icon?: React.ReactNode;
}

export default function MenuItem({ onClick, label, bold, icon }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full px-4 py-3 hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 transition cursor-pointer text-sm flex items-center gap-3 text-start ${
        bold ? "font-semibold text-primary" : "text-neutral-700"
      }`}
    >
      {icon && <span className="text-neutral-500 text-base" aria-hidden="true">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
