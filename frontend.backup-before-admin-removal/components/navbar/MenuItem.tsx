"use client";

interface MenuItemProps {
  onClick: () => void;
  label: string;
  bold?: boolean;
  icon?: React.ReactNode;
}

export default function MenuItem({ onClick, label, bold, icon }: MenuItemProps) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 hover:bg-neutral-100 transition cursor-pointer text-sm flex items-center gap-3 ${
        bold ? "font-semibold text-primary" : "text-neutral-700"
      }`}
    >
      {icon && <span className="text-neutral-500 text-base">{icon}</span>}
      <span>{label}</span>
    </div>
  );
}
